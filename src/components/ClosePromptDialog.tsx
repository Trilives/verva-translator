import {
  Button, Checkbox, Dialog, DialogActions, DialogBody,
  DialogContent, DialogSurface, DialogTitle
} from "@fluentui/react-components";
import { useState } from "react";
import { useI18n } from "../i18n/I18nContext";

interface Props {
  open: boolean;
  onCancel: () => void;
  /** `remember` persists the choice as the new default close behaviour. */
  onChoose: (choice: "tray" | "exit", remember: boolean) => void;
}

export function ClosePromptDialog({ open, onCancel, onChoose }: Props) {
  const { t } = useI18n();
  const [remember, setRemember] = useState(false);

  return <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
    <DialogSurface className="close-prompt-surface">
      <DialogBody>
        <DialogTitle>{t("closeTitle")}</DialogTitle>
        <DialogContent className="close-prompt-content">
          <p>{t("closeQuestion")}</p>
          <Checkbox checked={remember} label={t("rememberChoice")}
            onChange={(_, d) => setRemember(Boolean(d.checked))} />
        </DialogContent>
        <DialogActions>
          <Button className="press" appearance="secondary" onClick={onCancel}>{t("cancel")}</Button>
          <Button className="press" appearance="outline" onClick={() => onChoose("exit", remember)}>{t("quitApp")}</Button>
          <Button className="press" appearance="primary" onClick={() => onChoose("tray", remember)}>{t("minimizeToTray")}</Button>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>;
}
