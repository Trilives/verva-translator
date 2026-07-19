import { useCallback, useState } from "react";
import { useTranslation } from "./useTranslation";

/**
 * Workspace state that outlives the workspace page.
 *
 * `MainPage` unmounts whenever History or Settings is shown. Holding the source
 * text and the translation here keeps a half-written input, a streaming
 * response, and the detected language intact across navigation; the workspace
 * page is a renderer over this state, not its owner.
 *
 * The text still never reaches `settings.json` -- this is memory only, exactly
 * like the long-conversation session.
 */
export function useWorkspace() {
  const translation = useTranslation();
  const [input, setInput] = useState("");

  // Editing the source invalidates a detection that described the old text.
  const changeInput = useCallback((value: string) => {
    setInput(value);
    translation.setDetectedLanguage(undefined);
  }, [translation]);

  const clear = useCallback(() => {
    setInput("");
    translation.setDetectedLanguage(undefined);
  }, [translation]);

  return { input, setInput, changeInput, clear, translation };
}

export type Workspace = ReturnType<typeof useWorkspace>;
