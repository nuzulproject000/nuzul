/* Trips (§32): upcoming / active / completed / cancelled with lifecycle actions. */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { BadgeCheck, CalendarDays, Check, CircleHelp, Clock3, Download, MapPin, MessageCircle, Navigation, Phone, Receipt, Star, Undo2 } from "lucide-react";
import type { Booking } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingStateBadge, EmptyState, ErrorState, PageHeader } from "@/components/common";
import { MatchPill } from "@/components/match";
import { useConversations, useHotel, useMyBookings } from "@/hooks/queries";
import { useDates, useMoney } from "@/hooks/use-format";
import { downloadReceipt } from "@/lib/receipt";
import { TripDialogs, type TripDialog } from "./trip-dialogs";
import { TRIP_TABS, tabOf, type TripTab } from "./trip-state";


export default function TripsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (TRIP_TABS.includes(params.get("tab") as TripTab) ? params.get("tab") : "UPCOMING") as TripTab;
  const { data, isLoading, error, refetch } = useMyBookings();
  const [dialog, setDialog] = useState<TripDialog | null>(null);
  const list = (data ?? []).filter((b) => tabOf(b.state) === tab);
  const counts = Object.fromEntries(TRIP_TABS.map((k) => [k, (data ?? []).filter((b) => tabOf(b.state) === k).length]));
  const reviewId = params.get("review");

  return (
    <div className="container-page py-12">
      <PageHeader eyebrow={t("trips.eyebrow")} title={t("trips.title")} lead={t("trips.lead")} />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList>{TRIP_TABS.map((k) => <TabsTrigger key={k} value={k} count={counts[k]}>{t(`trips.tabs.${k}`)}</TabsTrigger>)}</TabsList>
      </Tabs>
      {error ? <ErrorState error={error} onRetry={() => void refetch()} />
        : isLoading ? <div className="flex flex-col gap-5">{[0, 1].map((i) => <div key={i} className="skeleton h-64" />)}</div>
        : list.length === 0 ? <EmptyState icon={<CalendarDays />} title={t("trips.empty", { tab: t(`trips.tabs.${tab}`).toLowerCase() })} text={tab === "UPCOMING" ? t("trips.emptyUpcoming") : t("trips.emptyOther")} action={t("trips.find")} onAction={() => navigate("/search")} />
        : <div className="flex flex-col gap-6">{list.map((b) => <TripCard key={b.id} booking={b} tab={tab} openReview={reviewId === b.id} onDialog={setDialog} />)}</div>}
      <TripDialogs dialog={dialog} onClose={() => { setDialog(null); if (reviewId) setParams({ tab }, { replace: true }); }} onCancelled={() => setParams({ tab: "CANCELLED" }, { replace: true })} />
    </div>
  );
}

