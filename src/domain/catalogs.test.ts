import { describe, expect, it } from "vitest";
import { builtinStyles, isBuiltinStyle, languages, maxCustomStyles, stylePayload, targetLanguages } from "./catalogs";
import type { CustomStyle } from "./types";

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

describe("style payload sent to the backend", () => {
  const academic: CustomStyle = { id: "abc-123", name: "Academic", requirements: "Cite terminology precisely." };

  /**
   * Rust interpolates `style` straight into the prompt, so a user-defined tone
   * must send its name. Sending the id would put a bare UUID in front of the
   * model.
   */
  it("sends a user-defined tone by name, with its requirements", () => {
    expect(stylePayload("abc-123", [academic])).toEqual({
      style: "Academic", customStyle: "Cite terminology precisely."
    });
  });

  it("sends a builtin by key with no requirements", () => {
    expect(stylePayload("business", [academic])).toEqual({ style: "business", customStyle: "" });
  });

  it("never leaks a style id into the prompt", () => {
    expect(stylePayload("abc-123", [academic]).style).not.toContain("abc-123");
  });

  it("falls back to the raw value when the tone was deleted", () => {
    expect(stylePayload("abc-123", [])).toEqual({ style: "abc-123", customStyle: "" });
  });

  it("carries empty requirements through as an empty string", () => {
    const bare: CustomStyle = { id: "x", name: "Terse", requirements: "" };
    expect(stylePayload("x", [bare])).toEqual({ style: "Terse", customStyle: "" });
  });
});
