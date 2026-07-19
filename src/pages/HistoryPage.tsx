import { Button } from "@fluentui/react-components";
import { ArrowUndo16Regular, Checkmark16Filled, Copy16Regular, Delete16Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import type { HistoryEntry } from "../domain/types";
import { clearHistory, listHistory } from "../services/backend";
import { useI18n } from "../i18n/I18nContext";
import { useActionFeedback } from "../hooks/useActionFeedback";

function HistoryCard({ entry, onRestore }: { entry: HistoryEntry; onRestore: (entry: HistoryEntry) => void }) {
  const { t, language } = useI18n();
  const copied = useActionFeedback();
  const copy = () => { navigator.clipboard.writeText(entry.translatedText); copied.trigger(); };

  return <article className="history-item">
    <div className="history-meta">
      {/* Stored entries keep canonical identifiers; only the display localizes. */}
      <span>{language(entry.sourceLanguage)} → {language(entry.targetLanguage)}</span>
      <time>{new Date(entry.createdAt).toLocaleString()}</time>
    </div>
    <p>{entry.sourceText}</p>
    <p className="history-result">{entry.translatedText}</p>
    <div className="history-buttons">
      <Button className="press" size="small" icon={<ArrowUndo16Regular />} onClick={() => onRestore(entry)}>{t("restore")}</Button>
      <Button className={`press copy-button ${copied.fired ? "fired" : ""}`} size="small"
        icon={copied.fired ? <Checkmark16Filled /> : <Copy16Regular />} onClick={copy}>
        {copied.fired ? t("copied") : t("copy")}
      </Button>
    </div>
  </article>;
}

export function HistoryPage({ onRestore }: { onRestore: (entry: HistoryEntry) => void }) {
  const { t } = useI18n();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  useEffect(() => { listHistory().then(setEntries); }, []);
  const clear = async () => { await clearHistory(); setEntries([]); };

  return <div className="history-view">
    <header className="page-header">
      <div>
        <h1>{t("history")}</h1>
        <p>{t("historySubtitle")}</p>
      </div>
      <div className="header-tools">
        <span className="history-count">{entries.length}/100</span>
        <Button className="press" appearance="outline" icon={<Delete16Regular />} onClick={clear} disabled={!entries.length}>
          {t("clearHistory")}
        </Button>
      </div>
    </header>
    <section className="history-list">
      {entries.length === 0
        ? <p className="empty-note">{t("noHistory")}</p>
        : entries.map((entry) => <HistoryCard key={entry.id} entry={entry} onRestore={onRestore} />)}
    </section>
  </div>;
}
