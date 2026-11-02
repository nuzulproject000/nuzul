/* Availability calendar (§45): per-room daily price & inventory, multi-select bulk edit, close/open dates. */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { addMonths, format, getDay, parseISO, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarDay } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/common";
import { Panel, Toolbar } from "@/components/dashboard";
import { useHostHotels, useHostMutation, useRoomCalendar } from "@/hooks/queries";
import { hostService } from "@/services/ops.service";
import { useDates } from "@/hooks/use-format";
import { errorMessage } from "@/lib/forms";
import { cn } from "@/lib/utils";

export default function HostCalendar() {
  const { t } = useTranslation();
  const { date } = useDates();
  const { data: hotels } = useHostHotels();
  const rooms = (hotels ?? []).flatMap((h) => h.rooms.map((r) => ({ ...r, hotelName: h.name })));
  const [roomId, setRoomId] = useState<string>();
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  const { data: cal, error, refetch } = useRoomCalendar(room?.id ?? "");
  const [month, setMonth] = useState(0);
  const [sel, setSel] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [avail, setAvail] = useState("");
  const update = useHostMutation(({ dates, patch }: { dates: string[]; patch: Partial<CalendarDay> }) => hostService.updateCalendar(room!.id, dates, patch));

  const days = useMemo(() => {
    if (!cal?.length) return { lead: 0, list: [] as CalendarDay[], label: "" };
    const first = startOfMonth(addMonths(parseISO(cal[0].date), month));
    const key = format(first, "yyyy-MM");
    return { lead: (getDay(first) + 6) % 7, list: cal.filter((d) => d.date.startsWith(key)), label: date(format(first, "yyyy-MM-dd"), "MMMM yyyy") };
  }, [cal, month, date]);
  const maxMonth = cal?.length ? Math.ceil(cal.length / 30) - 1 : 0;
  const apply = (patch: Partial<CalendarDay>) => update.mutate({ dates: sel, patch }, { onSuccess: () => { toast.success(t("host.cal.updated", { count: sel.length })); setSel([]); setPrice(""); setAvail(""); }, onError: (e) => toast.error(errorMessage(e, t("errors.generic"))) });
  const toggle = (d: string) => setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <>
      <Toolbar title={t("host.nav.calendar")} sub={t("host.cal.sub")}>
        {room && <Select ariaLabel={t("host.col.room")} value={room.id} onValueChange={(v) => { setRoomId(v); setSel([]); }} options={rooms.map((r) => ({ value: r.id, label: `${r.hotelName} · ${r.name}` }))} className="min-h-10 w-80 max-sm:w-full" />}
      </Toolbar>
      <div className="grid grid-cols-[1fr_300px] gap-4 max-lg:grid-cols-1">
        <Panel title={days.label} action={<div className="flex gap-1"><Button size="icon-sm" variant="outline" disabled={month <= 0} onClick={() => setMonth(month - 1)} aria-label={t("results.prev")}><ChevronLeft className="rtl:rotate-180" /></Button><Button size="icon-sm" variant="outline" disabled={month >= maxMonth} onClick={() => setMonth(month + 1)} aria-label={t("results.next")}><ChevronRight className="rtl:rotate-180" /></Button></div>}>
          {!cal ? <div className="skeleton h-80" /> : (
            <div role="grid" aria-label={days.label} className="grid grid-cols-7 gap-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => <span key={d} role="columnheader" className="pb-1 text-center text-[10px] font-bold text-ink-muted uppercase">{date(format(new Date(2024, 0, 1 + i), "yyyy-MM-dd"), "EEE")}</span>)}
              {Array.from({ length: days.lead }).map((_, i) => <span key={`l${i}`} />)}
              {days.list.map((d) => {
                const on = sel.includes(d.date);
                return (
                  <button key={d.date} type="button" role="gridcell" aria-selected={on} onClick={() => toggle(d.date)} className={cn("flex min-h-16 flex-col items-start gap-0.5 border p-1.5 text-start text-[10px] max-sm:min-h-12", on ? "border-gold bg-[#fbf6ec] shadow-[inset_0_0_0_1px_var(--gold)]" : "border-line", d.closed ? "bg-[repeating-linear-gradient(45deg,#efe8dc,#efe8dc_4px,transparent_4px,transparent_8px)] text-ink-muted" : d.available === 0 ? "bg-error-bg/60" : "bg-paper")}>
                    <b className="text-[12px] text-navy">{d.date.slice(8)}</b>
                    <span className={cn("max-sm:hidden", d.special && "font-bold text-gold")}>{d.closed ? t("host.cal.closed") : d.price.toLocaleString()}</span>
                    {!d.closed && <span className="text-ink-muted max-sm:hidden">{d.available === 0 ? t("hotel.soldOut") : t("host.cal.left", { n: d.available })}</span>}
                  </button>
                );
              })}
            </div>
          )}
          <p className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink-muted"><span className="flex items-center gap-1.5"><i className="size-3 border border-line bg-paper" /> {t("host.cal.open")}</span><span className="flex items-center gap-1.5"><i className="size-3 bg-error-bg" /> {t("hotel.soldOut")}</span><span className="flex items-center gap-1.5"><i className="size-3 bg-soft" /> {t("host.cal.closed")}</span><span className="font-bold text-gold">{t("host.cal.special")}</span></p>
        </Panel>
        <Panel title={t("host.cal.bulk")} sub={sel.length ? t("host.cal.selected", { count: sel.length }) : t("host.cal.pick")}>
          <div className="flex flex-col gap-3">
            <Field label={t("host.f.price")} htmlFor="c-price"><div className="flex gap-2"><Input id="c-price" type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} className="min-h-10" /><Button size="sm" disabled={!sel.length || !price || update.isPending} onClick={() => apply({ price: Number(price), special: true })}>{t("common.apply")}</Button></div></Field>
            <Field label={t("host.f.available")} htmlFor="c-avail"><div className="flex gap-2"><Input id="c-avail" type="number" min={0} value={avail} onChange={(e) => setAvail(e.target.value)} className="min-h-10" /><Button size="sm" disabled={!sel.length || avail === "" || update.isPending} onClick={() => apply({ available: Number(avail) })}>{t("common.apply")}</Button></div></Field>
            <div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" disabled={!sel.length || update.isPending} onClick={() => apply({ closed: true })}>{t("host.cal.close")}</Button><Button variant="outline" size="sm" disabled={!sel.length || update.isPending} onClick={() => apply({ closed: false })}>{t("host.cal.reopen")}</Button></div>
            <Button variant="text" size="sm" disabled={!sel.length} onClick={() => setSel([])}>{t("common.clear")}</Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
