import { load } from "@tauri-apps/plugin-store";
import { defaultProfile, thinkingLevels } from "../domain/catalogs";
import type { AppSettings, ThinkingLevel } from "../domain/types";
import { isTauri } from "./runtime";

const key = "app-settings";

/**
 * Folds a stored `thinking` value into the graduated form. Older builds wrote a
 * plain on/off flag; `true` requested the budget that "medium" now names, so it
 * maps there rather than to the highest level.
 */
function normalizeThinking(value: unknown): ThinkingLevel {
  if (value === true) return "medium";
  if (typeof value === "string" && (thinkingLevels as string[]).includes(value)) {
    return value as ThinkingLevel;
  }
  return "off";
}

/** Applies field-level migrations that a shallow default spread cannot. */
function normalize(settings: AppSettings): AppSettings {
  return {
    ...settings,
    profiles: settings.profiles.map((profile) => ({
      ...profile, thinking: normalizeThinking(profile.thinking)
    }))
  };
}
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
    return raw ? normalize({ ...defaultSettings(), ...JSON.parse(raw) }) : defaultSettings();
  }
  const store = await load("settings.json", { autoSave: 150, defaults: {} });
  // Spread over the defaults so settings written by an older version gain any
  // newly added field instead of arriving undefined.
  return normalize({ ...defaultSettings(), ...(await store.get<Partial<AppSettings>>(key)) });
}

export async function saveSettings(settings: AppSettings) {
  if (!isTauri()) return localStorage.setItem(key, JSON.stringify(settings));
  const store = await load("settings.json", { autoSave: 150, defaults: {} });
  await store.set(key, settings);
  await store.save();
}
