import { Button, Spinner, Textarea } from "@fluentui/react-components";
import { Copy20Regular, Delete20Regular, Send20Regular, Stop20Regular } from "@fluentui/react-icons";
import { useI18n } from "../i18n/I18nContext";

interface Props { input: string; output: string; busy: boolean; onInput: (v: string) => void; onOutput: (v: string) => void; onClear: () => void; onCopy: () => void; onTranslate: () => void; onStop: () => void; }

export function EditorPane(props: Props) {
  const { t } = useI18n();
  return <div className="editor-grid">
    <section className="editor-card input-card">
      <header className="editor-card-header"><div><span className="pane-kicker">{t("sourceText")}</span><strong>{t("writeOrPaste")}</strong></div><span className="character-count">{props.input.length.toLocaleString()} {t("characters")}</span></header>
      <Textarea className="editor-textarea" resize="vertical" value={props.input} placeholder={t("sourcePlaceholder")} onChange={(_, d) => props.onInput(d.value)} />
      <div className="editor-actions left-actions">
        <Button appearance="outline" icon={<Delete20Regular />} onClick={props.onClear}>{t("clear")}</Button>
        <Button appearance="primary" icon={props.busy ? <Stop20Regular /> : <Send20Regular />} onClick={props.busy ? props.onStop : props.onTranslate} disabled={!props.busy && !props.input.trim()}>
          {props.busy ? t("stop") : t("translate")}
        </Button>
      </div>
    </section>
    <section className="editor-card output-card">
      <header className="editor-card-header"><div><span className="pane-kicker">{t("translatedText")}</span><strong>{props.busy ? t("translating") : t("result")}</strong></div><span className="character-count">{props.output.length.toLocaleString()} {t("characters")}</span></header>
      {props.busy && <div className="stream-status"><Spinner size="tiny" /> {t("translating")}</div>}
      <Textarea className="editor-textarea" resize="vertical" value={props.output} placeholder={t("resultPlaceholder")} onChange={(_, d) => props.onOutput(d.value)} />
      <div className="editor-actions"><Button appearance="outline" icon={<Copy20Regular />} onClick={props.onCopy} disabled={!props.output}>{t("copy")}</Button></div>
    </section>
  </div>;
}
