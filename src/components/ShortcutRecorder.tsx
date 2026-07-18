import { Button, Field, Tooltip } from "@fluentui/react-components";
import { ArrowResetRegular, KeyboardRegular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18nContext";

/** Keys that only ever act as modifiers, so they cannot be the trigger key. */
const MODIFIERS = new Set(["Control", "Shift", "Alt", "Meta"]);

const pretty = (shortcut: string) => shortcut.split("+").filter(Boolean);

interface Props {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}

/**
 * Click to arm, then press a combination. Recording captures at the window in
 * the capture phase so the app's own shortcut handler cannot fire while the
 * user is choosing one.
 */
export function ShortcutRecorder({ label, value, fallback, onChange }: Props) {
  const { t } = useI18n();
  const [recording, setRecording] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!recording) return;

    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.key === "Escape") { setRecording(false); return; }
      if (MODIFIERS.has(event.key)) return;

      // A bare printable key would fire while the user is typing, so require a
      // modifier for anything that is not a function key.
      const functionKey = /^F\d{1,2}$/.test(event.key);
      if (!functionKey && !event.ctrlKey && !event.altKey && !event.metaKey) return;

      const parts: string[] = [];
      if (event.ctrlKey) parts.push("Ctrl");
      if (event.shiftKey) parts.push("Shift");
      if (event.altKey) parts.push("Alt");
      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
      parts.push(key);

      onChangeRef.current(parts.join("+"));
      setRecording(false);
    };

    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [recording]);

  return <Field label={label} hint={recording ? t("recordingHint") : undefined}>
    <div className="shortcut-row">
      <button
        type="button"
        className={`shortcut-capture press ${recording ? "recording" : ""}`}
        aria-label={`${label}: ${recording ? t("recording") : value}`}
        onClick={() => setRecording((current) => !current)}
        onBlur={() => setRecording(false)}
      >
        {recording
          ? <span className="shortcut-prompt"><KeyboardRegular /> {t("recording")}</span>
          : <span className="shortcut-keys">{pretty(value).map((part) => <kbd key={part}>{part}</kbd>)}</span>}
      </button>
      <Tooltip content={t("resetShortcut")} relationship="label">
        <Button className="press" appearance="subtle" icon={<ArrowResetRegular />}
          aria-label={`${t("resetShortcut")}: ${label}`}
          disabled={value === fallback} onClick={() => onChange(fallback)} />
      </Tooltip>
    </div>
  </Field>;
}
