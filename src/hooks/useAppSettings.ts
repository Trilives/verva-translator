import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSettings } from "../domain/types";
import { defaultSettings, loadSettings, saveSettings } from "../services/settingsStore";
import { hasApiKey } from "../services/backend";

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>();
  const [loading, setLoading] = useState(true);
  const current = useRef<AppSettings>();
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    // Never leave the window on the splash: a rejected backend call would
    // otherwise render as a permanently blank window with no way to recover.
    const reload = () => loadSettings().then(async (value) => {
      const profiles = await Promise.all(value.profiles.map(async (profile) => ({ ...profile, hasApiKey: await hasApiKey(profile.id).catch(() => profile.hasApiKey) })));
      const hydrated = { ...value, profiles };
      current.current = hydrated;
      setSettings(hydrated);
      if (profiles.some((profile, index) => profile.hasApiKey !== value.profiles[index].hasApiKey)) await saveSettings(hydrated);
    }).catch((error) => {
      console.error("Failed to load settings", error);
      setSettings((current) => current ?? defaultSettings());
    }).finally(() => setLoading(false));
    reload();
  }, []);
  const update = useCallback((next: AppSettings | ((value: AppSettings) => AppSettings)) => {
    if (!current.current) return Promise.resolve();
    const value = typeof next === "function" ? next(current.current) : next;
    current.current = value;
    setSettings(value);
    const pending = saveQueue.current.catch(() => undefined).then(() => saveSettings(value));
    saveQueue.current = pending;
    return pending;
  }, []);
  return { settings, update, loading };
}
