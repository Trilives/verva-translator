import { Button, Spinner, Textarea } from "@fluentui/react-components";
import { Copy20Regular, Delete20Regular, Send20Regular, Stop20Regular } from "@fluentui/react-icons";
import { useI18n } from "../i18n/I18nContext";

interface Props { input: string; output: string; busy: boolean; onInput: (v: string) => void; onOutput: (v: string) => void; onClear: () => void; onCopy: () => void; onTranslate: () => void; onStop: () => void; }

export function EditorPane(props: Props) {
  const { t } = useI18n();
  return <div className="editor-grid">
    <section className="editor-card input-card">
      <Textarea className="editor-textarea" resize="vertical" value={props.input} placeholder={t("sourcePlaceholder")} onChange={(_, d) => props.onInput(d.value)} />
      <div className="editor-actions left-actions">
        <Button appearance="outline" icon={<Delete20Regular />} onClick={props.onClear}>{t("clear")}</Button>
        <Button appearance="primary" icon={props.busy ? <Stop20Regular /> : <Send20Regular />} onClick={props.busy ? props.onStop : props.onTranslate} disabled={!props.busy && !props.input.trim()}>
          {props.busy ? t("stop") : t("translate")}
        </Button>
      </div>
    </section>
    <section className="editor-card output-card">
      {props.busy && <div className="stream-status"><Spinner size="tiny" /> Streaming</div>}
      <Textarea className="editor-textarea" resize="vertical" value={props.output} placeholder={t("resultPlaceholder")} onChange={(_, d) => props.onOutput(d.value)} />
      <div className="editor-actions"><Button appearance="outline" icon={<Copy20Regular />} onClick={props.onCopy} disabled={!props.output}>{t("copy")}</Button></div>
    </section>
  </div>;
}
