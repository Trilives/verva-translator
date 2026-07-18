import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from "@fluentui/react-components";
import { useI18n } from "../i18n/I18nContext";

export function UpdateDialog({ version, body, portable, onInstall, onCancel }: { version: string; body?: string; portable: boolean; onInstall: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  return <Dialog open><DialogSurface><DialogBody><DialogTitle>{t("updates")} · {version}</DialogTitle>
    <DialogContent><p>{body || `Verva Translate ${version} is ready.`}</p>{portable && <p>{t("portableNotice")}</p>}</DialogContent>
    <DialogActions><Button appearance="secondary" onClick={onCancel}>{t("cancel")}</Button><Button appearance="primary" onClick={onInstall}>{portable ? t("checkUpdates") : t("automatic")}</Button></DialogActions>
  </DialogBody></DialogSurface></Dialog>;
}
