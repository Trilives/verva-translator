import { Button, Dropdown, Option, ProgressBar, Tooltip } from "@fluentui/react-components";
import { ArrowClockwise20Regular } from "@fluentui/react-icons";
import type { ProviderProfile, SessionInfo, ThinkingLevel } from "../domain/types";
import { thinkingLevels } from "../domain/catalogs";
import { thinkingLevelKeys } from "../i18n/messages";
import { useModelOptions } from "../hooks/useModelOptions";
import { useI18n } from "../i18n/I18nContext";

interface Props {
  profiles: ProviderProfile[];
  activeId: string;
  session?: SessionInfo;
  onProfile: (id: string) => void;
  onModel: (model: string) => void;
  onThinking: (level: ThinkingLevel) => void;
  onRefresh: () => void;
}

export function MainHeader({ profiles, activeId, session, onProfile, onModel, onThinking, onRefresh }: Props) {
  const { t } = useI18n();
  const active = profiles.find((p) => p.id === activeId);
  const level = active?.thinking ?? "off";
  const ratio = session ? session.usedTokens / session.limit : 0;

  const { cache, loadingId, load } = useModelOptions();
  const discovered = active ? cache[active.id] ?? [] : [];
  // The active model is always offered so the control shows a value even before
  // discovery runs or when the endpoint returns nothing.
  const modelOptions = active ? [...new Set([active.model, ...discovered].filter(Boolean))] : [];
  const loadingModels = !!active && active.id === loadingId;

  return <header className="main-header">
    <div><h1>{t("translateWorkspace")}</h1><p>{t("aiRequired")}</p></div>
    <div className="header-tools">
      <div className="header-switchers">
        <Tooltip content={t("profile")} relationship="label">
          <Dropdown className="header-dropdown" aria-label={t("profile")} value={active?.name ?? ""}
            selectedOptions={[activeId]} onOptionSelect={(_, d) => onProfile(String(d.optionValue))}>
            {profiles.map((profile) => <Option key={profile.id} value={profile.id}>{profile.name}</Option>)}
          </Dropdown>
        </Tooltip>
        <Tooltip content={t("model")} relationship="label">
          <Dropdown className="header-dropdown" aria-label={t("model")} value={active?.model ?? ""}
            placeholder={t("model")} selectedOptions={active ? [active.model] : []}
            onOpenChange={(_, d) => { if (d.open && active) load(active); }}
            onOptionSelect={(_, d) => d.optionValue && onModel(String(d.optionValue))}>
            {modelOptions.map((model) => <Option key={model} value={model}>{model}</Option>)}
            {loadingModels && <Option value="__loading" disabled>{t("loadingModels")}</Option>}
          </Dropdown>
        </Tooltip>
        <Tooltip content={t("thinkingLevel")} relationship="label">
          <Dropdown className="header-dropdown thinking" aria-label={t("thinkingLevel")} value={t(thinkingLevelKeys[level])}
            selectedOptions={[level]} onOptionSelect={(_, d) => onThinking(d.optionValue as ThinkingLevel)}>
            {thinkingLevels.map((option) => <Option key={option} value={option}>{t(thinkingLevelKeys[option])}</Option>)}
          </Dropdown>
        </Tooltip>
      </div>
      {session && <div className="session-chip"><div><span>{t("sessionStarted")}</span><time>{new Date(session.startedAt).toLocaleTimeString()}</time></div><ProgressBar thickness="medium" value={Math.min(ratio, 1)} /><Tooltip content={t("refreshSession")} relationship="label"><Button appearance="subtle" icon={<ArrowClockwise20Regular />} onClick={onRefresh} /></Tooltip></div>}
    </div>
  </header>;
}
