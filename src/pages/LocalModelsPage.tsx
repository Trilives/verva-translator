import { Button, MessageBar, MessageBarBody, ProgressBar, Spinner } from "@fluentui/react-components";
import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";
import {
  loadLocalModel, localModelStatus, onLocalModelPull, pullLocalModel, unloadLocalModel,
  type LocalStatus, type PullProgress
} from "../services/backend";

// Ordered by practical recommendation for a translation app, not parameter count.
const modelTiers = [
  { title: "tier4Title", evidence: "tier4Evidence", source: "https://arxiv.org/pdf/2601.09012", models: [
    { name: "translategemma:4b", size: "3.3 GB", badge: "recommendedTranslation", description: "translationModelDescription", hardware: "standardHardware" },
    { name: "qwen3.5:4b", size: "3.3–4 GB", badge: "recommendedAll", description: "visionModelDescription", hardware: "standardHardware" }
  ] },
  { title: "tier2Title", evidence: "tier2Evidence", source: "https://huggingface.co/Qwen/Qwen3.5-0.8B", models: [
    { name: "qwen3.5:2b", size: "2.7–3.1 GB", badge: "tierPick", description: "lightweightDescription", hardware: "lightHardware" }
  ] },
  { title: "tier1Title", evidence: "tier1Evidence", source: "https://huggingface.co/Qwen/Qwen3.5-0.8B", models: [
    { name: "qwen3.5:0.8b", size: "1.2–1.3 GB", badge: "tierPick", description: "subOneBDescription", hardware: "lightHardware" },
    { name: "gemma3:1b", size: "806 MB", badge: "oneBModel", description: "oneBDescription", hardware: "lightHardware" }
  ] },
  { title: "tierMediumTitle", evidence: "tierMediumEvidence", source: "https://arxiv.org/pdf/2601.09012", models: [
    { name: "translategemma:12b", size: "8.1 GB", badge: "tierPick", description: "translationModelDescription", hardware: "largeHardware" },
    { name: "qwen3.5:9b", size: "6.6–7.6 GB", badge: "recommendedAll", description: "visionModelDescription", hardware: "largeHardware" }
  ] },
  { title: "tier27Title", evidence: "tier27Evidence", source: "https://arxiv.org/pdf/2601.09012", models: [
    { name: "translategemma:27b", size: "17 GB", badge: "tierPick", description: "translationModelDescription", hardware: "veryLargeHardware" }
  ] }
] as const;

type Recommendation = (typeof modelTiers)[number]["models"][number];
const recommended: Recommendation[] = modelTiers.reduce<Recommendation[]>((items, tier) => {
  items.push(...tier.models);
  return items;
}, []);

interface Props {
  settings: AppSettings;
  update: (value: AppSettings | ((s: AppSettings) => AppSettings)) => Promise<void>;
  onUse: () => void;
}

export function LocalModelsPage({ settings, update, onUse }: Props) {
  const { t } = useI18n();
  const [status, setStatus] = useState<LocalStatus>({ available: false, models: [] });
  const [pending, setPending] = useState<string>();
  const [progress, setProgress] = useState<PullProgress>();
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try { setStatus(await localModelStatus()); }
    catch (reason) { setError(String(reason)); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    let off = () => {};
    onLocalModelPull(setProgress).then((unlisten) => { off = unlisten; }).catch(() => {});
    return () => { window.clearInterval(timer); off(); };
  }, [refresh]);

  const act = async (model: string, action: "download" | "load" | "unload") => {
    setPending(model); setError(""); setProgress(undefined);
    try {
      if (action === "download") await pullLocalModel(model);
      if (action === "load") await loadLocalModel(model);
      if (action === "unload") await unloadLocalModel(model);
      await refresh();
    } catch (reason) { setError(String(reason)); }
    finally { setPending(undefined); }
  };

  const useForTranslation = async (model: string) => {
    const existing = settings.profiles.find((profile) =>
      profile.baseUrl === "http://127.0.0.1:11434/v1" && profile.model === model);
    if (existing) await update((current) => ({ ...current, activeProfileId: existing.id }));
    else {
      const id = crypto.randomUUID();
      await update((current) => ({ ...current, activeProfileId: id,
        profiles: [...current.profiles, { id, name: `Local · ${model}`, kind: "openai",
          baseUrl: "http://127.0.0.1:11434/v1", model, thinking: "off",
          longConversation: false, contextLimit: 32768, hasApiKey: false }] }));
    }
    onUse();
  };

  const otherInstalled = status.models.filter((model) => !recommended.some((item) => item.name === model.name));
  const renderCard = (name: string, recommendation?: Recommendation) => {
    const installed = status.models.find((model) => model.name === name);
    const busy = pending === name;
    return <article className="local-card" key={name}>
      <div className="local-card-main">
        <div className="local-card-title"><strong>{name}</strong>
          {recommendation && <span className="local-badge">{t(recommendation.badge)}</span>}
          <span className="local-status">{installed?.running ? t("modelRunning") : installed ? t("modelInstalled") : t("modelNotInstalled")}</span>
        </div>
        <p>{recommendation ? t(recommendation.description) : t("otherInstalledModel")}</p>
        <small>{t("downloadSize")}: {installed ? `${(installed.size / 1e9).toFixed(1)} GB` : recommendation?.size ?? "—"} · {recommendation ? t(recommendation.hardware) : ""}</small>
      </div>
      <div className="local-actions">
        {!installed && <Button disabled={!status.available || !!pending} onClick={() => void act(name, "download")}>{t("downloadModel")}</Button>}
        {installed && <>
          <Button disabled={!!pending} onClick={() => void act(name, installed.running ? "unload" : "load")}>{installed.running ? t("unloadModel") : t("loadModel")}</Button>
          <Button appearance="primary" disabled={!!pending} onClick={() => void useForTranslation(name)}>{t("useForTranslation")}</Button>
        </>}
      </div>
      {busy && <div className="local-progress">
        {progress?.model === name && progress.total > 0
          ? <ProgressBar value={progress.completed / progress.total} /> : <Spinner size="tiny" />}
        <span>{progress?.model === name ? `${progress.status} ${progress.total ? `${Math.round(progress.completed / progress.total * 100)}%` : ""}` : t("working")}</span>
      </div>}
    </article>;
  };
  return <div className="local-view">
    <header className="page-header"><div><h1>{t("localModels")}</h1><p>{t("localModelsSubtitle")}</p></div>
      <Button onClick={() => void refresh()}>{t("refreshModels")}</Button></header>
    {!status.available && <div className="local-alert">
      <span>{t("ollamaMissing")}</span>
      <a href="https://ollama.com/download/windows" target="_blank" rel="noreferrer">{t("installOllama")}</a>
    </div>}
    {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
    <p className="local-note">{t("localPrivacy")} {t("largeModelAdvice")}</p>
    <p className="local-note">{t("benchmarkNote")}</p>
    <div className="local-list">
      {modelTiers.map((tier) => <section className="local-tier" key={tier.title}>
        <div className="local-tier-header"><h2>{t(tier.title)}</h2>
          <p>{t(tier.evidence)} <a href={tier.source} target="_blank" rel="noreferrer">{t("benchmarkSource")}</a></p>
        </div>
        {tier.models.map((model) => renderCard(model.name, model))}
      </section>)}
      {otherInstalled.length > 0 && <section className="local-tier">
        <div className="local-tier-header"><h2>{t("otherInstalledTitle")}</h2></div>
        {otherInstalled.map((model) => renderCard(model.name))}
      </section>}
    </div>
  </div>;
}
