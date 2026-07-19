import { load } from "@tauri-apps/plugin-store";
import { isBuiltinStyle, maxCustomStyles } from "../domain/catalogs";
import type { CustomStyle, TranslationStyle } from "../domain/types";
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
  /** A builtin key, or the id of one of `customStyles`. */
  style: TranslationStyle;
  customStyles: CustomStyle[];
}

export const defaultUiState = (): UiState => ({
  page: "workspace",
  settingsSection: "profiles",
  source: "Auto Detect",
  target: "English",
  customTarget: "",
  style: "natural",
  customStyles: []
});

/** The shape written before user-defined tones replaced the single Custom card. */
interface LegacyUiState {
  style?: string;
  customStyle?: string;
}

/**
 * Folds a stored state into the current shape.
 *
 * The old build kept one free-text `customStyle` behind a fixed `custom` card.
 * That text is promoted to a named style so nobody loses their requirements,
 * and a selection pointing at a style that no longer exists falls back to the
 * first builtin rather than leaving the row with nothing selected.
 */
export function migrateUiState(stored: Partial<UiState> & LegacyUiState): UiState {
  const base = defaultUiState();
  // `customStyle` is legacy and must not survive into the persisted shape.
  const { customStyle, ...carried } = stored;
  const customStyles = (carried.customStyles ?? []).slice(0, maxCustomStyles);
  let style = carried.style ?? base.style;

  const legacy = customStyle?.trim();
  if (legacy && !carried.customStyles) {
    const promoted: CustomStyle = { id: crypto.randomUUID(), name: "Custom", requirements: legacy };
    customStyles.push(promoted);
    if (style === "custom") style = promoted.id;
  }

  const known = isBuiltinStyle(style) || customStyles.some((entry) => entry.id === style);
  return { ...base, ...carried, customStyles, style: known ? style : base.style };
}

export async function loadUiState(): Promise<UiState> {
  const stored = await readUiState();
  const state = migrateUiState(stored);
  // Write the migration back straight away. A promoted style is minted with a
  // fresh id, so leaving the legacy shape on disk would hand it a different id
  // on every launch until something else happened to save.
  if ("customStyle" in stored) await saveUiState(state).catch(() => {});
  return state;
}

async function readUiState(): Promise<Partial<UiState> & LegacyUiState> {
  if (!isTauri()) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  }
  const store = await load("settings.json", { autoSave: 150, defaults: {} });
  return (await store.get<Partial<UiState> & LegacyUiState>(key)) ?? {};
}

export async function saveUiState(state: UiState) {
  if (!isTauri()) return localStorage.setItem(key, JSON.stringify(state));
  const store = await load("settings.json", { autoSave: 150, defaults: {} });
  await store.set(key, state);
  await store.save();
}
