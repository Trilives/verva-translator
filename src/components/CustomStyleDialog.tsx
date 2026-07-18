import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, Textarea
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n/I18nContext";

interface Props { open: boolean; value: string; onSave: (v: string) => void; onCancel: () => void }

export function CustomStyleDialog({ open, value, onSave, onCancel }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value, open]);

  return <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
    <DialogSurface className="custom-style-surface">
      <DialogBody>
        <DialogTitle>{t("customTitle")}</DialogTitle>
        <DialogContent className="custom-style-content">
          <p className="custom-style-hint">{t("customHint")}</p>
          <Textarea className="custom-style-textarea" resize="none" value={draft}
            placeholder={t("customPlaceholder")} onChange={(_, d) => setDraft(d.value)} />
        </DialogContent>
        <DialogActions>
          <Button className="press" appearance="secondary" onClick={onCancel}>{t("cancel")}</Button>
          <Button className="press" appearance="primary" onClick={() => onSave(draft)}>{t("save")}</Button>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>;
}
