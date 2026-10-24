import { describe, expect, it } from "vitest";
import { swapTranslation } from "./swapTranslation";

describe("swap translation", () => {
  it("swaps both language direction and text", () => {
    expect(swapTranslation({ source: "Japanese", target: "English", customTarget: "",
      input: "こんにちは", output: "Hello" })).toEqual({
      source: "English", target: "Japanese", input: "Hello", output: "こんにちは"
    });
  });

  it("uses a model-detected language when starting from auto detection", () => {
    expect(swapTranslation({ source: "Auto Detect", target: "English", customTarget: "",
      detected: "Chinese", input: "你好", output: "Hello" })).toEqual({
      source: "English", target: "Chinese (Simplified)", input: "Hello", output: "你好"
    });
  });

  it("keeps reverse translation usable when detection is unavailable", () => {
    expect(swapTranslation({ source: "Auto Detect", target: "English", customTarget: "",
      input: "你好", output: "Hello" })).toMatchObject({
      source: "English", target: "Chinese (Simplified)", input: "Hello", output: "你好"
    });
  });

  it("uses auto detection when a custom target cannot be selected as a source", () => {
    expect(swapTranslation({ source: "English", target: "Custom", customTarget: "Swahili",
      input: "Hello", output: "Jambo" })).toMatchObject({
      source: "Auto Detect", target: "English", input: "Jambo", output: "Hello"
    });
  });
});
