import { Button, Dropdown, Option, ProgressBar, Tooltip } from "@fluentui/react-components";
import { ArrowClockwise20Regular } from "@fluentui/react-icons";
import type { ProviderProfile, SessionInfo } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";

export function MainHeader({ profiles, activeId, session, onProfile, onRefresh }: { profiles: ProviderProfile[]; activeId: string; session?: SessionInfo; onProfile: (id: string) => void; onRefresh: () => void }) {
  const { t } = useI18n(); const active = profiles.find((p) => p.id === activeId);
  const ratio = session ? session.usedTokens / session.limit : 0;
  return <header className="main-header"><div><h1>{t("appName")}</h1><p>{t("aiRequired")}</p></div><div className="header-tools">
    <Dropdown aria-label={t("profile")} value={active?.name ?? ""} selectedOptions={[activeId]} onOptionSelect={(_, d) => onProfile(String(d.optionValue))}>
      {profiles.map((profile) => <Option key={profile.id} value={profile.id}>{profile.name}</Option>)}
    </Dropdown>
    {session && <div className="session-chip"><div><span>{t("sessionStarted")}</span><time>{new Date(session.startedAt).toLocaleTimeString()}</time></div><ProgressBar thickness="medium" value={Math.min(ratio, 1)} /><Tooltip content={t("refreshSession")} relationship="label"><Button appearance="subtle" icon={<ArrowClockwise20Regular />} onClick={onRefresh} /></Tooltip></div>}
  </div></header>;
}
