import React from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "./AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
// Cascade order is the import order. `base` sets the reset, the Fluent portal
// guard and the shell; `responsive` must stay last so its media queries win
// against the equal-specificity rules above them.
//
// These are separate imports rather than `@import` inside one sheet: Vite's dev
// server does not inline CSS `@import`, so a manifest sheet serves empty and
// the whole app renders unstyled under `npm run dev`.
import "./styles/base.css";
import "./styles/workspace.css";
import "./styles/dialogs.css";
import "./styles/settings.css";
import "./styles/history.css";
import "./styles/responsive.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ErrorBoundary><AppShell /></ErrorBoundary></React.StrictMode>
);
