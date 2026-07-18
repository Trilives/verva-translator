import { Button, Field, Input, Radio, RadioGroup, Select, Tab, TabList } from "@fluentui/react-components";
import { Add20Regular, ArrowSync20Regular, Dismiss20Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { defaultProfile } from "../domain/catalogs";
import type { AppSettings, ProviderProfile, UiLocale, UpdateChannel } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";
import { closeSettingsWindow, deleteApiKey } from "../services/backend";
import { checkForUpdate } from "../services/updater";
import { ProfileEditor } from "../components/ProfileEditor";

type Section = "profiles" | "general" | "updates" | "shortcuts";

export function SettingsPage({ settings, update }: { settings: AppSettings; update: (value: AppSettings | ((s: AppSettings) => AppSettings)) => Promise<void> }) {
  const { t } = useI18n(); const [section, setSection] = useState<Section>("profiles");
  const [selectedProfile, setSelectedProfile] = useState(settings.activeProfileId); const [updateStatus, setUpdateStatus] = useState("");
  const profile = settings.profiles.find((p) => p.id === selectedProfile) ?? settings.profiles[0];
  const replaceProfile = (next: ProviderProfile) => update({ ...settings, profiles: settings.profiles.map((p) => p.id === next.id ? next : p) });
  const addProfile = async () => { const next = defaultProfile(); setSelectedProfile(next.id); await update({ ...settings, profiles: [...settings.profiles, next], activeProfileId: next.id }); };
  const removeProfile = async () => { if (settings.profiles.length === 1) return; await deleteApiKey(profile.id); const profiles = settings.profiles.filter((p) => p.id !== profile.id); setSelectedProfile(profiles[0].id); await update({ ...settings, profiles, activeProfileId: profiles[0].id }); };
  const checkUpdate = async () => { setUpdateStatus("Checking…"); try { const result = await checkForUpdate(settings.updateChannel, true); setUpdateStatus(result.available ? `Version ${result.version} is available.` : "You are up to date."); } catch (e) { setUpdateStatus(String(e)); } };

  return <main className="settings-page"><header className="settings-header" data-tauri-drag-region><div><h1>{t("settings")}</h1><p>{t("appName")}</p></div></header>
    <TabList selectedValue={section} onTabSelect={(_, d) => setSection(d.value as Section)} className="settings-tabs">
      <Tab value="profiles">{t("profile")}</Tab><Tab value="general">{t("appearance")}</Tab><Tab value="updates">{t("updates")}</Tab><Tab value="shortcuts">{t("shortcuts")}</Tab>
    </TabList>
    <section className="settings-content">
      {section === "profiles" && <><div className="profile-toolbar"><Select value={profile.id} onChange={(_, d) => setSelectedProfile(d.value)}>{settings.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select><Button icon={<Add20Regular />} onClick={addProfile}>{t("addProfile")}</Button></div><ProfileEditor profile={profile} canDelete={settings.profiles.length > 1} onChange={replaceProfile} onDelete={removeProfile} /></>}
      {section === "general" && <div className="settings-stack"><Field label={t("interfaceLanguage")}><RadioGroup value={settings.locale} onChange={(_, d) => update({ ...settings, locale: d.value as UiLocale })}><Radio value="en" label={t("english")} /><Radio value="zh-CN" label={t("chinese")} /></RadioGroup></Field><Field label={t("appearance")}><RadioGroup value={settings.theme} onChange={(_, d) => update({ ...settings, theme: d.value as AppSettings["theme"] })}><Radio value="system" label={t("system")} /><Radio value="light" label={t("light")} /><Radio value="dark" label={t("dark")} /></RadioGroup></Field></div>}
      {section === "updates" && <div className="settings-stack"><Field label={t("updates")}><RadioGroup value={settings.updateMode} onChange={(_, d) => update({ ...settings, updateMode: d.value as AppSettings["updateMode"] })}><Radio value="automatic" label={t("automatic")} /><Radio value="manual" label={t("manual")} /></RadioGroup></Field><Field label="Channel"><RadioGroup value={settings.updateChannel} onChange={(_, d) => update({ ...settings, updateChannel: d.value as UpdateChannel })}><Radio value="stable" label={t("stable")} /><Radio value="beta" label={t("beta")} /></RadioGroup></Field><Button icon={<ArrowSync20Regular />} onClick={checkUpdate}>{t("checkUpdates")}</Button>{updateStatus && <p>{updateStatus}</p>}<p className="settings-note">{t("portableNotice")}</p></div>}
      {section === "shortcuts" && <div className="form-grid"><Field label={t("translate")}><Input value={settings.shortcuts.translate} onChange={(_, d) => update({ ...settings, shortcuts: { ...settings.shortcuts, translate: d.value } })} /></Field><Field label={t("clear")}><Input value={settings.shortcuts.clear} onChange={(_, d) => update({ ...settings, shortcuts: { ...settings.shortcuts, clear: d.value } })} /></Field><Field label={t("copy")}><Input value={settings.shortcuts.copy} onChange={(_, d) => update({ ...settings, shortcuts: { ...settings.shortcuts, copy: d.value } })} /></Field></div>}
    </section>
    <footer className="settings-footer"><Button appearance="primary" icon={<Dismiss20Regular />} onClick={closeSettingsWindow}>{t("closeSettings")}</Button></footer>
  </main>;
}
