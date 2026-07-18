import { Button, Dropdown, Field, Option } from "@fluentui/react-components";
import { ArrowSwap20Regular } from "@fluentui/react-icons";
import { sourceLanguages, targetLanguages } from "../domain/catalogs";
import { useI18n } from "../i18n/I18nContext";

interface Props {
  source: string; target: string; customTarget: string; detected?: string;
  onSource: (value: string) => void; onTarget: (value: string) => void;
  onCustomTarget: (value: string) => void; onSwap: () => void;
}

export function LanguageBar(props: Props) {
  const { t } = useI18n();
  return <div className="language-bar">
    <Field label={t("source")} className="language-field source-language">
      <Dropdown value={props.source} selectedOptions={[props.source]} onOptionSelect={(_, d) => props.onSource(String(d.optionValue))}>
        {sourceLanguages.map((value) => <Option key={value} value={value}>{value === "Auto Detect" ? t("autoDetect") : value}</Option>)}
      </Dropdown>
    </Field>
    <div className="swap-column">
      {props.source === "Auto Detect" && props.detected && <span className="detected-pill">{t("detected")}: {props.detected}</span>}
      <Button className="swap-button" appearance="subtle" shape="circular" icon={<ArrowSwap20Regular />} aria-label={t("swap")} onClick={props.onSwap} />
    </div>
    <Field label={t("target")} className="language-field">
      <Dropdown value={props.target} selectedOptions={[props.target]} onOptionSelect={(_, d) => props.onTarget(String(d.optionValue))}>
        {targetLanguages.map((value) => <Option key={value} value={value}>{value === "Custom" ? t("custom") : value}</Option>)}
      </Dropdown>
    </Field>
    {props.target === "Custom" && <Field label={t("customLanguage")} className="custom-language"><input className="native-input" value={props.customTarget} onChange={(e) => props.onCustomTarget(e.target.value)} /></Field>}
  </div>;
}
