import { Button, Tooltip } from "@fluentui/react-components";
import { History24Regular, Settings24Regular, Translate24Regular } from "@fluentui/react-icons";
import { useI18n } from "../i18n/I18nContext";

export function Sidebar({ onHistory, onSettings }: { onHistory: () => void; onSettings: () => void }) {
  const { t } = useI18n();
  return <aside className="sidebar">
    <div className="sidebar-primary">
      <Button className="nav-button active" appearance="subtle" icon={<Translate24Regular />} aria-current="page">{t("workspace")}</Button>
      <Tooltip content={t("history")} relationship="label"><Button className="nav-button" appearance="subtle" icon={<History24Regular />} onClick={onHistory}>{t("history")}</Button></Tooltip>
    </div>
    <div className="sidebar-actions">
      <Tooltip content={t("settings")} relationship="label"><Button className="nav-button" appearance="subtle" icon={<Settings24Regular />} onClick={onSettings}>{t("settings")}</Button></Tooltip>
    </div>
  </aside>;
}
