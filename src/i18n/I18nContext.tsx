import { createContext, useContext } from "react";
import { messages, type MessageKey } from "./messages";
import type { UiLocale } from "../domain/types";

interface I18nValue { locale: UiLocale; t: (key: MessageKey) => string; }
const I18nContext = createContext<I18nValue>({ locale: "en", t: (key) => messages.en[key] });

export function I18nProvider({ locale, children }: { locale: UiLocale; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: (key) => messages[locale][key] }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
