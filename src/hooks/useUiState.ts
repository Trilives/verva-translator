import { useCallback, useEffect, useRef, useState } from "react";
import { defaultUiState, loadUiState, saveUiState, type UiState } from "../services/uiState";

/**
 * Interface state that survives a restart. Writes are debounced so typing in a
 * free-text field does not hit the store on every keystroke.
 */
export function useUiState(debounce = 400) {
  const [state, setState] = useState<UiState>(defaultUiState);
  const [ready, setReady] = useState(false);
  const timer = useRef<number>();
  const pending = useRef<UiState>();

  useEffect(() => {
    loadUiState()
      .then(setState)
      .catch((error) => console.error("Failed to load interface state", error))
      .finally(() => setReady(true));
  }, []);

  // Flush anything still queued when the window goes away.
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    if (pending.current) void saveUiState(pending.current);
  }, []);

  const patch = useCallback((changes: Partial<UiState>) => {
    setState((current) => {
      const next = { ...current, ...changes };
      pending.current = next;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        pending.current = undefined;
        void saveUiState(next).catch((error) => console.error("Failed to save interface state", error));
      }, debounce);
      return next;
    });
  }, [debounce]);

  return { state, patch, ready };
}
