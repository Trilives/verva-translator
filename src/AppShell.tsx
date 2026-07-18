import { FluentProvider, teamsDarkTheme, webLightTheme } from "@fluentui/react-components";
import { I18nProvider } from "./i18n/I18nContext";
import { useAppSettings } from "./hooks/useAppSettings";
import { MainPage } from "./pages/MainPage";
import { SettingsPage } from "./pages/SettingsPage";

export function AppShell({ windowLabel }: { windowLabel: string }) {
  const state = useAppSettings();
  if (state.loading || !state.settings) return <div className="splash"><span className="brand-mark">V</span></div>;
  const dark = state.settings.theme === "dark" || (state.settings.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  return (
    <FluentProvider theme={dark ? teamsDarkTheme : webLightTheme} className="provider-root">
      <I18nProvider locale={state.settings.locale}>
        {windowLabel === "settings"
          ? <SettingsPage settings={state.settings} update={state.update} />
          : <MainPage settings={state.settings} update={state.update} />}
      </I18nProvider>
    </FluentProvider>
  );
}
