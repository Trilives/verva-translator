import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Textarea } from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext";

export function CustomStyleDialog({ open, value, onSave, onCancel }: { open: boolean; value: string; onSave: (v: string) => void; onCancel: () => void }) {
  const { t } = useI18n(); const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value, open]);
  return <Dialog open={open}><DialogSurface><DialogBody>
    <DialogTitle>{t("customTitle")}</DialogTitle>
    <DialogContent><Textarea resize="vertical" rows={7} value={draft} placeholder={t("customHint")} onChange={(_, d) => setDraft(d.value)} /></DialogContent>
    <DialogActions><Button appearance="secondary" onClick={onCancel}>{t("cancel")}</Button><Button appearance="primary" onClick={() => onSave(draft)}>{t("save")}</Button></DialogActions>
  </DialogBody></DialogSurface></Dialog>;
}
