import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import type { UpdateChannel } from "../domain/types";
import { detectInstallMode } from "./backend";
import { isTauri } from "./runtime";

export interface UpdateResult { available: boolean; version?: string; body?: string; installed?: boolean; }

export async function checkForUpdate(channel: UpdateChannel, install: boolean): Promise<UpdateResult> {
  if (!isTauri()) return { available: false };
  const mode = await detectInstallMode();
  const result = await invoke<UpdateResult>("check_update", { channel, install: install && mode === "installed" });
  if (result.installed) await relaunch();
  return result;
}
