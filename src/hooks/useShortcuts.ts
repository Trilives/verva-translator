import { useEffect } from "react";
import type { ShortcutSettings } from "../domain/types";

function matches(event: KeyboardEvent, shortcut: string) {
  const parts = shortcut.toLowerCase().split("+");
  const key = parts.at(-1);
  return event.key.toLowerCase() === key && event.ctrlKey === parts.includes("ctrl")
    && event.shiftKey === parts.includes("shift") && event.altKey === parts.includes("alt");
}

export function useShortcuts(shortcuts: ShortcutSettings, actions: { translate: () => void; clear: () => void; copy: () => void }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      for (const action of ["translate", "clear", "copy"] as const) {
        if (matches(event, shortcuts[action])) { event.preventDefault(); actions[action](); return; }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions, shortcuts]);
}
