import { relaunch } from "@tauri-apps/plugin-process";
import { invoke } from "@tauri-apps/api/core";
import type { UpdateChannel } from "../domain/types";
import { isTauri } from "./runtime";

export interface UpdateResult { available: boolean; version?: string; body?: string; installed?: boolean; }

export async function findUpdate(channel: UpdateChannel): Promise<UpdateResult> {
  if (!isTauri()) return { available: false };
  return invoke<UpdateResult>("check_update", { channel });
}

export async function installUpdate(channel: UpdateChannel, expectedVersion: string): Promise<void> {
  if (!isTauri()) return;
  const result = await invoke<UpdateResult>("install_update", { channel, expectedVersion });
  if (result.installed) await relaunch();
}
