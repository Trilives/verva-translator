import { Button, Tooltip } from "@fluentui/react-components";
import {
  Dismiss16Regular,
  Maximize16Regular,
  Subtract16Regular,
} from "@fluentui/react-icons";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useI18n } from "../i18n/I18nContext";
import { isTauri } from "../services/runtime";

function runWindowAction(action: (window: ReturnType<typeof getCurrentWindow>) => Promise<void>) {
  if (!isTauri()) return;
  action(getCurrentWindow()).catch(() => undefined);
}

export function WindowTitleBar() {
  const { t } = useI18n();

  return <header className="window-titlebar" data-tauri-drag-region onDoubleClick={() => runWindowAction((window) => window.toggleMaximize())}>
    <div className="window-identity" data-tauri-drag-region>
      <span className="titlebar-mark">V</span>
      <span data-tauri-drag-region>{t("appName")}</span>
    </div>
    <div className="window-controls">
      <Tooltip content={t("minimize")} relationship="label">
        <Button appearance="subtle" icon={<Subtract16Regular />} aria-label={t("minimize")} onClick={() => runWindowAction((window) => window.minimize())} />
      </Tooltip>
      <Tooltip content={t("maximize")} relationship="label">
        <Button appearance="subtle" icon={<Maximize16Regular />} aria-label={t("maximize")} onClick={() => runWindowAction((window) => window.toggleMaximize())} />
      </Tooltip>
      <Tooltip content={t("close")} relationship="label">
        <Button className="window-close" appearance="subtle" icon={<Dismiss16Regular />} aria-label={t("close")} onClick={() => runWindowAction((window) => window.close())} />
      </Tooltip>
    </div>
  </header>;
}
