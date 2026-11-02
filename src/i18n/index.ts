import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import ar from "./locales/ar";
import { usePreferences } from "@/stores/preferences.store";

/** i18next setup (§56). Locale is owned by the preferences store; this keeps
 * <html lang/dir> and i18next in sync with it. Add a language by adding a file. */
export const SUPPORTED_LOCALES = { en: { dir: "ltr" }, ar: { dir: "rtl" } } as const;

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: usePreferences.getState().locale,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnObjects: false,
});

export function applyLocale(locale: keyof typeof SUPPORTED_LOCALES) {
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = SUPPORTED_LOCALES[locale].dir;
}

applyLocale(usePreferences.getState().locale);
usePreferences.subscribe((s, prev) => { if (s.locale !== prev.locale) applyLocale(s.locale); });

export default i18n;
