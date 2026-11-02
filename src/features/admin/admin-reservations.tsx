/* Reservation oversight (§52): search, modify dates, refund (full/partial), cancel, resolve disputes. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import type { Booking } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlay";
import { BookingStateBadge, EmptyState, ErrorState } from "@/components/common";
import { DataTable, Toolbar } from "@/components/dashboard";
import { useAdminBookings, useAdminMutation } from "@/hooks/queries";
import { adminService } from "@/services/ops.service";
import { useDates, useMoney } from "@/hooks/use-format";
import { nightsBetween } from "@/lib/dates";
import { errorMessage } from "@/lib/forms";

type Dlg = { kind: "refund" | "modify" | "cancel"; b: Booking } | null;

export default function AdminReservations() {
  const { t } = useTranslation();
  const money = useMoney();
  const { date } = useDates();
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useAdminBookings(q);
  const [dlg, setDlg] = useState<Dlg>(null);
  const [amount, setAmount] = useState("");
  const [dates, setDates] = useState({ checkIn: "", checkOut: "" });
  const refund = useAdminMutation(({ id, amount }: { id: string; amount: number }) => adminService.refund(id, amount), [["bookings"], ["me", "bookings"]]);
  const cancel = useAdminMutation((id: string) => adminService.cancelBooking(id), [["bookings"], ["me", "bookings"]]);
  const resolve = useAdminMutation((id: string) => adminService.resolveDispute(id));
  const modify = useAdminMutation(({ id, patch }: { id: string; patch: Partial<Booking> }) => adminService.updateBooking(id, patch), [["bookings"], ["me", "bookings"]]);
  const close = () => { setDlg(null); setAmount(""); refund.reset(); cancel.reset(); modify.reset(); };
  const ok = (msg: string) => ({ onSuccess: () => { toast.success(msg); close(); } });
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const badDates = nightsBetween(dates.checkIn, dates.checkOut) < 1;
  return (
    <>
      <Toolbar title={t("admin.nav.reservations")} sub={t("admin.res.sub", { count: data?.total ?? 0 })}><Input aria-label={t("common.searchPlaceholder")} placeholder={t("admin.res.search")} value={q} onChange={(e) => setQ(e.target.value)} className="min-h-10 w-72 max-sm:w-full" /></Toolbar>
      {isLoading ? <div className="skeleton h-80" /> : (
        <DataTable caption={t("admin.nav.reservations")} rows={data?.items ?? []} rowKey={(b) => b.id} empty={<EmptyState title={t("host.res.empty")} text={t("admin.res.emptyText")} />} cols={[
          { head: t("trips.reservation"), cell: (b) => <span className="font-mono text-[11px] text-navy">{b.id}</span> },
          { head: t("host.col.guest"), cell: (b) => b.guestName },
          { head: t("host.col.dates"), cell: (b) => `${date(b.checkIn)} → ${date(b.checkOut)}` },
          { head: t("host.col.total"), cell: (b) => <span className="flex flex-col">{money(b.price.total, b.currency)}{b.refundAmount ? <small className="text-[10px] text-success">−{money(b.refundAmount, b.currency)}</small> : null}</span> },
          { head: t("common.status"), cell: (b) => <span className="flex flex-col items-start gap-1"><BookingStateBadge state={b.state} />{b.dispute && <small className="max-w-44 text-[10px] text-error">{b.dispute}</small>}</span> },
          { head: "", cell: (b) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`${t("common.actions")} · ${b.id}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => { setDates({ checkIn: b.checkIn, checkOut: b.checkOut }); setDlg({ kind: "modify", b }); }}>{t("admin.res.modify")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setAmount(String(b.price.total - (b.refundAmount ?? 0))); setDlg({ kind: "refund", b }); }}>{t("admin.res.refund")}</DropdownMenuItem>
                {!["COMPLETED", "REFUNDED", "CANCELLED"].includes(b.state) && <DropdownMenuItem className="text-error" onSelect={() => setDlg({ kind: "cancel", b })}>{t("admin.res.cancel")}</DropdownMenuItem>}
                {b.dispute && <DropdownMenuItem onSelect={() => resolve.mutate(b.id, { onSuccess: () => toast.success(t("admin.res.resolved")) })}>{t("admin.res.resolve")}</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          ) },
        ]} />
      )}
      <Dialog open={!!dlg} onOpenChange={(o) => !o && close()}>
        {dlg?.kind === "refund" && <DialogContent title={t("admin.res.refundTitle", { id: dlg.b.id })} description={t("admin.res.refundText", { total: money(dlg.b.price.total, dlg.b.currency) })}>
          <Field label={`${t("host.col.amount")} (${dlg.b.currency})`} htmlFor="rf-amt" error={refund.error ? errorMessage(refund.error, "") : undefined}><Input id="rf-amt" type="number" min={1} max={dlg.b.price.total} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <div className="mt-2 flex gap-2"><Button size="xs" variant="outline" onClick={() => setAmount(String(dlg.b.price.total))}>100%</Button><Button size="xs" variant="outline" onClick={() => setAmount(String(Math.round(dlg.b.price.total / 2)))}>50%</Button></div>
          <DialogFooter><Button variant="outline" onClick={close}>{t("common.cancel")}</Button><Button disabled={refund.isPending || !Number(amount)} onClick={() => refund.mutate({ id: dlg.b.id, amount: Number(amount) }, ok(t("admin.res.refunded")))}>{t("admin.res.issue")}</Button></DialogFooter>
        </DialogContent>}
        {dlg?.kind === "modify" && <DialogContent title={t("admin.res.modifyTitle", { id: dlg.b.id })}>
          <div className="grid grid-cols-2 gap-3"><Field label={t("trips.checkIn")} htmlFor="md-in"><Input id="md-in" type="date" value={dates.checkIn} onChange={(e) => setDates({ ...dates, checkIn: e.target.value })} /></Field><Field label={t("trips.checkOut")} htmlFor="md-out" error={badDates ? t("booking.v.nights") : undefined}><Input id="md-out" type="date" value={dates.checkOut} onChange={(e) => setDates({ ...dates, checkOut: e.target.value })} /></Field></div>
          <DialogFooter><Button variant="outline" onClick={close}>{t("common.cancel")}</Button><Button disabled={badDates || modify.isPending} onClick={() => modify.mutate({ id: dlg.b.id, patch: { ...dates, nights: nightsBetween(dates.checkIn, dates.checkOut) } }, ok(t("admin.res.modified")))}>{t("common.saveChanges")}</Button></DialogFooter>
        </DialogContent>}
        {dlg?.kind === "cancel" && <DialogContent title={t("admin.res.cancelTitle", { id: dlg.b.id })} description={t("admin.res.cancelText")}>
          {cancel.error && <p role="alert" className="text-[12px] text-error">{errorMessage(cancel.error, "")}</p>}
          <DialogFooter><Button variant="outline" onClick={close}>{t("trips.keep")}</Button><Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate(dlg.b.id, ok(t("trips.cancelled")))}>{t("admin.res.cancel")}</Button></DialogFooter>
        </DialogContent>}
      </Dialog>
    </>
  );
}
