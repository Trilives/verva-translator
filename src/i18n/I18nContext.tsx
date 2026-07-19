import { createContext, useContext } from "react";
import { messages, type MessageKey } from "./messages";
import { languageLabel } from "./languages";
import type { UiLocale } from "../domain/types";

interface I18nValue {
  locale: UiLocale;
  t: (key: MessageKey) => string;
  /** Localized label for a language identifier; the identifier stays English. */
  language: (value: string) => string;
}

const I18nContext = createContext<I18nValue>({
  locale: "en",
  t: (key) => messages.en[key],
  language: (value) => languageLabel("en", value)
});

export function I18nProvider({ locale, children }: { locale: UiLocale; children: React.ReactNode }) {
  const value: I18nValue = {
    locale,
    t: (key) => messages[locale][key],
    language: (name) => languageLabel(locale, name)
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
