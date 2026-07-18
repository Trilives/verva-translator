import React from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "./AppShell";
import { ErrorBoundary } from "./components/ErrorBoundary";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ErrorBoundary><AppShell /></ErrorBoundary></React.StrictMode>
);
