import { languages } from "../domain/catalogs";
import type { UiLocale } from "../domain/types";

/**
 * Display names for the language catalogue, one set per interface language.
 *
 * The catalogue entries in `domain/catalogs` are canonical identifiers, not
 * labels. They are what gets stored in `ui-state`, written to history, and put
 * in the prompt, so they must stay English no matter what the interface shows.
 * Only the label localizes; `LanguageSelect` never passes a translated name
 * back through `onChange`.
 */
export type LanguageId = (typeof languages)[number];

const en: Record<LanguageId, string> = {
  "Auto Detect": "Auto Detect",
  English: "English",
  "Chinese (Simplified)": "Chinese (Simplified)",
  "Chinese (Traditional)": "Chinese (Traditional)",
  Spanish: "Spanish",
  French: "French",
  German: "German",
  Japanese: "Japanese",
  Korean: "Korean",
  Portuguese: "Portuguese",
  Russian: "Russian",
  Arabic: "Arabic",
  Hindi: "Hindi",
  Italian: "Italian",
  Dutch: "Dutch",
  Turkish: "Turkish",
  Polish: "Polish",
  Custom: "Custom"
};

const zh: Record<LanguageId, string> = {
  "Auto Detect": "自动检测",
  English: "英语",
  "Chinese (Simplified)": "简体中文",
  "Chinese (Traditional)": "繁体中文",
  Spanish: "西班牙语",
  French: "法语",
  German: "德语",
  Japanese: "日语",
  Korean: "韩语",
  Portuguese: "葡萄牙语",
  Russian: "俄语",
  Arabic: "阿拉伯语",
  Hindi: "印地语",
  Italian: "意大利语",
  Dutch: "荷兰语",
  Turkish: "土耳其语",
  Polish: "波兰语",
  Custom: "自定义"
};

export const languageNames: Record<UiLocale, Record<LanguageId, string>> = { en, "zh-CN": zh };

const isKnown = (value: string): value is LanguageId => value in en;

/**
 * Label for a language identifier. Falls back to the raw string, because the
 * detected language comes from the model and need not be in the catalogue.
 */
export function languageLabel(locale: UiLocale, value: string): string {
  return isKnown(value) ? languageNames[locale][value] : value;
}
