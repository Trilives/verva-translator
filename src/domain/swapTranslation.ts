import { normalizeLanguageId } from "../i18n/languages";

interface SwapInput {
  source: string;
  target: string;
  customTarget: string;
  detected?: string;
  input: string;
  output: string;
}

/** Keep the selected direction and the two text panes in sync. */
export function swapTranslation({ source, target, customTarget, detected, input, output }: SwapInput) {
  const resolvedTarget = normalizeLanguageId(target === "Custom" ? customTarget : target);
  const nextSource = resolvedTarget && resolvedTarget !== "Custom" ? resolvedTarget : "Auto Detect";
  const previousSource = normalizeLanguageId(source === "Auto Detect" ? detected ?? "" : source);
  const nextTarget = previousSource && previousSource !== "Auto Detect" && previousSource !== "Custom"
    ? previousSource
    : nextSource === "English" ? "Chinese (Simplified)" : "English";

  return { source: nextSource, target: nextTarget, input: output, output: input };
}
