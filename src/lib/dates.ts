import { addDays, differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { ar, enGB } from "date-fns/locale";

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");
export const nightsBetween = (checkIn?: string, checkOut?: string) => {
  if (!checkIn || !checkOut) return 0;
  const a = parseISO(checkIn), b = parseISO(checkOut);
  return isValid(a) && isValid(b) ? Math.max(0, differenceInCalendarDays(b, a)) : 0;
};
export const fmtDate = (iso: string, pattern = "d MMM", locale = "en") => {
  const d = parseISO(iso);
  return isValid(d) ? format(d, pattern, { locale: locale === "ar" ? ar : enGB }) : iso;
};
export const fmtRange = (a: string, b: string, locale = "en") => `${fmtDate(a, "d MMM", locale)} – ${fmtDate(b, "d MMM", locale)}`;
export const daysUntil = (iso: string, from = new Date()) => differenceInCalendarDays(parseISO(iso), from);
export const defaultStay = () => { const a = addDays(new Date(), 30); return { checkIn: toISODate(a), checkOut: toISODate(addDays(a, 3)) }; };
