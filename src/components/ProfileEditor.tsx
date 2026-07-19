import { Button, Field, Input, Select, Spinner, Switch } from "@fluentui/react-components";
import {
  Checkmark20Filled, CheckmarkCircle20Filled, Delete20Regular,
  DismissCircle20Filled, PlugConnected20Regular, Save20Regular
} from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import type { ProviderProfile } from "../domain/types";
import { saveApiKey, testProfile, type ConnectionReport } from "../services/backend";
import { useI18n } from "../i18n/I18nContext";
import { useActionFeedback } from "../hooks/useActionFeedback";

interface Props {
  profile: ProviderProfile;
  canDelete: boolean;
  onSave: (profile: ProviderProfile) => Promise<void> | void;
  onDelete: () => void;
}

const isValidUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname));
  } catch { return false; }
};

/** Full editor for one configuration. Everything commits through a single Save. */
export function ProfileEditor({ profile, canDelete, onSave, onDelete }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(profile);
  const [key, setKey] = useState("");
  const [testing, setTesting] = useState(false);
  const [report, setReport] = useState<ConnectionReport>();
  const saved = useActionFeedback();
  useEffect(() => { setDraft(profile); setKey(""); setReport(undefined); }, [profile]);

  const patch = <K extends keyof ProviderProfile>(field: K, value: ProviderProfile[K]) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const urlBroken = !isValidUrl(draft.baseUrl);
  const dirty = key.trim().length > 0
    || (Object.keys(draft) as (keyof ProviderProfile)[]).some((field) => draft[field] !== profile[field]);

  const save = async () => {
    if (urlBroken) return;
    let next = draft;
    if (key.trim()) {
      await saveApiKey(profile.id, key.trim());
      setKey("");
      next = { ...next, hasApiKey: true };
    }
    saved.trigger();
    await onSave(next);
  };

  // Tests the saved key against the draft endpoint, so an unsaved base URL or
  // model can be checked before committing it.
  const test = async () => {
    setTesting(true);
    setReport(undefined);
    try {
      if (key.trim()) await saveApiKey(profile.id, key.trim());
      setReport(await testProfile(draft));
    } catch (error) {
      setReport({ ok: false, message: String(error) });
    } finally {
      setTesting(false);
    }
  };

  return <div className="profile-editor">
    <div className="form-grid">
      <Field label={t("profile")}>
        <Input value={draft.name} onChange={(_, d) => patch("name", d.value)} />
      </Field>
      <Field label={t("provider")}>
        <Select value={draft.kind} onChange={(_, d) => patch("kind", d.value as ProviderProfile["kind"])}>
          <option value="openai">{t("openAi")}</option>
          <option value="claude">{t("claude")}</option>
        </Select>
      </Field>
      <Field label={t("baseUrl")} validationMessage={urlBroken ? t("invalidUrl") : undefined}
        validationState={urlBroken ? "error" : "none"}>
        <Input value={draft.baseUrl} onChange={(_, d) => patch("baseUrl", d.value)} />
      </Field>
      <Field label={t("model")}>
        <Input value={draft.model} onChange={(_, d) => patch("model", d.value)} />
      </Field>
      <Field label={t("apiKey")} hint={profile.hasApiKey ? t("apiKeySaved") : t("apiKeyMissing")}>
        <Input type="password" value={key} placeholder={t("apiKeyPlaceholder")} onChange={(_, d) => setKey(d.value)} />
      </Field>
      <Field label={t("contextLimit")}>
        <Input type="number" min={1024} value={String(draft.contextLimit)}
          onChange={(_, d) => patch("contextLimit", Math.max(1024, Number(d.value) || 1024))} />
      </Field>
    </div>

    <div className="switch-list">
      <Switch checked={draft.thinking} label={t("thinking")} onChange={(_, d) => patch("thinking", d.checked)} />
      <div>
        <Switch checked={draft.longConversation} label={t("longConversation")}
          onChange={(_, d) => patch("longConversation", d.checked)} />
        <p>{t("longConversationHint")}</p>
      </div>
    </div>

    <div className="connection-test">
      <Button className="press" appearance="outline" icon={testing ? <Spinner size="tiny" /> : <PlugConnected20Regular />}
        disabled={testing || urlBroken} onClick={test}>
        {testing ? t("testing") : t("testConnection")}
      </Button>
      {report && <span className={`connection-result ${report.ok ? "ok" : "failed"}`}>
        {report.ok ? <CheckmarkCircle20Filled /> : <DismissCircle20Filled />}
        {report.ok ? `${t("connectionOk")} (${report.latencyMs} ms)` : report.message}
      </span>}
    </div>

    <div className="profile-footer">
      <Button className="press" appearance="subtle" icon={<Delete20Regular />} disabled={!canDelete} onClick={onDelete}>
        {t("deleteProfile")}
      </Button>
      <Button className={`press save-button ${saved.fired ? "fired" : ""}`} appearance="primary"
        icon={saved.fired ? <Checkmark20Filled /> : <Save20Regular />}
        disabled={!dirty || urlBroken} onClick={save}>
        {saved.fired ? t("saved") : t("save")}
      </Button>
    </div>
  </div>;
}
