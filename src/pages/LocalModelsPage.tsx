import { Button, Input, MessageBar, MessageBarBody, ProgressBar, Spinner } from "@fluentui/react-components";
import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";
import { ExternalLink } from "../components/ExternalLink";
import {
  cancelLocalModelPull, loadLocalModel, localModelStatus, onLocalModelPull, pullLocalModel, unloadLocalModel,
  type LocalStatus, type PullProgress
} from "../services/backend";

// Ordered by practical recommendation for a translation app, not parameter count.
const modelTiers = [
  { title: "tier4Title", evidence: "tier4Evidence", source: "https://arxiv.org/pdf/2601.09012", models: [
    { name: "translategemma:4b-it-q4_K_M", aliases: ["translategemma:4b"], size: "3.3 GB", vram: "5–6 GB", ram: "8 GB", badge: "recommendedTranslation", description: "translationModelDescription", hardware: "standardHardware" },
    { name: "qwen3.5:4b-q4_K_M", aliases: [], size: "3.3 GB", vram: "5–6 GB", ram: "8 GB", badge: "recommendedAll", description: "visionModelDescription", hardware: "standardHardware" }
  ] },
  { title: "tier2Title", evidence: "tier2Evidence", source: "https://huggingface.co/Qwen/Qwen3.5-0.8B", models: [
    { name: "qwen3.5:2b-q4_K_M", aliases: [], size: "1.9 GB", vram: "3–4 GB", ram: "6 GB", badge: "tierPick", description: "lightweightDescription", hardware: "lightHardware" }
  ] },
  { title: "tier1Title", evidence: "tier1Evidence", source: "https://huggingface.co/Qwen/Qwen3.5-0.8B", models: [
    { name: "qwen3.5:0.8b-q8_0", aliases: [], size: "1.0 GB", vram: "2–3 GB", ram: "4 GB", badge: "tierPick", description: "subOneBDescription", hardware: "lightHardware" },
    { name: "gemma3:1b-it-q4_K_M", aliases: ["gemma3:1b"], size: "806 MB", vram: "2 GB", ram: "4 GB", badge: "oneBModel", description: "oneBDescription", hardware: "lightHardware" }
  ] },
  { title: "tierMediumTitle", evidence: "tierMediumEvidence", source: "https://arxiv.org/pdf/2601.09012", models: [
    { name: "translategemma:12b-it-q4_K_M", aliases: ["translategemma:12b"], size: "8.1 GB", vram: "11–13 GB", ram: "16 GB", badge: "tierPick", description: "translationModelDescription", hardware: "largeHardware" },
    { name: "qwen3.5:9b-q4_K_M", aliases: [], size: "6.6 GB", vram: "9–11 GB", ram: "16 GB", badge: "recommendedAll", description: "visionModelDescription", hardware: "largeHardware" }
  ] },
  { title: "tier27Title", evidence: "tier27Evidence", source: "https://arxiv.org/pdf/2601.09012", models: [
    { name: "translategemma:27b-it-q4_K_M", aliases: ["translategemma:27b"], size: "17 GB", vram: "22–24 GB", ram: "32 GB", badge: "tierPick", description: "translationModelDescription", hardware: "veryLargeHardware" }
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
  const [status, setStatus] = useState<LocalStatus>({ available: false, ollamaInstalled: false, models: [], activePulls: [] });
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [pending, setPending] = useState<string>();
  const [pendingAction, setPendingAction] = useState<"download" | "load" | "unload">();
  const [canceling, setCanceling] = useState(false);
  const [progress, setProgress] = useState<PullProgress>();
  const [customModelInput, setCustomModelInput] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    try { setStatus(await localModelStatus()); }
    catch (reason) { setError(String(reason)); }
    finally { setStatusLoaded(true); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 5000);
    let off = () => {};
    onLocalModelPull(setProgress).then((unlisten) => { off = unlisten; }).catch(() => {});
    return () => { window.clearInterval(timer); off(); };
  }, [refresh]);

  const act = async (model: string, action: "download" | "load" | "unload") => {
    setPending(model); setPendingAction(action); setCanceling(false); setError(""); setNotice(""); setProgress(undefined);
    try {
      if (action === "download") await pullLocalModel(model, settings.ollamaProxyUrl?.trim() || undefined);
      if (action === "load") await loadLocalModel(model);
      if (action === "unload") await unloadLocalModel(model);
      await refresh();
    } catch (reason) {
      const message = String(reason);
      if (message.includes("LOCAL_PULL_CANCELLED")) setNotice(t("downloadCanceled"));
      else if (message.includes("OLLAMA_REDIRECT_FAKE_IP")) setError(t("ollamaFakeIpError"));
      else if (message.includes("Invalid Ollama proxy address")) setError(t("invalidProxyAddress"));
      else if (message.includes("OLLAMA_EXECUTABLE_MISSING")) setError(t("ollamaMissing"));
      else setError(message);
    }
    finally { setPending(undefined); setPendingAction(undefined); setCanceling(false); }
  };

  const cancelDownload = async (model: string) => {
    setCanceling(true);
    try {
      await cancelLocalModelPull(model);
      if (pending !== model) setNotice(t("downloadCanceled"));
      await refresh();
    }
    catch (reason) { setError(String(reason)); setCanceling(false); }
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

  const customModel = customModelInput.trim();
  const validCustomModel = /^[A-Za-z0-9._:/-]{1,120}$/.test(customModel);
  const customModelListed = recommended.some((item) => item.name === customModel || item.aliases.some((alias) => alias === customModel));
  const showCustomCard = validCustomModel && !customModelListed;
  const otherInstalled = status.models.filter((model) => model.name !== (showCustomCard ? customModel : "") && !recommended.some((item) =>
    item.name === model.name || item.aliases.some((alias) => alias === model.name)));
  const otherActivePulls = status.activePulls.filter((name) => name !== (showCustomCard ? customModel : "")
    && !status.models.some((model) => model.name === name)
    && !recommended.some((item) => item.name === name || item.aliases.some((alias) => alias === name)));
  const renderCard = (name: string, recommendation?: Recommendation) => {
    const installed = status.models.find((model) => model.name === name || recommendation?.aliases.some((alias) => alias === model.name));
    const activePull = status.activePulls.includes(name);
    const busy = (!!pending && (pending === name || pending === installed?.name)) || activePull;
    return <article className="local-card" key={name}>
      <div className="local-card-main">
        <div className="local-card-title"><strong>{name}</strong>
          {recommendation && <span className="local-badge">{t(recommendation.badge)}</span>}
          <span className="local-status">{!status.available ? t("modelStatusUnavailable") : installed?.running ? t("modelRunning") : installed ? t("modelInstalled") : t("modelNotInstalled")}</span>
        </div>
        <p>{recommendation ? t(recommendation.description) : installed ? t("otherInstalledModel") : t("customModelDescription")}</p>
        <small>{t("downloadSize")}: {installed ? `${(installed.size / 1e9).toFixed(1)} GB` : recommendation?.size ?? "—"}{installed?.quantization ? ` · ${installed.quantization}` : ""} · {recommendation ? t(recommendation.hardware) : ""}</small>
        {recommendation && <small className="local-memory">{t("estimatedVram")}: {recommendation.vram} · {t("estimatedRam")}: {recommendation.ram}</small>}
      </div>
      <div className="local-actions">
        {!installed && <Button disabled={!statusLoaded || (!status.available && !(status.ollamaInstalled && settings.ollamaProxyUrl?.trim())) || !!pending || activePull} onClick={() => void act(name, "download")}>{t("downloadModel")}</Button>}
        {installed && <>
          <Button disabled={!!pending} onClick={() => void act(installed.name, installed.running ? "unload" : "load")}>{installed.running ? t("unloadModel") : t("loadModel")}</Button>
          <Button appearance="primary" disabled={!!pending} onClick={() => void useForTranslation(installed.name)}>{t("useForTranslation")}</Button>
        </>}
      </div>
      {busy && <div className="local-progress">
        {progress?.model === name && progress.total > 0
          ? <ProgressBar value={progress.completed / progress.total} /> : <Spinner size="tiny" />}
        <span>{progress?.model === name ? `${progress.status} ${progress.total ? `${Math.round(progress.completed / progress.total * 100)}%` : ""}` : t("working")}</span>
        {(pendingAction === "download" || activePull) && <Button size="small" disabled={canceling} onClick={() => void cancelDownload(name)}>{canceling ? t("cancelingDownload") : t("cancelDownload")}</Button>}
      </div>}
    </article>;
  };
  return <div className="local-view">
    <header className="page-header"><div><h1>{t("localModels")}</h1><p>{t("localModelsSubtitle")}</p></div>
      <Button onClick={() => void refresh()}>{t("refreshModels")}</Button></header>
    {statusLoaded && !status.available && <div className="local-alert">
      <span>{status.ollamaInstalled
        ? settings.ollamaProxyUrl?.trim() ? t("ollamaNotRunningProxy") : t("ollamaStopped")
        : t("ollamaMissing")}</span>
      {!status.ollamaInstalled && <ExternalLink href="https://ollama.com/download/windows" onError={setError}>{t("installOllama")}</ExternalLink>}
    </div>}
    {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
    {notice && <MessageBar intent="info"><MessageBarBody>{notice}</MessageBarBody></MessageBar>}
    <label className="local-proxy-field"><span>{t("ollamaProxyAddress")}</span>
      <Input value={settings.ollamaProxyUrl ?? ""} placeholder="127.0.0.1:7897"
        onChange={(_, data) => void update((current) => ({ ...current, ollamaProxyUrl: data.value }))} />
      <small>{t("ollamaProxyHint")}</small>
    </label>
    <p className="local-note">{t("localPrivacy")}</p>
    <p className="local-note">{t("quantizedModelNote")}</p>
    <p className="local-note">{t("memoryEstimateNote")}</p>
    <p className="local-note">{t("benchmarkNote")}</p>
    <div className="local-list">
      <section className="local-tier">
        <div className="local-tier-header"><h2>{t("customModelTitle")}</h2><p>{t("customModelHint")}</p></div>
        <Input className="local-model-name" aria-label={t("customModelName")} value={customModelInput}
          placeholder="namespace/model:tag" maxLength={120} disabled={!!pending} onChange={(_, data) => setCustomModelInput(data.value)} />
        {customModel && !validCustomModel && <small className="local-note">{t("customModelInvalid")}</small>}
        {customModelListed && <small className="local-note">{t("customModelListed")}</small>}
        {showCustomCard && renderCard(customModel)}
      </section>
      {modelTiers.map((tier) => <section className="local-tier" key={tier.title}>
        <div className="local-tier-header"><h2>{t(tier.title)}</h2>
          <p>{t(tier.evidence)} <ExternalLink href={tier.source} onError={setError}>{t("benchmarkSource")}</ExternalLink></p>
        </div>
        {tier.models.map((model) => renderCard(model.name, model))}
      </section>)}
      {(otherInstalled.length > 0 || otherActivePulls.length > 0) && <section className="local-tier">
        <div className="local-tier-header"><h2>{t("otherInstalledTitle")}</h2></div>
        {otherInstalled.map((model) => renderCard(model.name))}
        {otherActivePulls.map((name) => renderCard(name))}
      </section>}
    </div>
  </div>;
}
