/* Reservation management (§47) with the §63 state machine — only legal transitions are offered. */
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import type { Booking, BookingState } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { BookingStateBadge, Chip, EmptyState, ErrorState } from "@/components/common";
import { Avatar, DataTable, Toolbar } from "@/components/dashboard";
import { useHostHotels, useHostMutation, useHostReservations } from "@/hooks/queries";
import { hostService } from "@/services/ops.service";
import { useDates, useMoney } from "@/hooks/use-format";
import { errorMessage } from "@/lib/forms";
import { PriceBreakdownTable } from "@/features/trips/price-breakdown";

export const NEXT_STATES: Record<BookingState, BookingState[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["CHECKED_IN", "NO_SHOW", "CANCELLED"], CHECKED_IN: ["COMPLETED"],
  COMPLETED: [], CANCELLED: [], REFUNDED: [], FAILED: [], EXPIRED: [], NO_SHOW: [],
};
const FILTERS: (BookingState | "ALL")[] = ["ALL", "PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];

export default function HostReservations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const money = useMoney();
  const { date } = useDates();
  const [params, setParams] = useSearchParams();
  const filter = (params.get("state") as BookingState | null) ?? "ALL";
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useHostReservations(filter === "ALL" ? undefined : [filter]);
  const { data: hotels } = useHostHotels();
  const [open, setOpen] = useState<Booking | null>(null);
  const [confirm, setConfirm] = useState<{ b: Booking; to: BookingState } | null>(null);
  const move = useHostMutation(({ id, to }: { id: string; to: BookingState }) => hostService.transition(id, to), [["bookings"]]);
  const rows = (data?.items ?? []).filter((b) => !q || `${b.id} ${b.guestName}`.toLowerCase().includes(q.toLowerCase()));
  const roomName = (b: Booking) => hotels?.find((h) => h.id === b.hotelId)?.rooms.find((r) => r.id === b.roomId)?.name ?? "";
  const run = (b: Booking, to: BookingState) => move.mutate({ id: b.id, to }, { onSuccess: () => { toast.success(t("host.res.moved", { id: b.id, state: t(`states.bookingState.${to}`) })); setConfirm(null); setOpen(null); }, onError: (e) => toast.error(errorMessage(e, t("errors.generic"))) });
  const destructive = (to: BookingState) => to === "CANCELLED" || to === "NO_SHOW";

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <Toolbar title={t("host.nav.reservations")} sub={t("host.res.sub", { count: data?.total ?? 0 })}><Input aria-label={t("common.searchPlaceholder")} placeholder={t("host.res.search")} value={q} onChange={(e) => setQ(e.target.value)} className="min-h-10 w-64 max-sm:w-full" /></Toolbar>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label={t("results.filters")}>{FILTERS.map((f) => <Chip key={f} active={filter === f} onClick={() => setParams(f === "ALL" ? {} : { state: f })}>{f === "ALL" ? t("notifications.all") : t(`states.bookingState.${f}`)}</Chip>)}</div>
      {isLoading ? <div className="skeleton h-80" /> : (
        <DataTable caption={t("host.nav.reservations")} rows={rows} rowKey={(b) => b.id} empty={<EmptyState title={t("host.res.empty")} text={t("host.res.emptyText")} />} cols={[
          { head: t("host.col.guest"), cell: (b) => <button type="button" onClick={() => setOpen(b)} className="flex items-center gap-2 text-start"><Avatar name={b.guestName} /><span className="flex flex-col"><b className="text-navy hover:text-gold">{b.guestName}</b><small className="font-mono text-[10px] text-ink-muted">{b.id}</small></span></button> },
          { head: t("host.col.room"), cell: roomName },
          { head: t("host.col.dates"), cell: (b) => `${date(b.checkIn)} → ${date(b.checkOut)} · ${b.nights}n` },
          { head: t("host.col.guests"), cell: (b) => b.guests.adults + b.guests.children },
          { head: t("host.col.total"), cell: (b) => money(b.price.total, b.currency) },
          { head: t("common.status"), cell: (b) => <span className="flex flex-col items-start gap-1"><BookingStateBadge state={b.state} />{b.dispute && <small className="text-[10px] text-error">{t("host.res.dispute")}</small>}</span> },
          { head: t("common.actions"), cell: (b) => <div className="flex flex-wrap gap-1.5">{NEXT_STATES[b.state].map((to) => <Button key={to} size="xs" variant={destructive(to) ? "outline" : "default"} className={destructive(to) ? "text-error" : undefined} onClick={() => (destructive(to) ? setConfirm({ b, to }) : run(b, to))}>{t(`host.res.to.${to}`)}</Button>)}</div> },
        ]} />
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        {open && <DialogContent size="lg" title={t("trips.details", { id: open.id })} description={`${open.guestName} · ${roomName(open)}`}>
          <div className="grid grid-cols-2 gap-6 max-sm:grid-cols-1">
            <dl className="m-0 grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
              <dt className="text-ink-muted">{t("common.status")}</dt><dd className="m-0"><BookingStateBadge state={open.state} /></dd>
              <dt className="text-ink-muted">{t("host.col.dates")}</dt><dd className="m-0 text-navy">{date(open.checkIn, "d MMM yyyy")} → {date(open.checkOut, "d MMM yyyy")}</dd>
              <dt className="text-ink-muted">{t("host.col.guests")}</dt><dd className="m-0 text-navy">{t("common.guest", { count: open.guests.adults + open.guests.children })} · {t("common.room", { count: open.guests.rooms })}</dd>
              <dt className="text-ink-muted">{t("trips.payment")}</dt><dd className="m-0 text-navy">{t(`host.pay.${open.payment.status}`)}</dd>
              {open.specialRequests && <><dt className="text-ink-muted">{t("booking.requests")}</dt><dd className="m-0 text-navy">{open.specialRequests}</dd></>}
            </dl>
            <PriceBreakdownTable booking={open} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => navigate("/host/messages")}><MessageCircle /> {t("host.res.message")}</Button>
            {NEXT_STATES[open.state].map((to) => <Button key={to} variant={destructive(to) ? "destructive" : "default"} disabled={move.isPending} onClick={() => (destructive(to) ? setConfirm({ b: open, to }) : run(open, to))}>{t(`host.res.to.${to}`)}</Button>)}
          </DialogFooter>
        </DialogContent>}
      </Dialog>
      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        {confirm && <DialogContent title={t(`host.res.confirm.${confirm.to}`)} description={t("host.res.confirmText", { id: confirm.b.id, guest: confirm.b.guestName })}>
          <DialogFooter><Button variant="outline" onClick={() => setConfirm(null)}>{t("common.cancel")}</Button><Button variant="destructive" disabled={move.isPending} onClick={() => run(confirm.b, confirm.to)}>{t(`host.res.to.${confirm.to}`)}</Button></DialogFooter>
        </DialogContent>}
      </Dialog>
    </>
  );
}
