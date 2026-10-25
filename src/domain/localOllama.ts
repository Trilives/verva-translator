import type { AppSettings, ProviderProfile } from "./types";

export const LOCAL_OLLAMA_ID = "ollama-local";
export const LOCAL_OLLAMA_URL = "http://127.0.0.1:11434";

export function localOllamaProfile(model = ""): ProviderProfile {
  return { id: LOCAL_OLLAMA_ID, name: "Ollama", kind: "ollama", baseUrl: LOCAL_OLLAMA_URL,
    model, thinking: "off", longConversation: false, contextLimit: 4096, hasApiKey: false };
}

export function ensureLocalOllama(settings: AppSettings): AppSettings {
  const legacy = settings.profiles.filter((p) => p.name.startsWith("Local · ") && p.baseUrl === `${LOCAL_OLLAMA_URL}/v1`);
  const selectedLegacy = legacy.find((p) => p.id === settings.activeProfileId);
  const stored = settings.profiles.find((p) => p.id === LOCAL_OLLAMA_ID);
  const model = stored?.model || selectedLegacy?.model || legacy[0]?.model || "";
  const profiles = settings.profiles.filter((p) => p.id !== LOCAL_OLLAMA_ID && !legacy.includes(p));
  profiles.push(localOllamaProfile(model));
  return { ...settings, profiles,
    activeProfileId: selectedLegacy ? LOCAL_OLLAMA_ID : settings.activeProfileId };
}
