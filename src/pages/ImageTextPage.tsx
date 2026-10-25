import { Button, MessageBar, MessageBarBody, Spinner } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { stylePayload } from "../domain/catalogs";
import { isLanBaseUrl } from "../domain/providerUrl";
import type { AppSettings } from "../domain/types";
import type { Workspace } from "../hooks/useWorkspace";
import { useI18n } from "../i18n/I18nContext";
import { recognizeImage } from "../services/backend";
import type { UiState } from "../services/uiState";
import { LanguageSelect } from "../components/LanguageSelect";

interface Props {
  settings: AppSettings;
  update: (value: AppSettings | ((s: AppSettings) => AppSettings)) => Promise<void>;
  ui: UiState;
  patchUi: (changes: Partial<UiState>) => void;
  workspace: Workspace;
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the image"));
    reader.readAsDataURL(file);
  });
}

export function ImageTextPage({ settings, update, ui, patchUi, workspace }: Props) {
  const { t } = useI18n();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState("");
  const [zoom, setZoom] = useState(100);
  const [recognized, setRecognized] = useState("");
  const [hasTranslated, setHasTranslated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0];
  const needsKey = active && !isLanBaseUrl(active.baseUrl) && !active.hasApiKey;
  const localModelMissing = active?.kind === "ollama" && !active.model;
  const translation = workspace.translation;

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (next?: File) => {
    setError(""); setRecognized(""); setHasTranslated(false);
    if (!next) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type) || next.size > 12 * 1024 * 1024) {
      setError(t("imageFormatError")); return;
    }
    setZoom(100);
    setFile(next);
  };

  const extract = async () => {
    if (!file) return;
    setBusy(true); setError(""); setRecognized(""); setHasTranslated(false);
    try { setRecognized(await recognizeImage(await readImage(file))); }
    catch (reason) { setError(String(reason)); }
    finally { setBusy(false); }
  };

  const translate = () => {
    if (!recognized.trim() || !active || needsKey || localModelMissing || translation.busy) return;
    workspace.setInput(recognized);
    setHasTranslated(true);
    void translation.start({ profileId: active.id, sourceLanguage: "Auto Detect",
      targetLanguage: ui.target === "Custom" ? ui.customTarget : ui.target,
      sourceText: recognized, ...stylePayload(ui.style, ui.customStyles),
      contextLimit: active.contextLimit, longConversation: active.longConversation });
  };

  return <div className="image-view">
    <header className="page-header"><div><h1>{t("imageText")}</h1><p>{t("imageTextSubtitle")}</p></div></header>
    {error && <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>}
    {hasTranslated && translation.error && <MessageBar intent="error"><MessageBarBody>{t("translationFailed")}: {translation.error}</MessageBarBody></MessageBar>}
    <p className="local-note">{t("ocrEngineNote")}</p>
    <div className="image-controls">
      <label className="file-pick">{t("chooseImage")}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => choose(e.target.files?.[0])} /></label>
      <Button appearance="primary" disabled={!file || busy} onClick={() => void extract()}>{busy ? <Spinner size="tiny" /> : t("extractText")}</Button>
    </div>
    <div className="image-grid">
      <section className="image-panel">
        <div className="image-preview-header"><h2>{t("imagePreview")}</h2>
          {preview && <div className="image-zoom-controls" role="group" aria-label={t("imageZoom")}>
            <Button size="small" aria-label={t("zoomOut")} disabled={zoom <= 50} onClick={() => setZoom((value) => Math.max(50, value - 25))}>−</Button>
            <span aria-live="polite">{zoom}%</span>
            <Button size="small" aria-label={t("zoomIn")} disabled={zoom >= 300} onClick={() => setZoom((value) => Math.min(300, value + 25))}>+</Button>
            <Button size="small" onClick={() => setZoom(100)}>{t("fitWidth")}</Button>
          </div>}
        </div>
        <div className="image-preview-viewport">
          {preview ? <img src={preview} alt={file?.name ?? ""} style={{ width: `${zoom}%` }} /> : <p className="empty-note">{t("noImage")}</p>}
        </div>
      </section>
      <section className="image-panel"><h2>{t("recognizedText")}</h2>
        <textarea className="image-text-editor" aria-label={t("recognizedText")} value={recognized}
          onChange={(event) => { setRecognized(event.currentTarget.value); setHasTranslated(false); }} placeholder={t("ocrResultPlaceholder")} />
        <div className="image-translate-controls">
          <label className="image-model-label">{t("profile")}
            <select value={settings.activeProfileId} onChange={(e) => void update((s) => ({ ...s, activeProfileId: e.target.value }))}>
              {settings.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · {profile.model}</option>)}
            </select>
          </label>
          <LanguageSelect kind="target" value={ui.target} onChange={(target) => patchUi({ target })} />
          {ui.target === "Custom" && <input className="native-input" value={ui.customTarget} placeholder={t("customLanguage")}
            onChange={(e) => patchUi({ customTarget: e.target.value })} />}
          <Button appearance="primary" disabled={!recognized.trim() || !!needsKey || !!localModelMissing || translation.busy || ui.target === "Custom" && !ui.customTarget.trim()}
            onClick={translate}>{t("translateExtracted")}</Button>
          {translation.busy && <Button onClick={() => void translation.stop()}>{t("stop")}</Button>}
        </div>
        {needsKey && <p className="empty-note">{t("keyRequired")}</p>}
        {localModelMissing && <p className="empty-note">{t("noLocalModels")}</p>}
      </section>
    </div>
    {hasTranslated && <section className="image-result"><h2>{t("translatedText")}</h2>
      <textarea className="image-text-editor" aria-label={t("translatedText")} value={translation.output}
        onChange={(event) => translation.setOutput(event.currentTarget.value)} />
      <Button disabled={!translation.output} onClick={() => void navigator.clipboard.writeText(translation.output)}>{t("copy")}</Button>
    </section>}
  </div>;
}
