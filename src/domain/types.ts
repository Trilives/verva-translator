export type UiLocale = "en" | "zh-CN";
export type ProviderKind = "openai" | "claude";
export type UpdateChannel = "stable" | "beta";
export type TranslationStyle = "natural" | "conversation" | "business" | "command" | "custom";

export interface ProviderProfile {
  id: string;
  name: string;
  kind: ProviderKind;
  baseUrl: string;
  model: string;
  thinking: boolean;
  longConversation: boolean;
  contextLimit: number;
  hasApiKey?: boolean;
}

export interface ShortcutSettings {
  translate: string;
  clear: string;
  copy: string;
}

export interface AppSettings {
  locale: UiLocale;
  theme: "system" | "light" | "dark";
  updateMode: "automatic" | "manual";
  updateChannel: UpdateChannel;
  activeProfileId: string;
  profiles: ProviderProfile[];
  shortcuts: ShortcutSettings;
}

export interface TranslationRequest {
  requestId: string;
  profileId: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  style: TranslationStyle;
  customStyle: string;
  sessionId?: string;
}

export interface TranslationChunk {
  requestId: string;
  text: string;
  detectedLanguage?: string;
  inputTokens?: number;
  done: boolean;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  style: TranslationStyle;
}

export interface SessionInfo {
  id: string;
  startedAt: string;
  usedTokens: number;
  limit: number;
}
