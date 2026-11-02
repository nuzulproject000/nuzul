/* Reservation detail (§32–33, §63) with the booking state timeline. */
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Check, Download, MessageCircle, TriangleAlert } from "lucide-react";
import type { BookingState } from "@/types/models";
import { Button } from "@/components/ui/button";
import { BookingStateBadge, ErrorState } from "@/components/common";
import { useBooking, useConversations, useHotel } from "@/hooks/queries";
import { useDates, useMoney } from "@/hooks/use-format";
import { downloadReceipt } from "@/lib/receipt";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";
import { PriceBreakdownTable } from "./price-breakdown";
import { TripDialogs, type TripDialog } from "./trip-dialogs";
import { tabOf } from "./trip-state";

const FLOW: BookingState[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED"];

export default function TripDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const money = useMoney();
  const { date } = useDates();
  const { data: b, error, refetch } = useBooking(id);
  const { data: h } = useHotel(b?.hotelId ?? "");
  const { data: convos } = useConversations();
  const [dialog, setDialog] = useState<TripDialog | null>(null);
  if (error) return <div className="container-page py-20"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  if (!b || !h) return <div className="container-page py-12"><div className="skeleton h-[480px]" /></div>;
  const room = h.rooms.find((r) => r.id === b.roomId);
  const alt = !FLOW.includes(b.state);
  const idx = FLOW.indexOf(b.state);
  const tab = tabOf(b.state);
  const convo = convos?.find((c) => c.hotelId === h.id);
  const cells: [string, string, string][] = [
    [t("trips.hotel"), h.name, `${h.area}, ${h.city}`],
    [t("trips.room"), room?.name ?? "", `${t("common.guest", { count: b.guests.adults + b.guests.children })} · ${t("common.room", { count: b.guests.rooms })}`],
    [t("trips.checkIn"), date(b.checkIn, "EEE d MMM yyyy"), t("trips.fromTime", { time: h.checkIn })],
    [t("trips.checkOut"), date(b.checkOut, "EEE d MMM yyyy"), t("trips.byTime", { time: h.checkOut })],
    [t("trips.policy"), t(`policy.${room?.cancellationPolicy ?? h.cancellationPolicy}`), t(`policy.short.${room?.cancellationPolicy ?? h.cancellationPolicy}`)],
    [t("trips.contactLabel"), "+20 69 360 0000", t("trips.replies", { time: h.host.responseTime })],
  ];
  return (
    <div className="container-page max-w-[1080px] py-10">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/trips?tab=${tab}`)}><ArrowLeft className="rtl:rotate-180" /> {t("nav.trips")}</Button>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div><span className="eyebrow">{t("trips.reservation")}</span><h1 className="mb-2 text-[40px] max-md:text-[28px]">{t("trips.details", { id: b.id })}</h1><Link to={hotelPath(h)} className="text-[13px] text-gold hover:underline">{h.name}</Link></div>
        <BookingStateBadge state={b.state} />
      </div>

      <ol aria-label={t("common.status")} className="mt-8 grid grid-cols-4 gap-2 max-sm:grid-cols-2">
        {FLOW.map((s, i) => { const done = !alt && i <= idx; return (
          <li key={s} aria-current={!alt && i === idx ? "step" : undefined} className="flex flex-col gap-2">
            <span className={cn("h-[3px]", done ? "bg-gold" : "bg-line")} />
            <span className={cn("flex items-center gap-1.5 text-[11px] font-semibold", done ? "text-navy" : "text-ink-muted")}><i className={cn("grid size-5 place-items-center rounded-full text-[10px] not-italic", done ? "bg-gold text-white" : "bg-soft")}>{done ? <Check className="size-3" /> : i + 1}</i>{t(`states.bookingState.${s}`)}</span>
          </li>
        ); })}
      </ol>
      {alt && <p className="mt-3 flex items-center gap-2 bg-error-bg px-3.5 py-2.5 text-[12px] text-error"><TriangleAlert className="size-4" /> {t(`states.bookingState.${b.state}`)}{b.refundAmount ? ` · ${t("trips.refund")} ${money(b.refundAmount, b.currency)}` : ""}{b.dispute ? ` · ${b.dispute}` : ""}</p>}

      <div className="mt-8 grid grid-cols-[1fr_340px] gap-8 max-md:grid-cols-1">
        <dl className="m-0 grid grid-cols-2 gap-px self-start bg-line max-sm:grid-cols-1">
          {cells.map(([k, v, s]) => <div key={k} className="flex flex-col gap-0.5 bg-paper p-4"><dt className="text-[9px] font-bold tracking-[0.12em] text-ink-muted uppercase">{k}</dt><dd className="m-0 text-[14px] font-bold text-navy">{v}</dd><dd className="m-0 text-[11px] text-ink-muted">{s}</dd></div>)}
          {b.specialRequests && <div className="col-span-2 flex flex-col gap-0.5 bg-paper p-4 max-sm:col-span-1"><dt className="text-[9px] font-bold tracking-[0.12em] text-ink-muted uppercase">{t("booking.requests")}</dt><dd className="m-0 text-[13px] text-charcoal">{b.specialRequests}</dd></div>}
        </dl>
        <aside className="border border-line bg-paper p-5">
          <PriceBreakdownTable booking={b} />
          <div className="mt-5 flex flex-col gap-2">
            <Button variant="outline" onClick={() => navigate(convo ? `/messages/${convo.id}` : "/messages")}><MessageCircle /> {t("trips.contact")}</Button>
            <Button variant="outline" onClick={() => { downloadReceipt(b, h, (n) => money(n, b.currency)); toast.success(t("booking.receiptDownloaded")); }}><Download /> {t("trips.receipt")}</Button>
            {tab === "UPCOMING" && <>
              <Button variant="outline" onClick={() => setDialog({ kind: "dates", booking: b, hotel: h })}>{t("trips.changeDates")}</Button>
              <Button variant="outline" className="text-error" onClick={() => setDialog({ kind: "cancel", booking: b, hotel: h })}>{t("trips.cancel")}</Button>
            </>}
            {tab === "COMPLETED" && !b.reviewed && <Button variant="gold" onClick={() => setDialog({ kind: "review", booking: b, hotel: h })}>{t("trips.review")}</Button>}
            <Button variant="text" onClick={() => setDialog({ kind: "help", booking: b, hotel: h })}>{t("trips.help")}</Button>
          </div>
        </aside>
      </div>
      <TripDialogs dialog={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
