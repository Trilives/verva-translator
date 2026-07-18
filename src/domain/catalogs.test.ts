import { describe, expect, it } from "vitest";
import { languages, styles, targetLanguages } from "./catalogs";

describe("translation catalogs", () => {
  it("keeps custom as the final target option", () => expect(targetLanguages.at(-1)).toBe("Custom"));
  it("keeps auto-detect source-only", () => expect(targetLanguages).not.toContain("Auto Detect"));
  it("replaces concise with custom", () => { expect(styles).toContain("custom"); expect(styles).not.toContain("concise"); });
  it("offers major languages", () => expect(languages.length).toBeGreaterThan(15));
});
