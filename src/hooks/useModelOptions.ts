import { useCallback, useRef, useState } from "react";
import type { ProviderProfile } from "../domain/types";
import { listModels } from "../services/backend";

/**
 * Lazily discovers the models a profile's endpoint offers, for the header's
 * quick model switch. Each profile is fetched at most once — the result is
 * cached per id, and a failed lookup caches an empty list rather than retrying
 * on every reopen. The current model is always offered by the caller, so an
 * endpoint that returns nothing still leaves the control usable.
 */
export function useModelOptions() {
  const [cache, setCache] = useState<Record<string, string[]>>({});
  const [loadingId, setLoadingId] = useState<string>();
  const requested = useRef<Set<string>>(new Set());

  const load = useCallback((profile: ProviderProfile) => {
    if (requested.current.has(profile.id)) return;
    requested.current.add(profile.id);
    setLoadingId(profile.id);
    void (async () => {
      let models: string[] = [];
      try {
        models = await listModels(profile);
      } catch {
        models = [];
      }
      setCache((c) => ({ ...c, [profile.id]: models }));
      setLoadingId((id) => (id === profile.id ? undefined : id));
    })();
  }, []);

  return { cache, loadingId, load };
}
