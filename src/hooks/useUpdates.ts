import { useCallback, useEffect, useRef, useState } from "react";
import type { AppSettings } from "../domain/types";
import { detectInstallMode } from "../services/backend";
import { findUpdate, installUpdate, type UpdateResult } from "../services/updater";

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function useUpdates(channel: AppSettings["updateChannel"] | undefined) {
  const [available, setAvailable] = useState<UpdateResult>();
  const [status, setStatus] = useState("");
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installMode, setInstallMode] = useState<"installed" | "portable">();
  const lastCheck = useRef(0);
  const inFlight = useRef(false);
  const activeChannel = useRef(channel);
  activeChannel.current = channel;

  useEffect(() => { void detectInstallMode().then((value) => setInstallMode(value === "installed" ? "installed" : "portable"))
    .catch(() => setInstallMode("portable")); }, []);

  const check = useCallback(async (silent = false) => {
    if (!channel || inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    if (!silent) setStatus("checking");
    try {
      const result = await findUpdate(channel);
      if (activeChannel.current !== channel) return;
      setAvailable(result.available ? result : undefined);
      lastCheck.current = Date.now();
      if (!silent) setStatus(result.available ? "available" : "current");
    } catch (error) {
      if (!silent) setStatus(String(error));
    } finally { inFlight.current = false; setChecking(false); }
  }, [channel]);

  useEffect(() => {
    setAvailable(undefined);
    setStatus("");
    if (!channel) return;
    void check(true);
    const timer = window.setInterval(() => void check(true), CHECK_INTERVAL_MS);
    const onFocus = () => {
      if (Date.now() - lastCheck.current >= CHECK_INTERVAL_MS) void check(true);
    };
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [channel, check]);

  const install = useCallback(async () => {
    if (!channel || installMode !== "installed" || !available?.available || !available.version) return;
    setInstalling(true); setStatus("installing");
    try { await installUpdate(channel, available.version); }
    catch (error) { setStatus(String(error)); }
    finally { setInstalling(false); }
  }, [channel, installMode, available]);

  return { available, status, checking, installing, portable: installMode === "portable", canInstall: installMode === "installed", check, install };
}
