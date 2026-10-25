import { expect, it } from "vitest";
import type { AppSettings } from "./types";
import { ensureLocalOllama, LOCAL_OLLAMA_ID, LOCAL_OLLAMA_URL } from "./localOllama";

it("migrates old per-model local profiles into one fixed Ollama configuration", () => {
  const settings = { activeProfileId: "old-2", profiles: [
    { id: "remote", name: "API", kind: "openai", baseUrl: "https://api.example/v1", model: "remote" },
    { id: "old-1", name: "Local · gemma3:1b", kind: "openai", baseUrl: `${LOCAL_OLLAMA_URL}/v1`, model: "gemma3:1b" },
    { id: "old-2", name: "Local · qwen3.5:0.8b", kind: "openai", baseUrl: `${LOCAL_OLLAMA_URL}/v1`, model: "qwen3.5:0.8b" }
  ] } as AppSettings;
  const migrated = ensureLocalOllama(settings);
  expect(migrated.activeProfileId).toBe(LOCAL_OLLAMA_ID);
  expect(migrated.profiles.map((profile) => profile.id)).toEqual(["remote", LOCAL_OLLAMA_ID]);
  expect(migrated.profiles[1]).toMatchObject({ kind: "ollama", model: "qwen3.5:0.8b", baseUrl: LOCAL_OLLAMA_URL, thinking: "off" });
  expect(ensureLocalOllama(migrated).profiles).toEqual(migrated.profiles);
});
