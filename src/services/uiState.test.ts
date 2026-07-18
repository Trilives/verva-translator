import { describe, expect, it } from "vitest";
import { defaultUiState, type UiState } from "./uiState";

describe("persisted interface state", () => {
  it("restores the fields that make the window look the same", () => {
    const keys = Object.keys(defaultUiState()).sort();
    expect(keys).toEqual(
      ["customStyle", "customTarget", "page", "settingsSection", "source", "style", "target"]
    );
  });

  /**
   * settings.json is plain JSON on disk. Translation content belongs in the
   * encrypted Stronghold vault, so it must never gain a field here.
   */
  it("never carries translation content", () => {
    const state = defaultUiState() as UiState & Record<string, unknown>;
    for (const forbidden of ["input", "output", "sourceText", "translatedText", "result", "history"]) {
      expect(state).not.toHaveProperty(forbidden);
    }
  });

  it("starts on the workspace with auto detection", () => {
    expect(defaultUiState().page).toBe("workspace");
    expect(defaultUiState().source).toBe("Auto Detect");
  });
});
