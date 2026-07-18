import { Button, Select, Tab, TabList } from "@fluentui/react-components";
import { Add20Regular, Dismiss20Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { defaultProfile } from "../domain/catalogs";
import type { AppSettings, ProviderProfile } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";
import { closeSettingsWindow, deleteApiKey } from "../services/backend";
import { checkForUpdate } from "../services/updater";
import { ProfileEditor } from "../components/ProfileEditor";
import { WindowTitleBar } from "../components/WindowTitleBar";
import { GeneralSection, ShortcutsSection, UpdatesSection } from "../components/SettingsSections";

type Section = "profiles" | "general" | "updates" | "shortcuts";

export function SettingsPage({ settings, update }: { settings: AppSettings; update: (value: AppSettings | ((s: AppSettings) => AppSettings)) => Promise<void> }) {
  const { t } = useI18n();
  const [section, setSection] = useState<Section>("profiles");
  const [selectedProfile, setSelectedProfile] = useState(settings.activeProfileId);
  const [updateStatus, setUpdateStatus] = useState("");
  const profile = settings.profiles.find((p) => p.id === selectedProfile) ?? settings.profiles[0];

  const replaceProfile = (next: ProviderProfile) => update({ ...settings, profiles: settings.profiles.map((p) => p.id === next.id ? next : p) });
  const addProfile = async () => {
    const next = defaultProfile();
    setSelectedProfile(next.id);
    await update({ ...settings, profiles: [...settings.profiles, next], activeProfileId: next.id });
  };
  const removeProfile = async () => {
    if (settings.profiles.length === 1) return;
    await deleteApiKey(profile.id);
    const profiles = settings.profiles.filter((p) => p.id !== profile.id);
    setSelectedProfile(profiles[0].id);
    await update({ ...settings, profiles, activeProfileId: profiles[0].id });
  };
  const checkUpdate = async () => {
    setUpdateStatus(t("checking"));
    try {
      const result = await checkForUpdate(settings.updateChannel, true);
      setUpdateStatus(result.available ? `${t("versionAvailable")} ${result.version}` : t("upToDate"));
    } catch (error) {
      setUpdateStatus(String(error));
    }
  };

  return <div className="app-shell settings-shell">
    <WindowTitleBar title={t("settings")} />
    <main className="settings-page">
      <header className="settings-header">
        <span className="eyebrow">{t("appName")}</span>
        <h1>{t("settings")}</h1>
      </header>
      <TabList selectedValue={section} onTabSelect={(_, d) => setSection(d.value as Section)} className="settings-tabs">
        <Tab value="profiles">{t("profile")}</Tab>
        <Tab value="general">{t("appearance")}</Tab>
        <Tab value="updates">{t("updates")}</Tab>
        <Tab value="shortcuts">{t("shortcuts")}</Tab>
      </TabList>
      <section className="settings-content">
        {section === "profiles" && <div className="settings-stack">
          <div className="profile-toolbar">
            <Select value={profile.id} onChange={(_, d) => setSelectedProfile(d.value)}>
              {settings.profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Button icon={<Add20Regular />} onClick={addProfile}>{t("addProfile")}</Button>
          </div>
          <section className="settings-card">
            <ProfileEditor profile={profile} canDelete={settings.profiles.length > 1} onChange={replaceProfile} onDelete={removeProfile} />
          </section>
        </div>}
        {section === "general" && <GeneralSection settings={settings} update={update} />}
        {section === "updates" && <UpdatesSection settings={settings} update={update} status={updateStatus} onCheck={checkUpdate} />}
        {section === "shortcuts" && <ShortcutsSection settings={settings} update={update} />}
      </section>
      <footer className="settings-footer">
        <Button appearance="primary" icon={<Dismiss20Regular />} onClick={closeSettingsWindow}>{t("closeSettings")}</Button>
      </footer>
    </main>
  </div>;
}
