import { describe, expect, it } from "vitest";
import { defaultUiState, migrateUiState, type UiState } from "./uiState";

describe("persisted interface state", () => {
  it("restores the fields that make the window look the same", () => {
    const keys = Object.keys(defaultUiState()).sort();
    expect(keys).toEqual(
      ["customStyles", "customTarget", "page", "settingsSection", "source", "style", "target"]
    );
  });

  /**
   * settings.json is plain JSON on disk. Translation content belongs in the
   * encrypted Stronghold vault, so it must never gain a field here.
   *
   * Custom style requirements are user-authored instructions, not translated
   * content, so they are allowed; source text and results are not.
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

describe("migration from the single Custom card", () => {
  it("promotes the old free-text requirements to a named style and keeps it selected", () => {
    const state = migrateUiState({ style: "custom", customStyle: "Keep it formal." });
    expect(state.customStyles).toHaveLength(1);
    expect(state.customStyles[0]).toMatchObject({ name: "Custom", requirements: "Keep it formal." });
    expect(state.style).toBe(state.customStyles[0].id);
  });

  it("drops the legacy key so it cannot be written back", () => {
    const state = migrateUiState({ style: "custom", customStyle: "Keep it formal." });
    expect(state).not.toHaveProperty("customStyle");
  });

  it("falls back to a builtin when Custom was selected but never configured", () => {
    expect(migrateUiState({ style: "custom" }).style).toBe("natural");
  });

  it("falls back when the selected style no longer exists", () => {
    expect(migrateUiState({ style: "deleted-id", customStyles: [] }).style).toBe("natural");
  });

  it("keeps a selection that still resolves", () => {
    const custom = { id: "abc", name: "Academic", requirements: "Cite precisely." };
    expect(migrateUiState({ style: "abc", customStyles: [custom] }).style).toBe("abc");
    expect(migrateUiState({ style: "business" }).style).toBe("business");
  });

  it("never restores more styles than the row allows", () => {
    const many = Array.from({ length: 7 }, (_, index) => ({ id: `s${index}`, name: `S${index}`, requirements: "" }));
    expect(migrateUiState({ customStyles: many }).customStyles).toHaveLength(4);
  });
});
