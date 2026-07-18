import { load } from "@tauri-apps/plugin-store";
import type { TranslationStyle } from "../domain/types";
import { isTauri } from "./runtime";

const key = "ui-state";

export type PersistedPage = "workspace" | "history" | "settings";
export type SettingsSection = "profiles" | "general" | "updates" | "shortcuts";

/**
 * Interface state restored on the next launch.
 *
 * Deliberately excludes the source text and the translation result. Those are
 * translation content, and this store is plain JSON on disk; history is kept in
 * the encrypted Stronghold vault precisely so it never lands here.
 */
export interface UiState {
  page: PersistedPage;
  settingsSection: SettingsSection;
  source: string;
  target: string;
  customTarget: string;
  style: TranslationStyle;
  customStyle: string;
}

export const defaultUiState = (): UiState => ({
  page: "workspace",
  settingsSection: "profiles",
  source: "Auto Detect",
  target: "English",
  customTarget: "",
  style: "natural",
  customStyle: ""
});

export async function loadUiState(): Promise<UiState> {
  if (!isTauri()) {
    const raw = localStorage.getItem(key);
    return raw ? { ...defaultUiState(), ...JSON.parse(raw) } : defaultUiState();
  }
  const store = await load("settings.json", { autoSave: 150, defaults: {} });
  return { ...defaultUiState(), ...(await store.get<Partial<UiState>>(key)) };
}

export async function saveUiState(state: UiState) {
  if (!isTauri()) return localStorage.setItem(key, JSON.stringify(state));
  const store = await load("settings.json", { autoSave: 150, defaults: {} });
  await store.set(key, state);
  await store.save();
}
