/* Room selection (§19, §24) — availability, capacity, min stay, room-level policy. */
import { useNavigate } from "react-router-dom";
import { useAuthGate } from "@/components/auth/auth-gate";
import { useTranslation } from "react-i18next";
import { BedDouble, Bath, Ruler, Users } from "lucide-react";
import type { HotelWithMatch } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/common";
import { useMatchProfile } from "@/hooks/queries";
import { useMoney } from "@/hooks/use-format";
import { useSearch, totalGuests } from "@/stores/search.store";
import { bookPath } from "@/app/paths";
import { cn } from "@/lib/utils";

export function RoomsSection({ hotel: h, nights }: { hotel: HotelWithMatch; nights: number }) {
  const { t } = useTranslation();
  const money = useMoney();
  const guests = useSearch((s) => s.guests);
  const { data: profile } = useMatchProfile();
  const gate = useAuthGate();
  const navigate = useNavigate();
  return (
    <section id="sec-rooms">
      <SectionHeading eyebrow={t("hotel.sections.rooms")} title={t("hotel.chooseRoom")} sub={t("hotel.roomsSub", { nights, guests: totalGuests(guests) })} />
      <div className="flex flex-col gap-4">
        {h.rooms.map((r) => {
          const fits = profile?.room === r.type;
          const soldOut = !h.available || r.available === 0;
          const tooShort = nights < r.minStay;
          return (
            <article key={r.id} className={cn("grid grid-cols-[220px_1fr_auto] gap-5 border bg-paper p-3.5 max-lg:grid-cols-[160px_1fr] max-md:grid-cols-1", fits ? "border-gold" : "border-line", soldOut && "opacity-70")}>
              <img src={r.images[0]} alt={r.name} loading="lazy" className="h-full max-h-44 w-full object-cover max-md:h-48" />
              <div className="flex flex-col gap-2">
                {fits && <Badge tone="navy">{t("hotel.fitsPref")}</Badge>}
                <h3 className="m-0 text-lg">{r.name}</h3>
                <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-muted">
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {t("hotel.upTo", { n: r.capacity })}</span>
                  <span className="inline-flex items-center gap-1"><BedDouble className="size-3.5" /> {r.beds}</span>
                  <span className="inline-flex items-center gap-1"><Bath className="size-3.5" /> {t("hotel.bath", { n: r.bathrooms })}</span>
                  <span className="inline-flex items-center gap-1"><Ruler className="size-3.5" /> {r.sizeM2} m²</span>
                </p>
                <ul className="flex flex-wrap gap-1.5">{r.amenities.map((a) => <li key={a} className="rounded-full bg-soft px-2.5 py-1 text-[10px] text-navy">{a}</li>)}</ul>
                <p className="m-0 text-[11px] text-ink-muted">{t(`policy.short.${r.cancellationPolicy}`)} · {t("hotel.minNights", { n: r.minStay })}</p>
                {!soldOut && r.available <= 2 && <b className="text-[11px] text-warn">{t("hotel.onlyLeft", { n: r.available })}</b>}
                {!soldOut && r.available > 2 && <span className="text-[11px] text-success">{t("hotel.nAvailable", { n: r.available })}</span>}
              </div>
              <div className="flex min-w-40 flex-col items-end justify-between gap-3 text-end max-lg:col-span-2 max-lg:flex-row max-lg:items-center max-md:col-span-1">
                <div><b className="block text-xl text-navy">{money(r.nightlyPrice, h.currency)}</b><small className="text-[11px] text-ink-muted">{t("hotel.perNight")}</small>
                  <small className="block text-[11px] text-ink-muted">{t("hotel.forNights", { amount: money(r.nightlyPrice * nights, h.currency), nights })}</small></div>
                {soldOut ? <Button disabled variant="outline" size="sm">{t("hotel.soldOut")}</Button>
                  : <Button size="sm" title={tooShort ? t("hotel.minNights", { n: r.minStay }) : undefined} onClick={() => gate("book", () => navigate(bookPath(h.id, r.id)), bookPath(h.id, r.id))}>{t("hotel.select")}</Button>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
