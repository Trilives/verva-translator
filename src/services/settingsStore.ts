import { load } from "@tauri-apps/plugin-store";
import { defaultProfile } from "../domain/catalogs";
import type { AppSettings } from "../domain/types";
import { isTauri } from "./runtime";

const key = "app-settings";
export const defaultSettings = (): AppSettings => {
  const profile = defaultProfile();
  return {
    locale: "en", theme: "system", closeBehavior: "ask", updateMode: "manual", updateChannel: "stable",
    activeProfileId: profile.id, profiles: [profile],
    shortcuts: { translate: "Ctrl+Enter", clear: "Ctrl+L", copy: "Ctrl+Shift+C" }
  };
};

export async function loadSettings(): Promise<AppSettings> {
  if (!isTauri()) {
    const raw = localStorage.getItem(key);
    return raw ? { ...defaultSettings(), ...JSON.parse(raw) } : defaultSettings();
  }
  const store = await load("settings.json", { autoSave: 150, defaults: {} });
  // Spread over the defaults so settings written by an older version gain any
  // newly added field instead of arriving undefined.
  return { ...defaultSettings(), ...(await store.get<Partial<AppSettings>>(key)) };
}

export async function saveSettings(settings: AppSettings) {
  if (!isTauri()) return localStorage.setItem(key, JSON.stringify(settings));
  const store = await load("settings.json", { autoSave: 150, defaults: {} });
  await store.set(key, settings);
  await store.save();
}
