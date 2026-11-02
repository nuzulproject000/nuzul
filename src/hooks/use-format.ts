import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Currency } from "@/types/models";
import { usePreferences } from "@/stores/preferences.store";
import { convert, formatMoney } from "@/lib/currency";
import { fmtDate, fmtRange } from "@/lib/dates";

/** Money in the guest's display currency, keeping the listing's original available (§55). */
export function useMoney() {
  const currency = usePreferences((s) => s.currency);
  const locale = usePreferences((s) => s.locale);
  return useCallback(
    (amount: number, from: Currency, opts?: { original?: boolean }) => {
      const main = formatMoney(convert(amount, from, currency), currency, locale);
      return opts?.original && from !== currency ? `${main} (${formatMoney(amount, from, locale)})` : main;
    },
    [currency, locale],
  );
}

export function useDates() {
  const { i18n } = useTranslation();
  return { date: (iso: string, p?: string) => fmtDate(iso, p, i18n.language), range: (a: string, b: string) => fmtRange(a, b, i18n.language) };
}
