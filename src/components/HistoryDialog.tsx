import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from "@fluentui/react-components";
import { Copy16Regular, Delete16Regular, ArrowUndo16Regular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import type { HistoryEntry } from "../domain/types";
import { clearHistory, listHistory } from "../services/backend";
import { useI18n } from "../i18n/I18nContext";

export function HistoryDialog({ open, onCancel, onRestore }: { open: boolean; onCancel: () => void; onRestore: (entry: HistoryEntry) => void }) {
  const { t } = useI18n(); const [entries, setEntries] = useState<HistoryEntry[]>([]);
  useEffect(() => { if (open) listHistory().then(setEntries); }, [open]);
  const clear = async () => { await clearHistory(); setEntries([]); };
  return <Dialog open={open}><DialogSurface className="history-surface"><DialogBody>
    <DialogTitle>{t("history")} <span className="history-count">{entries.length}/100</span></DialogTitle>
    <DialogContent className="history-list">{entries.length === 0 ? <p>{t("noHistory")}</p> : entries.map((entry) => <article className="history-item" key={entry.id}>
      <div className="history-meta"><span>{entry.sourceLanguage} → {entry.targetLanguage}</span><time>{new Date(entry.createdAt).toLocaleString()}</time></div>
      <p>{entry.sourceText}</p><p className="history-result">{entry.translatedText}</p>
      <div className="history-buttons"><Button size="small" icon={<ArrowUndo16Regular />} onClick={() => { onRestore(entry); onCancel(); }}>{t("restore")}</Button><Button size="small" icon={<Copy16Regular />} onClick={() => navigator.clipboard.writeText(entry.translatedText)}>{t("copy")}</Button></div>
    </article>)}</DialogContent>
    <DialogActions><Button appearance="secondary" onClick={onCancel}>{t("cancel")}</Button><Button appearance="outline" icon={<Delete16Regular />} onClick={clear} disabled={!entries.length}>{t("clearHistory")}</Button></DialogActions>
  </DialogBody></DialogSurface></Dialog>;
}
