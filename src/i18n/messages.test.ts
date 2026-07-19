import { describe, expect, it } from "vitest";
import { messages } from "./messages";

describe("bilingual messages", () => {
  it("keeps locale keys aligned", () => expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages["zh-CN"]).sort()));

  /**
   * The editor prompts used to be pinned to English in both modes. They now
   * follow the interface language like every other string, so the guard is that
   * they are actually translated rather than copied across.
   */
  it("translates the editor prompts rather than repeating English", () => {
    for (const key of ["sourcePlaceholder", "resultPlaceholder"] as const) {
      expect(messages["zh-CN"][key]).not.toBe(messages.en[key]);
      expect(messages["zh-CN"][key].trim()).not.toBe("");
    }
  });

  it("leaves no Chinese string accidentally identical to its English source", () => {
    // Only the interface-language endonyms are legitimately identical: the
    // switcher shows each language in its own script in either mode.
    const shared = new Set(["english", "chinese"]);
    const copied = (Object.keys(messages.en) as (keyof typeof messages.en)[])
      .filter((key) => !shared.has(key) && messages["zh-CN"][key] === messages.en[key]);
    expect(copied).toEqual([]);
  });
});
