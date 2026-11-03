/* Sticky booking card (§28, §30). Desktop: sidebar. Mobile: fixed bottom bar. */
import { useAuthGate } from "@/components/auth/auth-gate";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, ShieldCheck, Zap } from "lucide-react";
import { parseISO } from "date-fns";
import type { HotelWithMatch } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlay";
import { Counter, Rating } from "@/components/common";
import { MatchPill } from "@/components/match";
import { useMatchProfile } from "@/hooks/queries";
import { useDates, useMoney } from "@/hooks/use-format";
import { useSearch, totalGuests } from "@/stores/search.store";
import { computePrice } from "@/lib/pricing";
import { nightsBetween, toISODate } from "@/lib/dates";
import { bookPath } from "@/app/paths";

export function PriceLines({ nightly, nights, rooms, currency, longStayPct }: { nightly: number; nights: number; rooms: number; currency: HotelWithMatch["currency"]; longStayPct: number }) {
  const { t } = useTranslation();
  const money = useMoney();
  const p = computePrice(nightly, nights, { rooms, longStayPct });
  const rows: [string, number][] = [[t("booking.roomLine", { nightly: money(nightly * rooms, currency), nights }), p.room], [t("booking.cleaning"), p.cleaning], [t("booking.service"), p.service], [t("booking.taxes"), p.taxes]];
  return (
    <dl className="m-0 text-[13px]">
      {rows.map(([k, v]) => <div key={k} className="flex justify-between py-1.5 text-charcoal"><dt>{k}</dt><dd className="m-0">{money(v, currency)}</dd></div>)}
      {p.discount > 0 && <div className="flex justify-between py-1.5 text-success"><dt>{t("booking.discount")}</dt><dd className="m-0">−{money(p.discount, currency)}</dd></div>}
      <div className="mt-2 flex justify-between border-t border-line pt-3 text-base font-bold text-navy"><dt>{t("booking.total")}</dt><dd className="m-0">{money(p.total, currency, { original: true })}</dd></div>
    </dl>
  );
}

export function BookingCard({ hotel: h, onChooseRoom }: { hotel: HotelWithMatch; onChooseRoom: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const money = useMoney();
  const { range } = useDates();
  const s = useSearch();
  const { data: profile } = useMatchProfile();
  const preferred = useMemo(() => h.rooms.find((r) => r.type === profile?.room && r.available > 0) ?? h.rooms.find((r) => r.available > 0) ?? h.rooms[0], [h.rooms, profile?.room]);
  const [roomId, setRoomId] = useState<string>();
  const room = h.rooms.find((r) => r.id === roomId) ?? preferred;
  const nights = nightsBetween(s.checkIn, s.checkOut);
  const soldOut = !h.available || room.available === 0;
  const gate = useAuthGate();
  const book = () => gate("book", () => navigate(bookPath(h.id, room.id)), bookPath(h.id, room.id));

  return (
    <>
      <aside aria-label={t("hotel.chooseARoom")} className="sticky top-[150px] self-start border border-line bg-paper p-6 shadow-card max-md:hidden">
        <div className="flex items-baseline justify-between gap-2"><span><b className="text-2xl text-navy">{money(room.nightlyPrice, h.currency)}</b> <small className="text-[12px] text-ink-muted">{t("common.perNight")}</small></span><Rating rating={h.rating} reviews={h.reviewCount} compact /></div>
        <div className="mt-2"><MatchPill score={h.match.score} hotelId={h.id} /></div>

        <div className="mt-5 grid grid-cols-2 border border-line">
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="col-span-2 flex items-center gap-2 border-b border-line px-3.5 py-3 text-start text-[12px] text-navy"><CalendarDays className="size-4 text-gold" /><span className="flex flex-col"><small className="text-[9px] font-bold tracking-[0.12em] text-ink-muted uppercase">{t("search.dates")}</small>{range(s.checkIn, s.checkOut)} · {t("common.night", { count: nights })}</span></button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto">
              <Calendar mode="range" numberOfMonths={1} disabled={{ before: new Date() }} selected={{ from: parseISO(s.checkIn), to: parseISO(s.checkOut) }} onSelect={(r) => r?.from && s.set({ checkIn: toISODate(r.from), checkOut: toISODate(r.to ?? r.from) })} />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="col-span-2 px-3.5 py-3 text-start text-[12px] text-navy"><small className="block text-[9px] font-bold tracking-[0.12em] text-ink-muted uppercase">{t("search.who")}</small>{t("common.guest", { count: totalGuests(s.guests) })} · {t("common.room", { count: s.guests.rooms })}</button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <Counter label={t("search.adults")} sub={t("search.adultsSub")} value={s.guests.adults} min={1} onChange={(v) => s.set({ guests: { ...s.guests, adults: v } })} />
              <Counter label={t("search.children")} sub={t("search.childrenSub")} value={s.guests.children} onChange={(v) => s.set({ guests: { ...s.guests, children: v } })} />
              <Counter label={t("search.rooms")} value={s.guests.rooms} min={1} max={8} onChange={(v) => s.set({ guests: { ...s.guests, rooms: v } })} />
            </PopoverContent>
          </Popover>
        </div>
        <label className="mt-3 flex flex-col gap-1.5 text-[11px] font-bold text-navy" htmlFor="bc-room">{t("booking.steps.room")}
          <Select id="bc-room" value={room.id} onValueChange={setRoomId} options={h.rooms.map((r) => ({ value: r.id, label: `${r.name} · ${money(r.nightlyPrice, h.currency)}${r.available === 0 ? ` · ${t("hotel.soldOut")}` : ""}` }))} />
        </label>

        <div className="mt-5">{nights > 0 && <PriceLines nightly={room.nightlyPrice} nights={nights} rooms={s.guests.rooms} currency={h.currency} longStayPct={h.monthlyDiscountPct} />}</div>
        <Button className="mt-5 w-full" size="lg" disabled={soldOut || nights < 1} onClick={book}>{soldOut ? t("hotel.soldOutDates") : t("hotel.chooseARoom")}</Button>
        <Button variant="text" className="mt-1 w-full" onClick={onChooseRoom}>{t("hotel.sections.rooms")}</Button>
        <p className="mt-3 flex items-start gap-2 text-[11px] text-ink-muted">{h.instantBook ? <Zap className="size-3.5 shrink-0 text-gold" /> : <ShieldCheck className="size-3.5 shrink-0 text-gold" />}{h.instantBook ? t("hotel.instant") : t("hotel.confirms")}</p>
        <p className="mt-1 text-[11px] text-ink-muted">{t(`policy.short.${room.cancellationPolicy}`)}</p>
      </aside>

      <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 border-t border-line bg-paper px-4 py-3 md:hidden">
        <span className="flex flex-col"><b className="text-navy">{money(room.nightlyPrice, h.currency)} <small className="font-normal text-ink-muted">{t("common.perNight")}</small></b><small className="text-[11px] text-ink-muted">{range(s.checkIn, s.checkOut)} · {t("common.night", { count: nights })}</small></span>
        <Button disabled={soldOut} onClick={book}>{soldOut ? t("hotel.soldOut") : t("hotel.chooseARoom")}</Button>
      </div>
    </>
  );
}
