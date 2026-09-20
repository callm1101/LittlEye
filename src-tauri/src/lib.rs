use serde::{Deserialize, Serialize};
use std::{
  io::Read,
  sync::Mutex,
  time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
  menu::{Menu, MenuItem},
  tray::TrayIconBuilder,
  AppHandle, Emitter, Manager, WebviewWindow, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;
use tiny_http::{Header, Method, Request, Response, Server, StatusCode};

#[derive(Clone, Default)]
struct BrowserMonitorConfig {
  token: Option<String>,
  domains: Vec<String>,
}

#[derive(Default)]
struct BrowserMonitorState {
  config: BrowserMonitorConfig,
  last_connected_at: Option<u64>,
  pending_events: Vec<BrowserActivityEvent>,
}

#[derive(Default)]
struct BrowserMonitorAuth(Mutex<BrowserMonitorState>);

#[derive(Clone, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct BrowserActivityEvent {
  active: bool,
  at: u64,
  domain: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BrowserMonitorSnapshot {
  connected: bool,
  events: Vec<BrowserActivityEvent>,
}

#[tauri::command]
fn set_always_on_top(window: WebviewWindow, enabled: bool) -> Result<(), String> {
  window
    .set_always_on_top(enabled)
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn start_window_dragging(window: WebviewWindow) -> Result<(), String> {
  window.start_dragging().map_err(|error| error.to_string())
}

#[tauri::command]
fn set_browser_monitor_config(
  state: tauri::State<BrowserMonitorAuth>,
  token: Option<String>,
  domains: Vec<String>,
) -> Result<(), String> {
  if token
    .as_ref()
    .is_some_and(|value| value.len() < 24 || value.len() > 128)
  {
    return Err("invalid browser monitor token".into());
  }
  if domains.is_empty() || domains.len() > 32 || domains.iter().any(|value| !is_valid_domain(value))
  {
    return Err("invalid browser monitor domains".into());
  }
  let mut monitor_state = state
    .0
    .lock()
    .map_err(|_| "browser monitor state unavailable")?;
  monitor_state.config = BrowserMonitorConfig { token, domains };
  monitor_state.last_connected_at = None;
  monitor_state.pending_events.clear();
  Ok(())
}

#[tauri::command]
fn poll_browser_monitor(
  state: tauri::State<BrowserMonitorAuth>,
) -> Result<BrowserMonitorSnapshot, String> {
  let now = current_time_millis();
  let mut monitor_state = state
    .0
    .lock()
    .map_err(|_| "browser monitor state unavailable")?;
  let connected = monitor_state
    .last_connected_at
    .is_some_and(|at| now.saturating_sub(at) <= 75_000);
  Ok(BrowserMonitorSnapshot {
    connected,
    events: std::mem::take(&mut monitor_state.pending_events),
  })
}

fn current_time_millis() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|value| value.as_millis() as u64)
    .unwrap_or_default()
}

fn is_valid_domain(value: &str) -> bool {
  if value.is_empty() || value.len() > 253 || value.starts_with('.') || value.ends_with('.') {
    return false;
  }
  value.split('.').all(|label| {
    !label.is_empty()
      && label.len() <= 63
      && !label.starts_with('-')
      && !label.ends_with('-')
      && label
        .bytes()
        .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
  })
}

fn header(request: &Request, name: &str) -> Option<String> {
  request
    .headers()
    .iter()
    .find(|value| value.field.to_string().eq_ignore_ascii_case(name))
    .map(|value| value.value.as_str().to_owned())
}

fn is_valid_extension_origin(value: &str) -> bool {
  let extension_id = value
    .strip_prefix("chrome-extension://")
    .or_else(|| value.strip_prefix("extension://"));
  extension_id
    .is_some_and(|id| id.len() == 32 && id.bytes().all(|byte| (b'a'..=b'p').contains(&byte)))
}

fn extension_source_valid(request: &Request) -> bool {
  let Some(declared_origin) = header(request, "X-LittleEye-Extension-Origin") else {
    return false;
  };
  if !is_valid_extension_origin(&declared_origin) {
    return false;
  }
  header(request, "Origin").is_none_or(|origin| origin == "null" || origin == declared_origin)
}

fn respond(request: Request, status: u16, body: &str) {
  let mut response = Response::from_string(body).with_status_code(StatusCode(status));
  for (name, value) in [
    ("Access-Control-Allow-Origin", "*"),
    ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
    (
      "Access-Control-Allow-Headers",
      "Content-Type, X-LittleEye-Token, X-LittleEye-Extension-Origin",
    ),
    ("Content-Type", "application/json"),
  ] {
    response.add_header(Header::from_bytes(name, value).expect("valid HTTP header"));
  }
  let _ = request.respond(response);
}

