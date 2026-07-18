import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSettings, HistoryEntry, TranslationStyle } from "../domain/types";
import { useTranslation } from "../hooks/useTranslation";
import { useShortcuts } from "../hooks/useShortcuts";
import { useI18n } from "../i18n/I18nContext";
import { openSettingsWindow } from "../services/backend";
import { Sidebar } from "../components/Sidebar";
import { MainHeader } from "../components/MainHeader";
import { LanguageBar } from "../components/LanguageBar";
import { StylePicker } from "../components/StylePicker";
import { EditorPane } from "../components/EditorPane";
import { CustomStyleDialog } from "../components/CustomStyleDialog";
import { HistoryDialog } from "../components/HistoryDialog";
import { UpdateDialog } from "../components/UpdateDialog";
import { checkForUpdate, type UpdateResult } from "../services/updater";
import { detectInstallMode } from "../services/backend";

export function MainPage({ settings, update }: { settings: AppSettings; update: (value: AppSettings | ((s: AppSettings) => AppSettings)) => Promise<void> }) {
  const { t } = useI18n(); const translation = useTranslation();
  const [input, setInput] = useState(""); const [source, setSource] = useState("Auto Detect");
  const [target, setTarget] = useState("English"); const [customTarget, setCustomTarget] = useState("");
  const [style, setStyle] = useState<TranslationStyle>("natural"); const [customStyle, setCustomStyle] = useState("");
  const [customOpen, setCustomOpen] = useState(false); const [historyOpen, setHistoryOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateResult>(); const [portable, setPortable] = useState(false);
  const active = settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0];
  const contextWarning = translation.session && translation.session.usedTokens >= translation.session.limit / 2;
  useEffect(() => {
    if (settings.updateMode !== "automatic") return;
    detectInstallMode().then((mode) => setPortable(mode === "portable"));
    checkForUpdate(settings.updateChannel, false).then((result) => result.available && setAvailableUpdate(result)).catch(() => {});
  }, [settings.updateChannel, settings.updateMode]);

  const translate = useCallback(() => {
    if (!active?.hasApiKey) return;
    translation.start({ profileId: active.id, sourceLanguage: source, targetLanguage: target === "Custom" ? customTarget : target, sourceText: input, style, customStyle, contextLimit: active.contextLimit, longConversation: active.longConversation });
  }, [active, customStyle, customTarget, input, source, style, target, translation]);
  const clear = useCallback(() => { setInput(""); translation.setDetectedLanguage(undefined); }, [translation]);
  const copy = useCallback(() => { if (translation.output) navigator.clipboard.writeText(translation.output); }, [translation.output]);
  const shortcutActions = useMemo(() => ({ translate, clear, copy }), [translate, clear, copy]);
  useShortcuts(settings.shortcuts, shortcutActions);

  const swap = () => {
    const resolvedSource = source === "Auto Detect" ? translation.detectedLanguage : source;
    if (!resolvedSource || target === "Custom") return;
    setSource(target); setTarget(resolvedSource); translation.setDetectedLanguage(undefined);
  };
  const restore = (entry: HistoryEntry) => { setInput(entry.sourceText); setSource(entry.sourceLanguage); setTarget(entry.targetLanguage); setStyle(entry.style); translation.restore(entry); };
  const changeInput = (value: string) => { setInput(value); translation.setDetectedLanguage(undefined); };

  return <div className="app-layout"><Sidebar onHistory={() => setHistoryOpen(true)} onSettings={openSettingsWindow} /><main className="main-content">
    <MainHeader profiles={settings.profiles} activeId={settings.activeProfileId} session={active?.longConversation ? translation.session : undefined} onProfile={(id) => update({ ...settings, activeProfileId: id })} onRefresh={translation.refreshSession} />
    {!active?.hasApiKey && <MessageBar intent="warning"><MessageBarBody>{t("keyRequired")}</MessageBarBody></MessageBar>}
    {contextWarning && <MessageBar intent="warning"><MessageBarBody>{t("contextWarning")}</MessageBarBody></MessageBar>}
    {translation.error && <MessageBar intent="error"><MessageBarBody>{t("translationFailed")}: {translation.error}</MessageBarBody></MessageBar>}
    <LanguageBar source={source} target={target} customTarget={customTarget} detected={translation.detectedLanguage} onSource={(v) => { setSource(v); translation.setDetectedLanguage(undefined); }} onTarget={setTarget} onCustomTarget={setCustomTarget} onSwap={swap} />
    <StylePicker value={style} onChange={setStyle} onEditCustom={() => setCustomOpen(true)} />
    <EditorPane input={input} output={translation.output} busy={translation.busy} onInput={changeInput} onOutput={translation.setOutput} onClear={clear} onCopy={copy} onTranslate={translate} onStop={translation.stop} />
  </main><CustomStyleDialog open={customOpen} value={customStyle} onCancel={() => setCustomOpen(false)} onSave={(value) => { setCustomStyle(value); setCustomOpen(false); }} />
  <HistoryDialog open={historyOpen} onCancel={() => setHistoryOpen(false)} onRestore={restore} />
  {availableUpdate?.version && <UpdateDialog version={availableUpdate.version} body={availableUpdate.body} portable={portable} onCancel={() => setAvailableUpdate(undefined)} onInstall={() => checkForUpdate(settings.updateChannel, !portable)} />}
  </div>;
}
