import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./AppShell";
import "./styles/global.css";
import "./styles/notes.css";
import "./styles/sticky.css";
import "./styles/browser-monitor.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><AppShell /></React.StrictMode>
);
