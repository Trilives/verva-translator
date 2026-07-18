import { Tooltip } from "@fluentui/react-components";
import { Edit16Regular } from "@fluentui/react-icons";
import { Fragment } from "react";
import { styles } from "../domain/catalogs";
import type { TranslationStyle } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";

interface Props { value: TranslationStyle; onChange: (v: TranslationStyle) => void; onEditCustom: () => void }

export function StylePicker({ value, onChange, onEditCustom }: Props) {
  const { t } = useI18n();

  return <section className="style-block">
    <span className="section-label">{t("style")}</span>
    <div className="style-bubbles" role="radiogroup" aria-label={t("style")}>
      {styles.map((style, index) => (
        <Fragment key={style}>
          {index > 0 && <span className="style-divider" aria-hidden="true" />}
          <div className={`style-bubble ${value === style ? "selected" : ""}`}>
            {/* data-label feeds the bold ghost that keeps the width stable. */}
            <button type="button" role="radio" aria-checked={value === style}
              className="style-bubble-label" data-label={t(style)} onClick={() => onChange(style)}>
              {t(style)}
            </button>
            {style === "custom" && (
              <Tooltip content={t("editCustom")} relationship="label">
                <button type="button" className="edit-style" aria-label={t("editCustom")}
                  onClick={(event) => { event.stopPropagation(); onEditCustom(); }}>
                  <Edit16Regular />
                </button>
              </Tooltip>
            )}
          </div>
        </Fragment>
      ))}
    </div>
  </section>;
}
