/* Booking confirmation (§29 step 8). */
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, Clock3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingStateBadge, ErrorState, Logo } from "@/components/common";
import { useBooking, useConversations, useHotel } from "@/hooks/queries";
import { useDates, useMoney } from "@/hooks/use-format";
import { downloadReceipt } from "@/lib/receipt";

export default function ConfirmationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = "" } = useParams();
  const money = useMoney();
  const { date } = useDates();
  const { data: b, error, refetch } = useBooking(id);
  const { data: h } = useHotel(b?.hotelId ?? "");
  const { data: convos } = useConversations();
  if (error) return <div className="container-page py-20"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  if (!b || !h) return <div className="container-page py-20"><div className="skeleton h-96" /></div>;
  const confirmed = b.state === "CONFIRMED";
  const room = h.rooms.find((r) => r.id === b.roomId);
  const convo = convos?.find((c) => c.hotelId === h.id);
  const rows: [string, React.ReactNode][] = [
    [t("booking.reservation"), <b key="id" className="font-mono">{b.id}</b>], [t("common.status"), <BookingStateBadge key="s" state={b.state} />],
    [t("booking.steps.dates"), `${date(b.checkIn, "EEE d MMM yyyy")} → ${date(b.checkOut, "EEE d MMM yyyy")}`],
    [t("booking.steps.guests"), `${t("common.guest", { count: b.guests.adults + b.guests.children })} · ${t("common.room", { count: b.guests.rooms })}`],
    [t("trips.payment"), confirmed || b.payment.method !== "PAY_AT_HOTEL" ? t("trips.paymentAuth") : t("booking.payLaterSub")], [t("booking.total"), money(b.price.total, b.currency, { original: true })],
  ];
  return (
    <div className="pb-20">
      <header className="flex justify-center border-b border-line py-4"><Link to="/" aria-label="Nuzul home"><Logo compact /></Link></header>
      <section className="mx-auto flex max-w-[720px] flex-col items-center px-5 pt-14 text-center">
        <span className={confirmed ? "grid size-16 place-items-center rounded-full bg-success text-white" : "grid size-16 place-items-center rounded-full bg-warn-bg text-warn"}>{confirmed ? <Check className="size-8" /> : <Clock3 className="size-8" />}</span>
        <span className="eyebrow mt-6">{confirmed ? t("booking.confirmedEyebrow") : t("booking.requestEyebrow")}</span>
        <h1 className="text-[44px] max-md:text-[32px]">{confirmed ? t("booking.confirmedTitle") : t("booking.requestTitle")}</h1>
        <p className="text-ink-muted">{confirmed ? t("booking.confirmedText") : t("booking.requestText")}</p>
        <div className="mt-7 w-full border border-line bg-paper text-start">
          <div className="flex items-center gap-4 border-b border-line p-4"><img src={h.images[0]} alt="" className="h-20 w-28 object-cover" /><span className="flex flex-col"><b className="text-navy">{h.name}</b><small className="text-[12px] text-ink-muted">{room?.name} · {h.city}</small></span></div>
          <dl className="m-0 grid grid-cols-[160px_1fr] gap-x-4 gap-y-3 p-5 text-[13px] max-sm:grid-cols-1 max-sm:gap-y-1">
            {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-ink-muted max-sm:mt-2">{k}</dt><dd className="m-0 text-navy">{v}</dd></div>)}
          </dl>
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Button onClick={() => navigate(`/trips/${b.id}`)}>{t("booking.viewTrip")}</Button>
          <Button variant="outline" onClick={() => navigate(convo ? `/messages/${convo.id}` : "/messages")}>{t("booking.messageHotel")}</Button>
          <Button variant="outline" onClick={() => { downloadReceipt(b, h, (n) => money(n, b.currency)); toast.success(t("booking.receiptDownloaded")); }}><Download /> {t("booking.receipt")}</Button>
        </div>
      </section>
    </div>
  );
}
