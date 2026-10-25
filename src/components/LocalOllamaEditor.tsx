import { Button, Field, Select } from "@fluentui/react-components";
import { useCallback, useEffect, useState } from "react";
import type { ProviderProfile } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";
import { localModelStatus, type LocalStatus } from "../services/backend";

export function LocalOllamaEditor({ profile, onModel }: { profile: ProviderProfile; onModel: (model: string) => void }) {
  const { t } = useI18n();
  const [status, setStatus] = useState<LocalStatus>();
  const [error, setError] = useState("");
  const refresh = useCallback(() => {
    void localModelStatus().then((value) => { setStatus(value); setError(""); }).catch((reason) => setError(String(reason)));
  }, []);
  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (status?.available && profile.model && !status.models.some((model) => model.name === profile.model)) {
      onModel("");
    }
  }, [status, profile.model, onModel]);
  const installed = status?.models.map((model) => model.name) ?? [];
  const selected = installed.includes(profile.model) ? profile.model : "";
  return <div className="profile-editor">
    <p className="settings-note">{t("localProfileFixed")}</p>
    <Field label={t("model")} hint={error || (!status ? t("checking") : !status.available ? t(status.ollamaInstalled ? "ollamaStopped" : "ollamaMissing") : installed.length ? "" : t("noLocalModels"))}>
      <div className="model-row"><Select value={selected} disabled={!status?.available || installed.length === 0}
        onChange={(_, data) => onModel(data.value)}>
        <option value="">{t("chooseLocalModel")}</option>
        {installed.map((model) => <option key={model} value={model}>{model}</option>)}
      </Select><Button onClick={refresh}>{t("refreshModels")}</Button></div>
    </Field>
  </div>;
}