function TripCard({ booking: b, tab, openReview, onDialog }: { booking: Booking; tab: TripTab; openReview: boolean; onDialog: (d: TripDialog) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const money = useMoney();
  const { date } = useDates();
  const { data: h } = useHotel(b.hotelId);
  const { data: convos } = useConversations();
  useEffect(() => { if (openReview && h && !b.reviewed) onDialog({ kind: "review", booking: b, hotel: h }); }, [openReview, h]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!h) return <div className="skeleton h-64" />;
  const room = h.rooms.find((r) => r.id === b.roomId);
  const convo = convos?.find((c) => c.hotelId === h.id);
  const open = (kind: TripDialog["kind"]) => onDialog({ kind, booking: b, hotel: h });
  const paymentText = b.state === "REFUNDED" ? `${t("trips.refund")} · ${money(b.refundAmount ?? 0, b.currency)}` : b.payment.method === "PAY_AT_HOTEL" ? t("booking.payLater") : b.payment.status === "CAPTURED" ? t("trips.paymentDone") : t("trips.paymentAuth");
  const facts = [
    { k: t("trips.checkIn"), v: date(b.checkIn, "EEE d MMM"), s: t("trips.fromTime", { time: h.checkIn }) },
    { k: t("trips.checkOut"), v: date(b.checkOut, "EEE d MMM"), s: t("trips.byTime", { time: h.checkOut }) },
    { k: t("trips.reservation"), v: b.id, s: `${t("common.guest", { count: b.guests.adults + b.guests.children })} · ${room?.name ?? ""}` },
    { k: t("trips.payment"), v: money(b.price.total, b.currency), s: paymentText },
  ];
  return (
    <article className="grid grid-cols-[260px_1fr_240px] border border-line bg-paper max-lg:grid-cols-[200px_1fr] max-md:grid-cols-1">
      <img src={h.images[0]} alt="" className="h-full min-h-56 w-full object-cover max-md:h-48 max-md:min-h-0" />
      <div className="flex flex-col gap-3 p-6 max-md:p-4">
        <div className="flex flex-wrap items-center gap-2"><BookingStateBadge state={b.state} /><MatchPill score={h.match.score} hotelId={h.id} /></div>
        <h2 className="m-0 text-2xl"><Link to={`/trips/${b.id}`} className="hover:text-gold">{h.name}</Link></h2>
        <p className="m-0 flex items-center gap-1.5 text-[12px] text-ink-muted"><MapPin className="size-3.5" /> {h.area}, {h.city}</p>
        <dl className="m-0 mt-1 grid grid-cols-4 gap-4 border-y border-line py-4 max-lg:grid-cols-2">
          {facts.map((f) => <div key={f.k} className="flex flex-col gap-0.5"><dt className="text-[9px] font-bold tracking-[0.12em] text-ink-muted uppercase">{f.k}</dt><dd className="m-0 text-[13px] font-bold text-navy">{f.v}</dd><dd className="m-0 text-[11px] text-ink-muted">{f.s}</dd></div>)}
        </dl>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => navigate(`/trips/${b.id}`)}>{t("trips.view")}</Button>
          <Button size="sm" variant="outline" onClick={() => navigate(convo ? `/messages/${convo.id}` : "/messages")}><MessageCircle /> {t("trips.contact")}</Button>
          {tab === "UPCOMING" && <>
            <Button size="sm" variant="outline" onClick={() => open("dates")}>{t("trips.changeDates")}</Button>
            <Button size="sm" variant="outline" onClick={() => open("guests")}>{t("trips.changeGuests")}</Button>
            <Button size="sm" variant="outline" className="text-error" onClick={() => open("cancel")}>{t("trips.cancel")}</Button>
          </>}
          {tab === "COMPLETED" && (b.reviewed ? <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-1.5 text-[10px] font-bold text-success"><BadgeCheck className="size-3" /> {t("trips.reviewed")}</span> : <Button size="sm" variant="gold" onClick={() => open("review")}><Star /> {t("trips.review")}</Button>)}
          <Button size="sm" variant="outline" onClick={() => { downloadReceipt(b, h, (n) => money(n, b.currency)); toast.success(t("booking.receiptDownloaded")); }}><Download /> {t("trips.receipt")}</Button>
          <Button size="icon-sm" variant="ghost" aria-label={t("trips.help")} onClick={() => open("help")}><CircleHelp /></Button>
        </div>
      </div>
      <aside className="flex flex-col gap-3 border-s border-line bg-soft/40 p-6 text-[12px] text-charcoal max-lg:col-span-2 max-lg:border-s-0 max-lg:border-t max-md:col-span-1 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-gold">
        <h4 className="m-0 text-[13px]">{t(tab === "UPCOMING" ? "trips.before" : tab === "ACTIVE" ? "trips.during" : tab === "COMPLETED" ? "trips.after" : "trips.refund")}</h4>
        {tab === "UPCOMING" && <>
          <p className="m-0 flex gap-2"><Check /> {b.state === "PENDING" ? t("trips.paymentAuth") : t("trips.paymentDone")}</p>
          <p className="m-0 flex gap-2"><Check /> {t("trips.detailsAdded")}</p>
          <p className="m-0 flex gap-2"><Clock3 /> {t(`policy.short.${room?.cancellationPolicy ?? h.cancellationPolicy}`)}</p>
          <a className="flex gap-2 font-bold text-navy underline-offset-2 hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/directions?to=${h.coordinates.lat},${h.coordinates.lng}`}><Navigation /> {t("trips.directions")}</a>
        </>}
        {tab === "ACTIVE" && <>
          <p className="m-0 flex gap-2"><Phone /> {t("trips.frontDesk", { phone: "+20 69 360 0000" })}</p>
          <p className="m-0 flex gap-2"><Clock3 /> {t("trips.byTime", { time: h.checkOut })}</p>
          <p className="m-0 flex gap-2"><MessageCircle /> {t("trips.replies", { time: h.host.responseTime })}</p>
        </>}
        {tab === "COMPLETED" && <>
          <p className="m-0 flex gap-2"><Receipt /> {t("trips.invoiceReady")}</p>
          <p className="m-0 flex gap-2"><Star /> {b.reviewed ? t("trips.thanks") : t("trips.reviewOpen")}</p>
        </>}
        {tab === "CANCELLED" && <>
          <p className="m-0 flex gap-2"><Undo2 /> {b.refundAmount ? `${money(b.refundAmount, b.currency)} ${t("trips.toCard")}` : t(`states.bookingState.${b.state}`)}</p>
          <p className="m-0 flex gap-2"><Clock3 /> {t("trips.refundTime")}</p>
        </>}
      </aside>
    </article>
  );
}
