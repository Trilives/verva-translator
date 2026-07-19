import { describe, expect, it } from "vitest";
import { languageLabel, languageNames } from "./languages";
import { languages } from "../domain/catalogs";

describe("language names", () => {
  it("covers every catalogue entry in both locales", () => {
    for (const locale of ["en", "zh-CN"] as const) {
      expect(Object.keys(languageNames[locale]).sort()).toEqual([...languages].sort());
    }
  });

  it("keeps the locale sets aligned", () => {
    expect(Object.keys(languageNames.en).sort()).toEqual(Object.keys(languageNames["zh-CN"]).sort());
  });

  it("leaves no name untranslated in Chinese", () => {
    for (const id of languages) {
      expect(languageNames["zh-CN"][id]).not.toBe("");
      // Every entry should differ from the English label; a name left in
      // English is the bug this table exists to fix.
      expect(languageNames["zh-CN"][id]).not.toBe(languageNames.en[id]);
    }
  });

  it("labels English identifiers as themselves in English", () => {
    for (const id of languages) expect(languageNames.en[id]).toBe(id);
  });

  /**
   * The identifier is what reaches the prompt, history and `ui-state`, so a
   * value outside the catalogue -- the model's detected language, for one --
   * must pass through untouched rather than resolve to something wrong.
   */
  it("passes unknown values through unchanged", () => {
    expect(languageLabel("zh-CN", "Swahili")).toBe("Swahili");
    expect(languageLabel("en", "")).toBe("");
  });

  it("translates known values", () => {
    expect(languageLabel("zh-CN", "Japanese")).toBe("日语");
    expect(languageLabel("zh-CN", "Auto Detect")).toBe("自动检测");
    expect(languageLabel("en", "Japanese")).toBe("Japanese");
  });
});
