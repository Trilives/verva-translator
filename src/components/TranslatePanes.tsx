import { Button, Spinner, Textarea, Tooltip } from "@fluentui/react-components";
import {
  ArrowSwap20Regular, Checkmark20Filled, Copy20Regular,
  Delete20Regular, Send20Regular, Stop20Regular
} from "@fluentui/react-icons";
import { useI18n } from "../i18n/I18nContext";
import { useActionFeedback } from "../hooks/useActionFeedback";
import { useSyncedScroll } from "../hooks/useSyncedScroll";
import { LanguageSelect } from "./LanguageSelect";

interface Props {
  source: string; target: string; customTarget: string; detected?: string;
  input: string; output: string; busy: boolean;
  onSource: (v: string) => void; onTarget: (v: string) => void;
  onCustomTarget: (v: string) => void; onSwap: () => void;
  onInput: (v: string) => void; onOutput: (v: string) => void;
  onClear: () => void; onCopy: () => void; onTranslate: () => void; onStop: () => void;
}

export function TranslatePanes(props: Props) {
  const { t } = useI18n();
  const copied = useActionFeedback();
  const panes = useSyncedScroll<HTMLElement>();
  const copy = () => { props.onCopy(); copied.trigger(); };

  return <section className="translate-panes" ref={panes}>
    <div className="pane input-pane">
      <header className="pane-header">
        <LanguageSelect kind="source" value={props.source} detected={props.detected} onChange={props.onSource} />
        <span className="character-count">{props.input.length.toLocaleString()} {t("characters")}</span>
      </header>
      <Textarea className="pane-textarea" resize="none" value={props.input}
        placeholder={t("sourcePlaceholder")} onChange={(_, d) => props.onInput(d.value)} />
      <footer className="pane-actions">
        <Button className="press pane-action-start" appearance="outline" icon={<Delete20Regular />}
          onClick={props.onClear} disabled={!props.input}>{t("clear")}</Button>
        {/* Translate no longer toggles: Stop lives on the pane it interrupts. */}
        <Button className="press translate-button" appearance="primary" icon={<Send20Regular />}
          onClick={props.onTranslate} disabled={props.busy || !props.input.trim()}>{t("translate")}</Button>
      </footer>
    </div>

    <Tooltip content={t("swap")} relationship="label">
      <Button className="swap-button press" appearance="subtle" shape="circular"
        icon={<ArrowSwap20Regular />} aria-label={t("swap")} onClick={props.onSwap} />
    </Tooltip>

    <div className="pane output-pane">
      <header className="pane-header">
        <LanguageSelect kind="target" value={props.target} onChange={props.onTarget} />
        <span className="character-count">
          {props.busy && <Spinner size="extra-tiny" />}
          {props.busy ? t("translating") : `${props.output.length.toLocaleString()} ${t("characters")}`}
        </span>
      </header>
      {props.target === "Custom" && <input className="native-input custom-language" aria-label={t("customLanguage")}
        placeholder={t("customLanguage")} value={props.customTarget} onChange={(e) => props.onCustomTarget(e.target.value)} />}
      <Textarea className="pane-textarea" resize="none" value={props.output}
        placeholder={t("resultPlaceholder")} onChange={(_, d) => props.onOutput(d.value)} />
      <footer className="pane-actions">
        {/* Only present while streaming; Copy stays put whether or not it shows. */}
        {props.busy && (
          <Button className="press pane-action-start stop-button" appearance="outline"
            icon={<Stop20Regular />} onClick={props.onStop}>{t("stop")}</Button>
        )}
        <Button className={`press copy-button ${copied.fired ? "fired" : ""}`} appearance="outline"
          icon={copied.fired ? <Checkmark20Filled /> : <Copy20Regular />}
          onClick={copy} disabled={!props.output}>{copied.fired ? t("copied") : t("copy")}</Button>
      </footer>
    </div>
  </section>;
}
