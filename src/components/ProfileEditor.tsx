import {
  Button, Combobox, Field, Input, Option, Select, Spinner, Switch, Tooltip
} from "@fluentui/react-components";
import {
  ArrowSync20Regular, CheckmarkCircle20Filled, Delete20Regular,
  DismissCircle20Filled, PlugConnected20Regular
} from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import type { ProviderProfile } from "../domain/types";
import { isAllowedProviderUrl, isLanBaseUrl } from "../domain/providerUrl";
import { listModels, testProfile, type ConnectionReport } from "../services/backend";
import { useI18n } from "../i18n/I18nContext";

interface Props {
  profile: ProviderProfile;
  canDelete: boolean;
  apiKeyDraft: string;
  onApiKeyDraft: (value: string) => void;
  onSaveKey: () => Promise<void>;
  onChange: (changes: Partial<ProviderProfile>) => void;
  onDelete: () => void;
}

export function ProfileEditor(props: Props) {
  const { profile } = props;
  const { t } = useI18n();
  const [testing, setTesting] = useState(false);
  const [report, setReport] = useState<ConnectionReport>();
  const [models, setModels] = useState<string[]>([]);
  const [modelStatus, setModelStatus] = useState("");
  const [loadingModels, setLoadingModels] = useState(false);
  const urlBroken = !isAllowedProviderUrl(profile.baseUrl);

  useEffect(() => {
    setModels([]);
    setModelStatus("");
    setReport(undefined);
  }, [profile.id, profile.kind, profile.baseUrl]);

  const refreshModels = async () => {
    if (urlBroken) return;
    setLoadingModels(true); setModelStatus("");
    try {
      if (props.apiKeyDraft.trim()) await props.onSaveKey();
      const found = await listModels(profile);
      setModels(found);
      setModelStatus(found.length ? t("modelsFound").replace("{count}", String(found.length)) : t("noModelsFound"));
    } catch (error) {
      setModelStatus(`${t("modelRefreshFailed")}: ${String(error)}`);
    } finally { setLoadingModels(false); }
  };

  const test = async () => {
    setTesting(true); setReport(undefined);
    try {
      if (props.apiKeyDraft.trim()) await props.onSaveKey();
      setReport(await testProfile(profile));
    } catch (error) {
      setReport({ ok: false, message: String(error) });
    } finally { setTesting(false); }
  };

  return <div className="profile-editor">
    <div className="form-grid">
      <Field label={t("profile")}>
        <Input value={profile.name} onChange={(_, d) => props.onChange({ name: d.value })} />
      </Field>
      <Field label={t("provider")}>
        <Select value={profile.kind} onChange={(_, d) => props.onChange({ kind: d.value as ProviderProfile["kind"] })}>
          <option value="openai">{t("openAi")}</option>
          <option value="claude">{t("claude")}</option>
        </Select>
      </Field>
      <Field label={t("baseUrl")} validationMessage={urlBroken ? t("invalidUrl") : undefined}
        validationState={urlBroken ? "error" : "none"}>
        <Input value={profile.baseUrl} onChange={(_, d) => props.onChange({ baseUrl: d.value })} />
      </Field>
      <Field label={t("model")} hint={modelStatus || t("modelHint")}>
        <div className="model-row">
          <Combobox freeform value={profile.model} selectedOptions={models.includes(profile.model) ? [profile.model] : []}
            onChange={(event) => props.onChange({ model: event.target.value })}
            onOptionSelect={(_, data) => props.onChange({ model: data.optionText ?? "" })}>
            {models.map((model) => <Option key={model} value={model}>{model}</Option>)}
          </Combobox>
          <Tooltip content={t("refreshModels")} relationship="label">
            <Button aria-label={t("refreshModels")} icon={loadingModels ? <Spinner size="tiny" /> : <ArrowSync20Regular />}
              disabled={loadingModels || urlBroken} onClick={refreshModels} />
          </Tooltip>
        </div>
      </Field>
      <Field label={t("apiKey")} hint={profile.hasApiKey ? t("apiKeySaved")
        : t(isLanBaseUrl(profile.baseUrl) ? "apiKeyOptional" : "apiKeyMissing")}>
        <Input type="password" value={props.apiKeyDraft} placeholder={t("apiKeyPlaceholder")}
          onChange={(_, d) => props.onApiKeyDraft(d.value)} onBlur={() => void props.onSaveKey()} />
      </Field>
      <Field label={t("contextLimit")}>
        <Input type="number" min={1024} value={String(profile.contextLimit)}
          onChange={(_, d) => props.onChange({ contextLimit: Math.max(1024, Number(d.value) || 1024) })} />
      </Field>
    </div>

    <div className="switch-list">
      <Switch checked={profile.thinking} label={t("thinking")} onChange={(_, d) => props.onChange({ thinking: d.checked })} />
      <div>
        <Switch checked={profile.longConversation} label={t("longConversation")}
          onChange={(_, d) => props.onChange({ longConversation: d.checked })} />
        <p>{t("longConversationHint")}</p>
      </div>
    </div>

    <div className="connection-test">
      <Button className="press" appearance="outline" icon={testing ? <Spinner size="tiny" /> : <PlugConnected20Regular />}
        disabled={testing || urlBroken} onClick={test}>{testing ? t("testing") : t("testConnection")}</Button>
      {report && <span className={`connection-result ${report.ok ? "ok" : "failed"}`}>
        {report.ok ? <CheckmarkCircle20Filled /> : <DismissCircle20Filled />}
        {report.ok ? `${t("connectionOk")} (${report.latencyMs} ms)` : report.message}
      </span>}
    </div>

    <div className="profile-footer">
      <Button className="press" appearance="subtle" icon={<Delete20Regular />}
        disabled={!props.canDelete} onClick={props.onDelete}>{t("deleteProfile")}</Button>
      <span className="settings-status">{t("savedAutomatically")}</span>
    </div>
  </div>;
}
