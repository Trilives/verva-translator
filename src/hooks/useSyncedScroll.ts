import { useEffect, useRef } from "react";

/** The parts of an element this calculation needs, so it can be tested without a DOM. */
export interface ScrollBox {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

/**
 * Where the follower belongs when `from` is at its current position, or null
 * when it should not be moved at all.
 *
 * Null covers the two cases that must not produce a write: a follower with
 * nothing to scroll, and a correction too small to see. The second matters
 * because every write emits another scroll event.
 */
export function followerScrollTop(from: ScrollBox, to: ScrollBox): number | null {
  const fromRange = from.scrollHeight - from.clientHeight;
  const toRange = to.scrollHeight - to.clientHeight;
  if (toRange <= 0) return null;
  const ratio = fromRange > 0 ? from.scrollTop / fromRange : 0;
  const next = Math.min(Math.max(ratio, 0), 1) * toRange;
  return Math.abs(to.scrollTop - next) < 1 ? null : next;
}

/**
 * Keeps the two editors at the same scroll position proportionally: scrolling
 * one a tenth of the way down moves the other a tenth of the way down too.
 *
 * The panes hold the same text in different languages, so they rarely have the
 * same height. Matching a fraction of the scrollable range rather than a pixel
 * offset keeps the two ends aligned regardless of that difference.
 *
 * Listening on the container in the capture phase rather than binding refs to
 * each editor: `scroll` does not bubble, but it is still delivered to ancestors
 * during capture, and this keeps the hook independent of how Fluent forwards a
 * ref into its `textarea` slot.
 */
export function useSyncedScroll<T extends HTMLElement>() {
  const container = useRef<T>(null);
  // While one pane drives, the follower's own scroll events are echoes and must
  // be ignored, or the two feed back into each other and judder.
  const driver = useRef<EventTarget | null>(null);
  const release = useRef<number>();

  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const onScroll = (event: Event) => {
      const from = event.target;
      if (!(from instanceof HTMLTextAreaElement)) return;
      if (driver.current && driver.current !== from) return;

      const panes = [...root.querySelectorAll("textarea")];
      const to = panes.find((pane) => pane !== from);
      if (!to) return;

      const next = followerScrollTop(from, to);
      if (next === null) return;

      driver.current = from;
      to.scrollTop = next;
      window.clearTimeout(release.current);
      release.current = window.setTimeout(() => { driver.current = null; }, 80);
    };

    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.clearTimeout(release.current);
      driver.current = null;
      root.removeEventListener("scroll", onScroll, { capture: true });
    };
  }, []);

  return container;
}
