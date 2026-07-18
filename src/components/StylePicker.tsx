import { Button, Tooltip } from "@fluentui/react-components";
import { Checkmark16Filled, Edit16Regular } from "@fluentui/react-icons";
import { styles } from "../domain/catalogs";
import type { TranslationStyle } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";

export function StylePicker({ value, onChange, onEditCustom }: { value: TranslationStyle; onChange: (v: TranslationStyle) => void; onEditCustom: () => void }) {
  const { t } = useI18n();
  return <section className="style-section"><span className="section-label">{t("style")}</span><div className="style-grid">
    {styles.map((style) => <Button key={style} className={`style-card ${value === style ? "selected" : ""}`} appearance="subtle" onClick={() => onChange(style)}>
      <span>{value === style && <Checkmark16Filled />}{t(style)}</span>
      {style === "custom" && <Tooltip content={t("editCustom")} relationship="label"><span className="edit-style" role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); onEditCustom(); }} onKeyDown={(e) => e.key === "Enter" && onEditCustom()}><Edit16Regular /></span></Tooltip>}
    </Button>)}
  </div></section>;
}
