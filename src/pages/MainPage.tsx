import { MessageBar, MessageBarBody } from "@fluentui/react-components";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppSettings, CustomStyle, HistoryEntry, TranslationStyle } from "../domain/types";
import { isBuiltinStyle, maxCustomStyles, stylePayload } from "../domain/catalogs";
import type { UiState } from "../services/uiState";
import type { Workspace } from "../hooks/useWorkspace";
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
  workspace: Workspace;
  restored?: HistoryEntry;
  onRestored: () => void;
}

export function MainPage({ settings, update, ui, patchUi, workspace, restored, onRestored }: Props) {
  const { t } = useI18n();
  const { input, setInput, changeInput, clear: clearInput, translation } = workspace;
  const [editing, setEditing] = useState<CustomStyle>();
  const [addingStyle, setAddingStyle] = useState(false);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateResult>();
  const [portable, setPortable] = useState(false);
  const active = settings.profiles.find((p) => p.id === settings.activeProfileId) ?? settings.profiles[0];
  const contextWarning = translation.session && translation.session.usedTokens >= translation.session.limit / 2;
  const { source, target, customTarget, style, customStyles } = ui;

  useEffect(() => {
    if (settings.updateMode !== "automatic") return;
    detectInstallMode().then((mode) => setPortable(mode === "portable"));
    checkForUpdate(settings.updateChannel, false).then((result) => result.available && setAvailableUpdate(result)).catch(() => {});
  }, [settings.updateChannel, settings.updateMode]);

  useEffect(() => {
    if (!restored) return;
    setInput(restored.sourceText);
    // A restored entry may name a style that has since been deleted.
    const known = isBuiltinStyle(restored.style) || customStyles.some((entry) => entry.id === restored.style);
    patchUi({
      source: restored.sourceLanguage, target: restored.targetLanguage,
      ...(known ? { style: restored.style } : {})
    });
    translation.restore(restored); onRestored();
  }, [restored, translation, onRestored, patchUi, setInput, customStyles]);

  const translate = useCallback(() => {
    // The button is disabled while streaming, but the shortcut still fires;
    // restarting here would discard the partial result.
    if (!active?.hasApiKey || translation.busy) return;
    translation.start({
      profileId: active.id, sourceLanguage: source,
      targetLanguage: target === "Custom" ? customTarget : target, sourceText: input,
      ...stylePayload(style, customStyles),
      contextLimit: active.contextLimit, longConversation: active.longConversation
    });
  }, [active, customStyles, customTarget, input, source, style, target, translation]);

  const copy = useCallback(() => { if (translation.output) navigator.clipboard.writeText(translation.output); }, [translation.output]);
  const shortcutActions = useMemo(() => ({ translate, clear: clearInput, copy }), [translate, clearInput, copy]);
  useShortcuts(settings.shortcuts, shortcutActions);

  const addStyle = () => {
    if (customStyles.length >= maxCustomStyles) return;
    setAddingStyle(true);
    setEditing({ id: crypto.randomUUID(), name: "", requirements: "" });
  };

  const saveStyle = (value: CustomStyle) => {
    const exists = customStyles.some((entry) => entry.id === value.id);
    patchUi({
      customStyles: exists
        ? customStyles.map((entry) => (entry.id === value.id ? value : entry))
        : [...customStyles, value],
      // Adding a tone selects it; editing one leaves the selection alone.
      ...(exists ? {} : { style: value.id })
    });
    setEditing(undefined); setAddingStyle(false);
  };

  const deleteStyle = (id: string) => {
    patchUi({
      customStyles: customStyles.filter((entry) => entry.id !== id),
      ...(style === id ? { style: "natural" } : {})
    });
    setEditing(undefined); setAddingStyle(false);
  };

  const swap = () => {
    const resolvedSource = source === "Auto Detect" ? translation.detectedLanguage : source;
    if (!resolvedSource || target === "Custom") return;
    patchUi({ source: target, target: resolvedSource });
    translation.setDetectedLanguage(undefined);
  };

  return <div className="workspace">
    <MainHeader profiles={settings.profiles} activeId={settings.activeProfileId}
      session={active?.longConversation ? translation.session : undefined}
      onProfile={(id) => update({ ...settings, activeProfileId: id })} onRefresh={translation.refreshSession} />

    <div className="message-stack">
      {!active?.hasApiKey && <MessageBar intent="warning"><MessageBarBody>{t("keyRequired")}</MessageBarBody></MessageBar>}
      {contextWarning && <MessageBar intent="warning"><MessageBarBody>{t("contextWarning")}</MessageBarBody></MessageBar>}
      {translation.error && <MessageBar intent="error"><MessageBarBody>{t("translationFailed")}: {translation.error}</MessageBarBody></MessageBar>}
    </div>

    <StylePicker value={style} customStyles={customStyles}
      onChange={(next: TranslationStyle) => patchUi({ style: next })}
      onEdit={(id) => { setAddingStyle(false); setEditing(customStyles.find((entry) => entry.id === id)); }}
      onAdd={addStyle} />

    <TranslatePanes
      source={source} target={target} customTarget={customTarget} detected={translation.detectedLanguage}
      input={input} output={translation.output} busy={translation.busy}
      onSource={(v) => { patchUi({ source: v }); translation.setDetectedLanguage(undefined); }}
      onTarget={(v) => patchUi({ target: v })} onCustomTarget={(v) => patchUi({ customTarget: v })} onSwap={swap}
      onInput={changeInput} onOutput={translation.setOutput}
      onClear={clearInput} onCopy={copy} onTranslate={translate} onStop={translation.stop} />

    <CustomStyleDialog value={editing} isNew={addingStyle} onSave={saveStyle} onDelete={deleteStyle}
      onCancel={() => { setEditing(undefined); setAddingStyle(false); }} />
    {availableUpdate?.version && <UpdateDialog version={availableUpdate.version} body={availableUpdate.body} portable={portable}
      onCancel={() => setAvailableUpdate(undefined)} onInstall={() => checkForUpdate(settings.updateChannel, !portable)} />}
  </div>;
}
