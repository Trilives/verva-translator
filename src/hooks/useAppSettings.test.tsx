// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSettings } from "../domain/types";
import { useAppSettings } from "./useAppSettings";

const mocks = vi.hoisted(() => ({ loadSettings: vi.fn(), saveSettings: vi.fn(), hasApiKey: vi.fn() }));
vi.mock("../services/settingsStore", () => ({
  defaultSettings: vi.fn(), loadSettings: mocks.loadSettings, saveSettings: mocks.saveSettings
}));
vi.mock("../services/backend", () => ({ hasApiKey: mocks.hasApiKey }));

const initial: AppSettings = {
  locale: "en", theme: "system", closeBehavior: "ask", updateMode: "manual", updateChannel: "stable",
  activeProfileId: "profile-1",
  profiles: [{ id: "profile-1", name: "Local", kind: "openai", baseUrl: "http://127.0.0.1:11434/v1",
    model: "local-model", thinking: false, longConversation: false, contextLimit: 8192, hasApiKey: false }],
  shortcuts: { translate: "Ctrl+Enter", clear: "Ctrl+L", copy: "Ctrl+Shift+C" }
};

describe("useAppSettings", () => {
  beforeEach(() => {
    mocks.loadSettings.mockReset().mockResolvedValue(initial);
    mocks.saveSettings.mockReset().mockResolvedValue(undefined);
    mocks.hasApiKey.mockReset().mockResolvedValue(false);
  });

  it("preserves rapid functional edits while saving them in order", async () => {
    const { result } = renderHook(() => useAppSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));
    let first: Promise<void>; let second: Promise<void>;
    act(() => {
      first = result.current.update((value) => ({ ...value, theme: "dark" }));
      second = result.current.update((value) => ({ ...value, locale: "zh-CN" }));
    });
    await act(async () => Promise.all([first!, second!]));
    expect(result.current.settings).toMatchObject({ theme: "dark", locale: "zh-CN" });
    expect(mocks.saveSettings.mock.calls.at(-1)?.[0]).toMatchObject({ theme: "dark", locale: "zh-CN" });
  });
});
