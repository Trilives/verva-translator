import { Button, Tab, TabList } from "@fluentui/react-components";
import { Add20Regular } from "@fluentui/react-icons";
import { useState } from "react";
import { defaultProfile } from "../domain/catalogs";
import type { AppSettings, ProviderProfile } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";
import { deleteApiKey } from "../services/backend";
import { checkForUpdate } from "../services/updater";
import { ProfileList } from "../components/ProfileList";
import { GeneralSection, ShortcutsSection, UpdatesSection } from "../components/SettingsSections";

type Section = "profiles" | "general" | "updates" | "shortcuts";

interface Props {
  settings: AppSettings;
  update: (value: AppSettings | ((s: AppSettings) => AppSettings)) => Promise<void>;
  section: Section;
  onSection: (section: Section) => void;
}

export function SettingsPage({ settings, update, section, onSection }: Props) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string>();
  const [updateStatus, setUpdateStatus] = useState("");

  const saveProfile = (next: ProviderProfile) =>
    update({ ...settings, profiles: settings.profiles.map((p) => p.id === next.id ? next : p) });

  const addProfile = async () => {
    const next = defaultProfile();
    await update({ ...settings, profiles: [...settings.profiles, next], activeProfileId: next.id });
    setExpandedId(next.id);
  };

  const removeProfile = async (target: ProviderProfile) => {
    if (settings.profiles.length === 1) return;
    await deleteApiKey(target.id);
    const profiles = settings.profiles.filter((p) => p.id !== target.id);
    setExpandedId(undefined);
    await update({
      ...settings,
      profiles,
      activeProfileId: settings.activeProfileId === target.id ? profiles[0].id : settings.activeProfileId
    });
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

  return <div className="settings-view">
    <header className="page-header">
      <div>
        <h1>{t("settings")}</h1>
        <p>{t("settingsSubtitle")}</p>
      </div>
    </header>
    <TabList selectedValue={section} onTabSelect={(_, d) => onSection(d.value as Section)} className="settings-tabs">
      <Tab value="profiles">{t("profile")}</Tab>
      <Tab value="general">{t("appearance")}</Tab>
      <Tab value="updates">{t("updates")}</Tab>
      <Tab value="shortcuts">{t("shortcuts")}</Tab>
    </TabList>
    <section className="settings-content">
      {section === "profiles" && <div className="settings-stack">
        <div className="profile-toolbar">
          <Button className="press" icon={<Add20Regular />} onClick={addProfile}>{t("addProfile")}</Button>
        </div>
        <ProfileList profiles={settings.profiles} activeId={settings.activeProfileId}
          expandedId={expandedId} onExpand={setExpandedId} onSave={saveProfile} onDelete={removeProfile} />
      </div>}
      {section === "general" && <GeneralSection settings={settings} update={update} />}
      {section === "updates" && <UpdatesSection settings={settings} update={update} status={updateStatus} onCheck={checkUpdate} />}
      {section === "shortcuts" && <ShortcutsSection settings={settings} update={update} />}
    </section>
  </div>;
}
