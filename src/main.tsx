import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AppShell } from "./AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/global.css";

const label = "__TAURI_INTERNALS__" in window ? getCurrentWebviewWindow().label : "main";
// Lets CSS target one window: the workspace breakpoints must not reshape the
// (always narrower) settings window.
document.body.dataset.window = label;
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ErrorBoundary><AppShell windowLabel={label} /></ErrorBoundary></React.StrictMode>
);
