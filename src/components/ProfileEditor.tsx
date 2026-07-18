import { Button, Field, Input, Select, Switch } from "@fluentui/react-components";
import { Delete20Regular, Key20Regular } from "@fluentui/react-icons";
import { useState } from "react";
import type { ProviderProfile } from "../domain/types";
import { saveApiKey } from "../services/backend";
import { useI18n } from "../i18n/I18nContext";

export function ProfileEditor({ profile, canDelete, onChange, onDelete }: { profile: ProviderProfile; canDelete: boolean; onChange: (p: ProviderProfile) => void; onDelete: () => void }) {
  const { t } = useI18n(); const [key, setKey] = useState(""); const [urlError, setUrlError] = useState(false);
  const patch = (value: Partial<ProviderProfile>) => onChange({ ...profile, ...value });
  const validateUrl = (value: string) => {
    try { const url = new URL(value); const valid = url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)); setUrlError(!valid); return valid; }
    catch { setUrlError(true); return false; }
  };
  const saveKey = async () => { if (!key.trim()) return; await saveApiKey(profile.id, key.trim()); setKey(""); patch({ hasApiKey: true }); };
  return <div className="profile-editor">
    <div className="form-grid">
      <Field label={t("profile")}><Input value={profile.name} onChange={(_, d) => patch({ name: d.value })} /></Field>
      <Field label={t("provider")}><Select value={profile.kind} onChange={(_, d) => patch({ kind: d.value as ProviderProfile["kind"] })}><option value="openai">{t("openAi")}</option><option value="claude">{t("claude")}</option></Select></Field>
      <Field label={t("baseUrl")} validationMessage={urlError ? t("invalidUrl") : undefined} validationState={urlError ? "error" : "none"}><Input value={profile.baseUrl} onBlur={() => validateUrl(profile.baseUrl)} onChange={(_, d) => patch({ baseUrl: d.value })} /></Field>
      <Field label={t("model")}><Input value={profile.model} onChange={(_, d) => patch({ model: d.value })} /></Field>
      <Field label={t("apiKey")} hint={profile.hasApiKey ? t("apiKeySaved") : t("apiKeyMissing")}><div className="key-row"><Input type="password" value={key} onChange={(_, d) => setKey(d.value)} /><Button icon={<Key20Regular />} onClick={saveKey} disabled={!key.trim()}>{t("save")}</Button></div></Field>
      <Field label="Context limit"><Input type="number" min={1024} value={String(profile.contextLimit)} onChange={(_, d) => patch({ contextLimit: Math.max(1024, Number(d.value) || 1024) })} /></Field>
    </div>
    <div className="switch-list"><Switch checked={profile.thinking} onChange={(_, d) => patch({ thinking: d.checked })} label={t("thinking")} /><div><Switch checked={profile.longConversation} onChange={(_, d) => patch({ longConversation: d.checked })} label={t("longConversation")} /><p>{t("longConversationHint")}</p></div></div>
    <Button appearance="subtle" icon={<Delete20Regular />} disabled={!canDelete} onClick={onDelete}>{t("deleteProfile")}</Button>
  </div>;
}
