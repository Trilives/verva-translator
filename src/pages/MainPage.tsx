import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSettings, HistoryEntry, TranslationStyle } from "../domain/types";
import type { UiState } from "../services/uiState";
import { useTranslation } from "../hooks/useTranslation";
import { useShortcuts } from "../hooks/useShortcuts";
import { useI18n } from "../i18n/I18nContext";
import { MainHeader } from "../components/MainHeader";
import { StylePicker } from "../components/StylePicker";
import { TranslatePanes } from "../components/TranslatePanes";
import { CustomStyleDialog } from "../components/CustomStyleDialog";
import { UpdateDialog } from "../components/UpdateDialog";
import { checkForUpdate, type UpdateResult } from "../services/updater";
import { detectInstallMode } from "../services/backend";

interface Props {
  settings: AppSettings;
  update: (value: AppSettings | ((s: AppSettings) => AppSettings)) => Promise<void>;
  ui: UiState;
  patchUi: (changes: Partial<UiState>) => void;
  restored?: HistoryEntry;
  onRestored: () => void;
}

export function MainPage({ settings, update, ui, patchUi, restored, onRestored }: Props) {
  const { t } = useI18n(); const translation = useTranslation();
  // Source text is intentionally not persisted; see services/uiState.ts.
  const [input, setInput] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateResult>(); const [portable, setPortable] = useState(false);
  const active = settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0];
  const contextWarning = translation.session && translation.session.usedTokens >= translation.session.limit / 2;
  const { source, target, customTarget, style, customStyle } = ui;

  useEffect(() => {
    if (settings.updateMode !== "automatic") return;
    detectInstallMode().then((mode) => setPortable(mode === "portable"));
    checkForUpdate(settings.updateChannel, false).then((result) => result.available && setAvailableUpdate(result)).catch(() => {});
  }, [settings.updateChannel, settings.updateMode]);

  useEffect(() => {
    if (!restored) return;
    setInput(restored.sourceText);
    patchUi({ source: restored.sourceLanguage, target: restored.targetLanguage, style: restored.style });
    translation.restore(restored); onRestored();
  }, [restored, translation, onRestored, patchUi]);

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
    patchUi({ source: target, target: resolvedSource });
    translation.setDetectedLanguage(undefined);
  };
  const changeInput = (value: string) => { setInput(value); translation.setDetectedLanguage(undefined); };

  return <div className="workspace">
    <MainHeader profiles={settings.profiles} activeId={settings.activeProfileId}
      session={active?.longConversation ? translation.session : undefined}
      onProfile={(id) => update({ ...settings, activeProfileId: id })} onRefresh={translation.refreshSession} />

    <div className="message-stack">
      {!active?.hasApiKey && <MessageBar intent="warning"><MessageBarBody>{t("keyRequired")}</MessageBarBody></MessageBar>}
      {contextWarning && <MessageBar intent="warning"><MessageBarBody>{t("contextWarning")}</MessageBarBody></MessageBar>}
      {translation.error && <MessageBar intent="error"><MessageBarBody>{t("translationFailed")}: {translation.error}</MessageBarBody></MessageBar>}
    </div>

    <StylePicker value={style} onChange={(next: TranslationStyle) => patchUi({ style: next })}
      onEditCustom={() => setCustomOpen(true)} />

    <TranslatePanes
      source={source} target={target} customTarget={customTarget} detected={translation.detectedLanguage}
      input={input} output={translation.output} busy={translation.busy}
      onSource={(v) => { patchUi({ source: v }); translation.setDetectedLanguage(undefined); }}
      onTarget={(v) => patchUi({ target: v })} onCustomTarget={(v) => patchUi({ customTarget: v })} onSwap={swap}
      onInput={changeInput} onOutput={translation.setOutput}
      onClear={clear} onCopy={copy} onTranslate={translate} onStop={translation.stop} />

    <CustomStyleDialog open={customOpen} value={customStyle} onCancel={() => setCustomOpen(false)}
      onSave={(value) => { patchUi({ customStyle: value }); setCustomOpen(false); }} />
    {availableUpdate?.version && <UpdateDialog version={availableUpdate.version} body={availableUpdate.body} portable={portable}
      onCancel={() => setAvailableUpdate(undefined)} onInstall={() => checkForUpdate(settings.updateChannel, !portable)} />}
  </div>;
}
