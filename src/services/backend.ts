import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { HistoryEntry, ProviderProfile, TranslationChunk, TranslationRequest } from "../domain/types";
import { isTauri } from "./runtime";

export const hasApiKey =(profileId: string) => isTauri() ? invoke<boolean>("has_api_key", { profileId }) : Promise.resolve(false);
export const saveApiKey = (profileId: string, apiKey: string) => invoke<void>("save_api_key", { profileId, apiKey });
export const deleteApiKey = (profileId: string) => invoke<void>("delete_api_key", { profileId });
export const listModels = (profile: ProviderProfile) => isTauri() ? invoke<string[]>("list_models", { profile }) : Promise.resolve([]);
export const cancelTranslation = (requestId: string) => invoke<void>("cancel_translation", { requestId });
export const listHistory = () => isTauri() ? invoke<HistoryEntry[]>("list_history") : Promise.resolve([]);
export const clearHistory = () => invoke<void>("clear_history");
export const detectInstallMode = () => isTauri() ? invoke<"installed" | "portable">("install_mode") : Promise.resolve("portable");
export const hideToTray = () => invoke<void>("hide_to_tray");
export const quitApp = () => invoke<void>("quit_app");

export interface LocalModel { name: string; size: number; running: boolean; quantization?: string }
export interface LocalStatus { available: boolean; ollamaInstalled: boolean; models: LocalModel[]; activePulls: string[] }
export interface PullProgress { model: string; status: string; completed: number; total: number; done: boolean }
export const localModelStatus = () => isTauri() ? invoke<LocalStatus>("local_model_status")
  : Promise.resolve<LocalStatus>({ available: false, ollamaInstalled: false, models: [], activePulls: [] });
export const startOllama = () => invoke<void>("start_ollama");
export const pullLocalModel = (model: string, proxy?: string) => invoke<void>("pull_local_model", { model, proxy });
export const cancelLocalModelPull = (model: string) => invoke<void>("cancel_local_model_pull", { model });
export const loadLocalModel = (model: string) => invoke<void>("load_local_model", { model });
export const unloadLocalModel = (model: string) => invoke<void>("unload_local_model", { model });
export const recognizeImage = (imageBase64: string) =>
  invoke<string>("recognize_image", { imageBase64 });
export const onLocalModelPull = (handler: (progress: PullProgress) => void): Promise<UnlistenFn> =>
  listen<PullProgress>("local-model-pull", ({ payload }) => handler(payload));

export interface ConnectionReport { ok: boolean; latencyMs?: number; message?: string }
export const testProfile = (profile: ProviderProfile) =>
  isTauri() ? invoke<ConnectionReport>("test_profile", { profile })
    : Promise.resolve<ConnectionReport>({ ok: false, message: "Not running in the desktop app" });

export function onCloseRequested(handler: () => void): Promise<UnlistenFn> {
  return listen("close-requested", () => handler());
}

export async function startTranslation(request: TranslationRequest) {
  await invoke("start_translation", { request });
}

export function onTranslationChunk(handler: (chunk: TranslationChunk) => void): Promise<UnlistenFn> {
  return listen<TranslationChunk>("translation-chunk", ({ payload }) => handler(payload));
}
