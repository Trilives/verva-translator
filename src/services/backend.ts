import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { HistoryEntry, TranslationChunk, TranslationRequest } from "../domain/types";
import { isTauri } from "./runtime";

export const openSettingsWindow = () => isTauri() ? invoke("open_settings_window") : Promise.resolve();
export const closeSettingsWindow = () => isTauri() ? invoke("close_settings_window") : Promise.resolve();
export const hasApiKey = (profileId: string) => isTauri() ? invoke<boolean>("has_api_key", { profileId }) : Promise.resolve(false);
export const saveApiKey = (profileId: string, apiKey: string) => invoke<void>("save_api_key", { profileId, apiKey });
export const deleteApiKey = (profileId: string) => invoke<void>("delete_api_key", { profileId });
export const cancelTranslation = (requestId: string) => invoke<void>("cancel_translation", { requestId });
export const listHistory = () => isTauri() ? invoke<HistoryEntry[]>("list_history") : Promise.resolve([]);
export const clearHistory = () => invoke<void>("clear_history");
export const detectInstallMode = () => isTauri() ? invoke<"installed" | "portable">("install_mode") : Promise.resolve("portable");

export async function startTranslation(request: TranslationRequest) {
  await invoke("start_translation", { request });
}

export function onTranslationChunk(handler: (chunk: TranslationChunk) => void): Promise<UnlistenFn> {
  return listen<TranslationChunk>("translation-chunk", ({ payload }) => handler(payload));
}
