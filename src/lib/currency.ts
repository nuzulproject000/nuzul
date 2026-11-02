import type { Currency, DisplayCurrency } from "@/types/models";

/** Illustrative rates to EGP. In production these come from the rates service (Admin → Settings). */
export const RATES_TO_EGP: Record<Currency, number> = { EGP: 1, USD: 48.5, EUR: 52.6, GBP: 61.8, AED: 13.2 };

export const toEGP = (amount: number, from: Currency) => Math.round(amount * RATES_TO_EGP[from]);

export function convert(amount: number, from: Currency, to: Currency) {
  return Math.round((amount * RATES_TO_EGP[from]) / RATES_TO_EGP[to]);
}

export function formatMoney(amount: number, currency: Currency, locale: string = "en") {
  const value = Math.round(amount).toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
  return `${currency} ${value}`;
}

/** Display in the guest's currency while keeping the listing's original currency available (§55). */
export function displayMoney(amount: number, from: Currency, display: DisplayCurrency, locale = "en") {
  return formatMoney(convert(amount, from, display), display, locale);
}
