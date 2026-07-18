import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "../domain/types";
import { loadSettings, saveSettings } from "../services/settingsStore";
import { hasApiKey } from "../services/backend";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const reload = () => loadSettings().then(async (value) => {
      const profiles = await Promise.all(value.profiles.map(async (profile) => ({ ...profile, hasApiKey: await hasApiKey(profile.id) })));
      const hydrated = { ...value, profiles };
      setSettings(hydrated);
      if (profiles.some((profile, index) => profile.hasApiKey !== value.profiles[index].hasApiKey)) await saveSettings(hydrated);
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
