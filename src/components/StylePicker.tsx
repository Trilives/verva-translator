import { Tooltip } from "@fluentui/react-components";
import { Add16Regular, Edit16Regular } from "@fluentui/react-icons";
import { Fragment } from "react";
import { builtinStyles, maxCustomStyles } from "../domain/catalogs";
import type { CustomStyle, TranslationStyle } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";

interface Props {
  value: TranslationStyle;
  customStyles: CustomStyle[];
  onChange: (v: TranslationStyle) => void;
  /** Opens the editor for an existing style. */
  onEdit: (id: string) => void;
  onAdd: () => void;
}

interface BubbleProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
  editLabel: string;
}

function StyleBubble({ label, selected, onSelect, onEdit, editLabel }: BubbleProps) {
  return <div className={`style-bubble ${selected ? "selected" : ""}`}>
    {/* data-label feeds the bold ghost that keeps the width stable. */}
    <button type="button" role="radio" aria-checked={selected}
      className="style-bubble-label" data-label={label} onClick={onSelect}>
      {label}
    </button>
    {onEdit && (
      <Tooltip content={editLabel} relationship="label">
        <button type="button" className="edit-style" aria-label={editLabel}
          onClick={(event) => { event.stopPropagation(); onEdit(); }}>
          <Edit16Regular />
        </button>
      </Tooltip>
    )}
  </div>;
}

export function StylePicker({ value, customStyles, onChange, onEdit, onAdd }: Props) {
  const { t } = useI18n();
  const entries = [
    ...builtinStyles.map((style) => ({ id: style, label: t(style), editable: false })),
    ...customStyles.map((style) => ({ id: style.id, label: style.name || t("untitledStyle"), editable: true }))
  ];

  return <section className="style-block">
    <span className="section-label">{t("style")}</span>
    <div className="style-bubbles" role="radiogroup" aria-label={t("style")}>
      {entries.map((entry, index) => (
        <Fragment key={entry.id}>
          {index > 0 && <span className="style-divider" aria-hidden="true" />}
          <StyleBubble label={entry.label} selected={value === entry.id}
            onSelect={() => onChange(entry.id)} editLabel={t("editStyle")}
            onEdit={entry.editable ? () => onEdit(entry.id) : undefined} />
        </Fragment>
      ))}
      {customStyles.length < maxCustomStyles && (
        <Tooltip content={t("addStyle")} relationship="label">
          <button type="button" className="add-style" aria-label={t("addStyle")} onClick={onAdd}>
            <Add16Regular />
            <span>{t("addStyle")}</span>
          </button>
        </Tooltip>
      )}
    </div>
  </section>;
}
