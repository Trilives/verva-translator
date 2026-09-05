import type { BuiltinStyle, CustomStyle, ThinkingLevel, TranslationStyle } from "./types";

/** Selectable reasoning levels, ordered from least to most effort. */
export const thinkingLevels: ThinkingLevel[] = ["off", "low", "medium", "high"];

export const languages = [
  "Auto Detect", "English", "Chinese (Simplified)", "Chinese (Traditional)",
  "Spanish", "French", "German", "Japanese", "Korean", "Portuguese",
  "Russian", "Arabic", "Hindi", "Italian", "Dutch", "Turkish", "Polish", "Custom"
] as const;

export const targetLanguages = languages.filter((language) => language !== "Auto Detect");
export const sourceLanguages = languages.filter((language) => language !== "Custom");

/** Shipped tones. Their labels come from the dictionary under the same key.
 *  "normal" leads the row as the unrestricted default choice. */
export const builtinStyles: BuiltinStyle[] = [
  "normal", "natural", "conversation", "business", "command", "professional"
];

/**
 * Extra prompt requirements a builtin tone carries. Most builtins lean on the
 * model's reading of their key alone; the ones listed here send an explicit
 * constraint so the instruction is unambiguous. "normal" is intentionally
 * absent — it imposes no restrictions.
 */
const builtinRequirements: Partial<Record<BuiltinStyle, string>> = {
  professional: "Use more professional vocabulary."
};

/** Beyond this the row stops fitting on one line at the minimum width. */
export const maxCustomStyles = 4;

export const isBuiltinStyle = (style: string): style is BuiltinStyle =>
  (builtinStyles as string[]).includes(style);

/**
 * What the backend receives for the selected tone.
 *
 * Rust interpolates `style` as a label and `customStyle` as free-text
 * requirements, so a user-defined tone sends its **name** rather than its id: a
 * UUID in the prompt would mean nothing to the model. A builtin sends its key
 * and any requirements declared for it (most declare none).
 */
export function stylePayload(style: TranslationStyle, customStyles: CustomStyle[]) {
  const selected = customStyles.find((entry) => entry.id === style);
  return selected
    ? { style: selected.name, customStyle: selected.requirements }
    : { style, customStyle: builtinRequirements[style as BuiltinStyle] ?? "" };
}

export const defaultProfile = () => ({
  id: crypto.randomUUID(),
  name: "My OpenAI profile",
  kind: "openai" as const,
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4.1-mini",
  thinking: "off" as ThinkingLevel,
  longConversation: false,
  contextLimit: 128000,
  hasApiKey: false
});
