const key = "littleye.local-store";
type Store = Record<string, unknown>;
function read(): Store { try { return JSON.parse(localStorage.getItem(key) ?? "{}"); } catch { return {}; } }
function write(value: Store) { localStorage.setItem(key, JSON.stringify(value)); }
export const localStore = { get<T>(name: string): T | undefined { return read()[name] as T | undefined; }, set(name: string, value: unknown) { const data = read(); data[name] = value; write(data); } };
