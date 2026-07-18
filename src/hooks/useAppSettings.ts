import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "../domain/types";
import { defaultSettings, loadSettings, saveSettings } from "../services/settingsStore";
import { hasApiKey } from "../services/backend";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Never leave the window on the splash: a rejected backend call would
    // otherwise render as a permanently blank window with no way to recover.
    const reload = () => loadSettings().then(async (value) => {
      const profiles = await Promise.all(value.profiles.map(async (profile) => ({ ...profile, hasApiKey: await hasApiKey(profile.id).catch(() => profile.hasApiKey) })));
      const hydrated = { ...value, profiles };
      setSettings(hydrated);
      if (profiles.some((profile, index) => profile.hasApiKey !== value.profiles[index].hasApiKey)) await saveSettings(hydrated);
    }).catch((error) => {
      console.error("Failed to load settings", error);
      setSettings((current) => current ?? defaultSettings());
    }).finally(() => setLoading(false));
    reload();
    window.addEventListener("focus", reload);
    return () => window.removeEventListener("focus", reload);
  }, []);
  const update = useCallback(async (next: AppSettings | ((value: AppSettings) => AppSettings)) => {
    if (!settings) return;
    const value = typeof next === "function" ? next(settings) : next;
    setSettings(value);
    await saveSettings(value);
  }, [settings]);
  return { settings, update, loading };
}
