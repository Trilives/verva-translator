import { describe, expect, it } from "vitest";
import { messages } from "./messages";

describe("bilingual messages", () => {
  it("keeps locale keys aligned", () => expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages["zh-CN"]).sort()));
  it("uses the required English placeholder in both modes", () => {
    expect(messages.en.sourcePlaceholder).toBe("Enter the content to be translated here.");
    expect(messages["zh-CN"].sourcePlaceholder).toBe(messages.en.sourcePlaceholder);
  });
});
