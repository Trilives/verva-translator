import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drives the transient "just did that" state on an action button: the caller
 * gets a `fired` flag it can turn into a checkmark plus a CSS pulse, which
 * clears itself after `duration`.
 */
export function useActionFeedback(duration = 1400) {
  const [fired, setFired] = useState(false);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const trigger = useCallback(() => {
    window.clearTimeout(timer.current);
    setFired(true);
    timer.current = window.setTimeout(() => setFired(false), duration);
  }, [duration]);

  return { fired, trigger };
}