fn run_browser_monitor_server(app: AppHandle) {
  let Ok(server) = Server::http("127.0.0.1:47831") else {
    let _ = app.emit("browser-monitor-server", false);
    return;
  };
  let _ = app.emit("browser-monitor-server", true);
  for mut request in server.incoming_requests() {
    if request.method() == &Method::Options {
      respond(request, 204, "");
      continue;
    }
    let origin_valid = extension_source_valid(&request);
    let supplied_token = header(&request, "X-LittleEye-Token");
    let monitor_auth = app.state::<BrowserMonitorAuth>();
    let Ok(monitor_guard) = monitor_auth.0.lock() else {
      respond(request, 503, "{\"ok\":false}");
      continue;
    };
    let config = monitor_guard.config.clone();
    drop(monitor_guard);
    let token_valid = config
      .token
      .as_ref()
      .is_some_and(|expected| supplied_token.as_deref() == Some(expected.as_str()));
    if !origin_valid || !token_valid {
      respond(request, 401, "{\"ok\":false}");
      continue;
    }
    if request.method() == &Method::Get && request.url() == "/config" {
      if let Ok(mut monitor_state) = monitor_auth.0.lock() {
        monitor_state.last_connected_at = Some(current_time_millis());
      }
      let body = serde_json::json!({ "domains": config.domains }).to_string();
      respond(request, 200, &body);
      continue;
    }
    if request.method() != &Method::Post || request.url() != "/activity" {
      respond(request, 404, "{\"ok\":false}");
      continue;
    }
    let mut body = String::new();
    if request
      .as_reader()
      .take(2048)
      .read_to_string(&mut body)
      .is_err()
    {
      respond(request, 400, "{\"ok\":false}");
      continue;
    }
    let Ok(event) = serde_json::from_str::<BrowserActivityEvent>(&body) else {
      respond(request, 400, "{\"ok\":false}");
      continue;
    };
    if !config.domains.iter().any(|domain| domain == &event.domain) {
      respond(request, 401, "{\"ok\":false}");
      continue;
    }
    let now = current_time_millis();
    if now.abs_diff(event.at) > 5 * 60 * 1000 {
      respond(request, 400, "{\"ok\":false}");
      continue;
    }
    if let Ok(mut monitor_state) = monitor_auth.0.lock() {
      monitor_state.last_connected_at = Some(now);
      if monitor_state.pending_events.len() >= 128 {
        monitor_state.pending_events.remove(0);
      }
      monitor_state.pending_events.push(event.clone());
    }
    let _ = app.emit("browser-activity", event);
    respond(request, 200, "{\"ok\":true}");
  }
}

#[tauri::command]
fn show_reminder(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(window) = app.get_webview_window("main") {
    window.show().map_err(|error| error.to_string())?;
  }
  Ok(())
}

#[tauri::command]
fn show_system_notification(app: AppHandle) -> Result<(), String> {
  app
    .notification()
    .builder()
    .title("活动一下，喝点水")
    .body("该起来活动并喝口水啦。")
    .show()
    .map_err(|error| error.to_string())
}

pub fn run() {
  tauri::Builder::default()
    .manage(BrowserMonitorAuth::default())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      set_always_on_top,
      start_window_dragging,
      set_browser_monitor_config,
      poll_browser_monitor,
      show_reminder,
      show_system_notification
    ])
    .setup(|app| {
      let browser_monitor_app = app.handle().clone();
      std::thread::spawn(move || run_browser_monitor_server(browser_monitor_app));
      if let Some(window) = app.get_webview_window("main") {
        if let Some(icon) = app.default_window_icon() {
          window.set_icon(icon.clone())?;
        }
        window.set_always_on_top(true)?;
        let close_window = window.clone();
        window.on_window_event(move |event| {
          if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = close_window.hide();
          }
        });
      }
      let toggle = MenuItem::with_id(app, "toggle", "显示/隐藏组件", true, None::<&str>)?;
      let remind = MenuItem::with_id(app, "remind", "立即提醒", true, None::<&str>)?;
      let settings = MenuItem::with_id(app, "settings", "打开设置", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&toggle, &remind, &settings, &quit])?;
      let mut tray_builder = TrayIconBuilder::with_id("main-tray").menu(&menu);
      if let Some(icon) = app.default_window_icon() {
        tray_builder = tray_builder.icon(icon.clone());
      }
      tray_builder
        .on_menu_event(|app, event| match event.id().as_ref() {
          "toggle" => {
            if let Some(window) = app.get_webview_window("main") {
              if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
              } else {
                let _ = window.show();
                let _ = window.set_focus();
              }
            }
          }
          "remind" => {
            let _ = app.emit("trigger-reminder", ());
          }
          "settings" => {
            let _ = app.emit("open-settings", ());
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "quit" => app.exit(0),
          _ => {}
        })
        .build(app)?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running LittleEye");
}

#[cfg(test)]
mod tests {
  use super::{is_valid_domain, is_valid_extension_origin};

  #[test]
  fn accepts_normalized_domains() {
    assert!(is_valid_domain("bilibili.com"));
    assert!(is_valid_domain("docs.example.co.uk"));
  }

  #[test]
  fn rejects_urls_wildcards_and_invalid_labels() {
    assert!(!is_valid_domain("https://example.com"));
    assert!(!is_valid_domain("*.example.com"));
    assert!(!is_valid_domain("-bad.example"));
  }

  #[test]
  fn accepts_chromium_extension_origins() {
    assert!(is_valid_extension_origin(
      "chrome-extension://makknibnidlehkkhfiicojdlgojmcepo"
    ));
    assert!(is_valid_extension_origin(
      "extension://makknibnidlehkkhfiicojdlgojmcepo"
    ));
  }

  #[test]
  fn rejects_non_extension_or_malformed_origins() {
    assert!(!is_valid_extension_origin("https://example.com"));
    assert!(!is_valid_extension_origin("chrome-extension://too-short"));
    assert!(!is_valid_extension_origin(
      "chrome-extension://makknibnidlehkkhfiicojdlgojmcepo/options.html"
    ));
  }
}
