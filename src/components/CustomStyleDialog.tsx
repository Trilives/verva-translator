import {
  Button, Dialog, DialogActions, DialogBody, DialogContent,
  DialogSurface, DialogTitle, Field, Input, Textarea
} from "@fluentui/react-components";
import { useEffect, useState } from "react";
import type { CustomStyle } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";

interface Props {
  /** The style being edited, or undefined while the dialog is closed. */
  value?: CustomStyle;
  /** True when the dialog was opened by Add rather than the pencil. */
  isNew: boolean;
  onSave: (value: CustomStyle) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}

export function CustomStyleDialog({ value, isNew, onSave, onDelete, onCancel }: Props) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [requirements, setRequirements] = useState("");

  useEffect(() => {
    setName(value?.name ?? "");
    setRequirements(value?.requirements ?? "");
  }, [value]);

  if (!value) return null;
  const trimmed = name.trim();

  return <Dialog open onOpenChange={(_, data) => !data.open && onCancel()}>
    <DialogSurface className="custom-style-surface">
      <DialogBody>
        <DialogTitle>{isNew ? t("addStyle") : t("editStyle")}</DialogTitle>
        <DialogContent className="custom-style-content">
          <p className="custom-style-hint">{t("customHint")}</p>
          <Field label={t("styleName")} required>
            <Input value={name} maxLength={24} placeholder={t("styleNamePlaceholder")}
              onChange={(_, d) => setName(d.value)} />
          </Field>
          <Field label={t("styleRequirements")}>
            <Textarea className="custom-style-textarea" resize="none" value={requirements}
              placeholder={t("customPlaceholder")} onChange={(_, d) => setRequirements(d.value)} />
          </Field>
        </DialogContent>
        <DialogActions className="custom-style-actions">
          {!isNew && (
            <Button className="press delete-style" appearance="subtle"
              onClick={() => onDelete(value.id)}>{t("deleteStyle")}</Button>
          )}
          <Button className="press" appearance="secondary" onClick={onCancel}>{t("cancel")}</Button>
          <Button className="press" appearance="primary" disabled={!trimmed}
            onClick={() => onSave({ ...value, name: trimmed, requirements })}>{t("save")}</Button>
        </DialogActions>
      </DialogBody>
    </DialogSurface>
  </Dialog>;
}
