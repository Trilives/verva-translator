import { Dropdown, Option } from "@fluentui/react-components";
import { sourceLanguages, targetLanguages } from "../domain/catalogs";
import { useI18n } from "../i18n/I18nContext";

interface Props {
  kind: "source" | "target";
  value: string;
  detected?: string;
  onChange: (value: string) => void;
}

export function LanguageSelect({ kind, value, detected, onChange }: Props) {
  const { t } = useI18n();
  const options = kind === "source" ? sourceLanguages : targetLanguages;
  const label = (option: string) =>
    option === "Auto Detect" ? t("autoDetect") : option === "Custom" ? t("custom") : option;

  return <div className="language-select">
    <span className="section-label">
      {t(kind)}
      {kind === "source" && value === "Auto Detect" && detected && (
        <span className="detected-pill">{t("detected")}: {detected}</span>
      )}
    </span>
    <Dropdown
      className="language-dropdown"
      aria-label={t(kind)}
      value={label(value)}
      selectedOptions={[value]}
      onOptionSelect={(_, data) => onChange(String(data.optionValue))}
    >
      {options.map((option) => <Option key={option} value={option}>{label(option)}</Option>)}
    </Dropdown>
  </div>;
}
