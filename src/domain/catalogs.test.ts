import { describe, expect, it } from "vitest";
import { builtinStyles, isBuiltinStyle, languages, maxCustomStyles, targetLanguages } from "./catalogs";

describe("translation catalogs", () => {
  it("keeps custom as the final target option", () => expect(targetLanguages.at(-1)).toBe("Custom"));
  it("keeps auto-detect source-only", () => expect(targetLanguages).not.toContain("Auto Detect"));
  it("offers major languages", () => expect(languages.length).toBeGreaterThan(15));

  /**
   * The fixed Custom card became user-defined styles. A builtin named "custom"
   * would now collide with a style id, so it must not come back.
   */
  it("ships four builtin tones and no Custom placeholder", () => {
    expect(builtinStyles).toEqual(["natural", "conversation", "business", "command"]);
    expect(builtinStyles).not.toContain("custom");
  });

  it("caps user-defined tones so the row still fits", () => expect(maxCustomStyles).toBe(4));

  it("recognises builtins and rejects style ids", () => {
    expect(isBuiltinStyle("business")).toBe(true);
    expect(isBuiltinStyle(crypto.randomUUID())).toBe(false);
  });
});
