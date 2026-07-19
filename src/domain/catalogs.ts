import type { BuiltinStyle } from "./types";

export const languages = [
  "Auto Detect", "English", "Chinese (Simplified)", "Chinese (Traditional)",
  "Spanish", "French", "German", "Japanese", "Korean", "Portuguese",
  "Russian", "Arabic", "Hindi", "Italian", "Dutch", "Turkish", "Polish", "Custom"
] as const;

export const targetLanguages = languages.filter((language) => language !== "Auto Detect");
export const sourceLanguages = languages.filter((language) => language !== "Custom");

/** Shipped tones. Their labels come from the dictionary under the same key. */
export const builtinStyles: BuiltinStyle[] = [
  "natural", "conversation", "business", "command"
];

/** Beyond this the row stops fitting on one line at the minimum width. */
export const maxCustomStyles = 4;

export const isBuiltinStyle = (style: string): style is BuiltinStyle =>
  (builtinStyles as string[]).includes(style);

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
