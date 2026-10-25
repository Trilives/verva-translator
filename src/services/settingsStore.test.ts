// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { LOCAL_OLLAMA_ID } from "../domain/localOllama";
import { loadSettings } from "./settingsStore";

vi.mock("./runtime", () => ({ isTauri: () => false }));

beforeEach(() => localStorage.clear());

it("loads old per-model Ollama settings as one fixed local configuration", async () => {
  localStorage.setItem("app-settings", JSON.stringify({
    updateMode: "manual", activeProfileId: "old-local", profiles: [
      { id: "old-local", name: "Local · gemma3:1b-it-q4_K_M", kind: "openai",
        baseUrl: "http://127.0.0.1:11434/v1", model: "gemma3:1b-it-q4_K_M",
        thinking: "off", longConversation: false, contextLimit: 32768 }
    ]
  }));
  const settings = await loadSettings();
  expect(settings.activeProfileId).toBe(LOCAL_OLLAMA_ID);
  expect(settings.profiles).toHaveLength(1);
  expect(settings.profiles[0]).toMatchObject({ kind: "ollama", model: "gemma3:1b-it-q4_K_M" });
  expect(settings).not.toHaveProperty("updateMode");
});
