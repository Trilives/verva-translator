import { Button, Tooltip } from "@fluentui/react-components";
import { History24Regular, Settings24Regular } from "@fluentui/react-icons";
import { useI18n } from "../i18n/I18nContext";

export function Sidebar({ onHistory, onSettings }: { onHistory: () => void; onSettings: () => void }) {
  const { t } = useI18n();
  return <aside className="sidebar">
    <div className="brand-mark" aria-label="Verva">V</div>
    <div className="sidebar-actions">
      <Tooltip content={t("history")} relationship="label"><Button appearance="subtle" icon={<History24Regular />} onClick={onHistory} /></Tooltip>
      <Tooltip content={t("settings")} relationship="label"><Button appearance="subtle" icon={<Settings24Regular />} onClick={onSettings} /></Tooltip>
    </div>
  </aside>;
}
