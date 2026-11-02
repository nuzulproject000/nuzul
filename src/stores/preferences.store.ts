import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DisplayCurrency, Locale } from "@/types/models";

/** UI preferences that persist on this device (§55–56). */
type PreferencesState = {
  locale: Locale;
  currency: DisplayCurrency;
  setLocale: (l: Locale) => void;
  setCurrency: (c: DisplayCurrency) => void;
  /** Privacy toggles (§56). Mirrored to the account service once it exists. */
  useLocation: boolean;
  personalised: boolean;
  setPrivacy: (p: Partial<Pick<PreferencesState, "useLocation" | "personalised">>) => void;
};

export const usePreferences = create<PreferencesState>()(
  persist((set) => ({ locale: "en", currency: "EGP", setLocale: (locale) => set({ locale }), setCurrency: (currency) => set({ currency }), useLocation: true, personalised: true, setPrivacy: (p) => set(p) }), { name: "nuzul.preferences" }),
);
