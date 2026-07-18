import { FluentProvider, teamsDarkTheme, webLightTheme } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { I18nProvider } from "./i18n/I18nContext";
import { useAppSettings } from "./hooks/useAppSettings";
import { useUiState } from "./hooks/useUiState";
import { MainPage } from "./pages/MainPage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import type { HistoryEntry } from "./domain/types";

export function AppShell() {
  const state = useAppSettings();
  const ui = useUiState();
  const [restored, setRestored] = useState<HistoryEntry>();

  const theme = state.settings?.theme ?? "system";
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light"; }, [dark]);

  if (state.loading || !state.settings || !ui.ready) {
    return <div className="splash"><span className="brand-mark">V</span></div>;
  }

  const restore = (entry: HistoryEntry) => { setRestored(entry); ui.patch({ page: "workspace" }); };

  return (
    <FluentProvider theme={dark ? teamsDarkTheme : webLightTheme} className="provider-root">
      <I18nProvider locale={state.settings.locale}>
        <div className="app-shell">
          <Sidebar page={ui.state.page} onPage={(page) => ui.patch({ page })} />
          <main className="app-content">
            {ui.state.page === "workspace" && <MainPage settings={state.settings} update={state.update}
              ui={ui.state} patchUi={ui.patch} restored={restored} onRestored={() => setRestored(undefined)} />}
            {ui.state.page === "history" && <HistoryPage onRestore={restore} />}
            {ui.state.page === "settings" && <SettingsPage settings={state.settings} update={state.update}
              section={ui.state.settingsSection} onSection={(settingsSection) => ui.patch({ settingsSection })} />}
          </main>
        </div>
      </I18nProvider>
    </FluentProvider>
  );
}
