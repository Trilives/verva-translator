import type { TranslationStyle } from "./types";

export const languages = [
  "Auto Detect", "English", "Chinese (Simplified)", "Chinese (Traditional)",
  "Spanish", "French", "German", "Japanese", "Korean", "Portuguese",
  "Russian", "Arabic", "Hindi", "Italian", "Dutch", "Turkish", "Polish", "Custom"
] as const;

export const targetLanguages = languages.filter((language) => language !== "Auto Detect");
export const sourceLanguages = languages.filter((language) => language !== "Custom");

export const styles: TranslationStyle[] = [
  "natural", "conversation", "business", "command", "custom"
];

export const defaultProfile = () => ({
  id: crypto.randomUUID(),
  name: "My OpenAI profile",
  kind: "openai" as const,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  thinking: false,
  longConversation: false,
  contextLimit: 128000,
  hasApiKey: false
});
