import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { AppShell } from "./AppShell";
import "./styles/global.css";

const label = "__TAURI_INTERNALS__" in window ? getCurrentWebviewWindow().label : "main";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><AppShell windowLabel={label} /></React.StrictMode>
);
