import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoryEntry, SessionInfo, TranslationRequest } from "../domain/types";
import { cancelTranslation, onTranslationChunk, startTranslation } from "../services/backend";

interface StartArgs extends Omit<TranslationRequest, "requestId" | "sessionId"> { contextLimit: number; longConversation: boolean; }

export function useTranslation() {
  const [output, setOutput] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<SessionInfo>();
  const requestId = useRef<string>();
  const outputRef = useRef("");
  const frame = useRef<number>();

  useEffect(() => {
    let unlisten = () => {};
    onTranslationChunk((chunk) => {
      if (chunk.requestId !== requestId.current) return;
      if (chunk.text) outputRef.current += chunk.text;
      if (!frame.current) frame.current = requestAnimationFrame(() => { setOutput(outputRef.current); frame.current = undefined; });
      if (chunk.detectedLanguage) setDetectedLanguage(chunk.detectedLanguage);
      if (chunk.inputTokens) setSession((current) => current ? { ...current, usedTokens: chunk.inputTokens! } : current);
      if (chunk.error) setError(chunk.error);
      if (chunk.done) setBusy(false);
    }).then((off) => { unlisten = off; });
    return () => { unlisten(); if (frame.current) cancelAnimationFrame(frame.current); };
  }, []);

  const start = useCallback(async (args: StartArgs) => {
    const id = crypto.randomUUID();
    const nextSession = args.longConversation
      ? session ?? { id: crypto.randomUUID(), startedAt: new Date().toISOString(), usedTokens: 0, limit: args.contextLimit }
      : undefined;
    if (nextSession) setSession(nextSession);
    requestId.current = id; outputRef.current = ""; setOutput(""); setError(undefined); setBusy(true);
    try {
      const { contextLimit: _contextLimit, longConversation: _longConversation, ...request } = args;
      await startTranslation({ ...request, requestId: id, sessionId: nextSession?.id });
    } catch (reason) { setError(String(reason)); setBusy(false); }
  }, [session]);

  const stop = useCallback(async () => {
    if (requestId.current) await cancelTranslation(requestId.current);
    setBusy(false);
  }, []);

  const refreshSession = () => setSession(undefined);
  const restore = (entry: HistoryEntry) => { setOutput(entry.translatedText); outputRef.current = entry.translatedText; };
  const editOutput = (value: string) => { outputRef.current = value; setOutput(value); };
  return { output, setOutput: editOutput, detectedLanguage, setDetectedLanguage, busy, error, session, start, stop, refreshSession, restore };
}
