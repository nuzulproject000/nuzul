/* Trip management dialogs (§32–33, §26): cancel with refund calculation, change requests, help, review. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { parseISO } from "date-fns";
import { ArrowRight, BadgeCheck, ShieldCheck, Star } from "lucide-react";
import type { Booking, Hotel, ReviewCategoryKey } from "@/types/models";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Counter } from "@/components/common";
import { useCancelBooking, useChangeRequest, useSubmitReview } from "@/hooks/queries";
import { messagingService } from "@/services/account.service";
import { useQueryClient } from "@tanstack/react-query";
import { useDates, useMoney } from "@/hooks/use-format";
import { refundPct } from "@/lib/pricing";
import { daysUntil, nightsBetween, toISODate } from "@/lib/dates";
import { errorMessage } from "@/lib/forms";
import { cn } from "@/lib/utils";

export type TripDialog = { kind: "cancel" | "dates" | "guests" | "help" | "review"; booking: Booking; hotel: Hotel };

export function TripDialogs({ dialog, onClose, onCancelled }: { dialog: TripDialog | null; onClose: () => void; onCancelled?: () => void }) {
  return (
    <Dialog open={!!dialog} onOpenChange={(o) => !o && onClose()}>
      {dialog?.kind === "cancel" && <CancelBody {...dialog} onClose={onClose} onDone={onCancelled} />}
      {(dialog?.kind === "dates" || dialog?.kind === "guests") && <ChangeBody {...dialog} onClose={onClose} />}
      {dialog?.kind === "help" && <HelpBody {...dialog} onClose={onClose} />}
      {dialog?.kind === "review" && <ReviewBody {...dialog} onClose={onClose} />}
    </Dialog>
  );
}

type BodyProps = { booking: Booking; hotel: Hotel; onClose: () => void };

function CancelBody({ booking: b, hotel: h, onClose, onDone }: BodyProps & { onDone?: () => void }) {
  const { t } = useTranslation();
  const money = useMoney();
  const [reason, setReason] = useState("");
  const cancel = useCancelBooking();
  const policy = h.rooms.find((r) => r.id === b.roomId)?.cancellationPolicy ?? h.cancellationPolicy;
  const pct = refundPct(policy, daysUntil(b.checkIn));
  const refund = Math.round((b.price.total * pct) / 100);
  const label = pct === 100 ? t("trips.fullRefund") : pct === 0 ? t("trips.noRefund") : t("trips.partialRefund");
  return (
    <DialogContent title={t("trips.cancelTitle")}>
      <div className="flex items-start gap-3 bg-soft p-4"><ShieldCheck className="size-5 shrink-0 text-success" /><div><b className="text-[13px] text-navy">{t("hotel.cancellation", { policy: t(`policy.${policy}`) })}</b><p className="m-0 mt-1 text-[12px] text-ink-muted">{t(`policy.long.${policy}`)}</p></div></div>
      <dl className="mt-5 text-[13px]">
        <div className="flex justify-between py-1.5"><dt>{t("trips.paid")}</dt><dd className="m-0">{money(b.price.total, b.currency)}</dd></div>
        <div className="flex justify-between py-1.5"><dt>{t("trips.refundLine", { pct })}</dt><dd className="m-0">{money(refund, b.currency)}</dd></div>
        <div className="mt-2 flex justify-between border-t border-line pt-3 font-bold text-navy"><dt>{label} <span className="font-normal text-ink-muted">{t("trips.toCard")}</span></dt><dd className="m-0">{money(refund, b.currency)}</dd></div>
      </dl>
      <Field className="mt-5" label={<>{t("trips.reason")} <span className="font-normal text-ink-muted">({t("common.optional")})</span></>} htmlFor="c-reason">
        <Select id="c-reason" value={reason} onValueChange={setReason} placeholder={t("trips.reasonPh")} options={(["plans", "other_stay", "restrictions", "other"] as const).map((k) => ({ value: k, label: t(`trips.reasons.${k}`) }))} />
      </Field>
      {cancel.error && <p role="alert" className="mt-3 text-[12px] font-semibold text-error">{errorMessage(cancel.error, t("errors.generic"))}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t("trips.keep")}</Button>
        <Button variant="destructive" disabled={cancel.isPending} onClick={() => cancel.mutate(b.id, { onSuccess: () => { toast.success(t("trips.cancelled")); onClose(); onDone?.(); } })}>{t("trips.confirmCancel")}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ChangeBody({ booking: b, hotel: h, kind, onClose }: BodyProps & { kind: "dates" | "guests" | string }) {
  const { t } = useTranslation();
  const { range } = useDates();
  const [dates, setDates] = useState({ checkIn: b.checkIn, checkOut: b.checkOut });
  const [guests, setGuests] = useState({ adults: b.guests.adults, children: b.guests.children });
  const [message, setMessage] = useState("");
  const change = useChangeRequest();
  const isDates = kind === "dates";
  const invalid = isDates && nightsBetween(dates.checkIn, dates.checkOut) < 1;
  return (
    <DialogContent title={isDates ? t("trips.changeTitleDates") : t("trips.changeTitleGuests")} description={t("trips.changeText", { hotel: h.name })} size={isDates ? "lg" : "md"}>
      {isDates ? (
        <div className="border border-line bg-paper p-4">
          <Calendar mode="range" numberOfMonths={2} disabled={{ before: new Date() }} selected={{ from: parseISO(dates.checkIn), to: parseISO(dates.checkOut) }} onSelect={(r) => r?.from && setDates({ checkIn: toISODate(r.from), checkOut: toISODate(r.to ?? r.from) })} />
          <p className="mt-3 mb-0 text-[12px] text-navy"><b>{t("trips.newIn")} → {t("trips.newOut")}:</b> {range(dates.checkIn, dates.checkOut)}</p>
        </div>
      ) : (
        <div className="border border-line bg-paper px-4">
          <Counter label={t("search.adults")} sub={t("search.adultsSub")} value={guests.adults} min={1} onChange={(n) => setGuests({ ...guests, adults: n })} />
          <Counter label={t("search.children")} sub={t("search.childrenSub")} value={guests.children} onChange={(n) => setGuests({ ...guests, children: n })} />
        </div>
      )}
      <Field className="mt-4" label={<>{t("trips.message")} <span className="font-normal text-ink-muted">({t("common.optional")})</span></>} htmlFor="ch-msg"><Textarea id="ch-msg" value={message} onChange={(e) => setMessage(e.target.value)} /></Field>
      {(invalid || change.error) && <p role="alert" className="mt-3 text-[12px] font-semibold text-error">{invalid ? t("booking.v.nights") : errorMessage(change.error, t("errors.generic"))}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button disabled={invalid || change.isPending} onClick={() => change.mutate({ id: b.id, kind: isDates ? "DATES" : "GUESTS", ...(isDates ? dates : { guests }), message: message || undefined }, { onSuccess: () => { toast.success(t("trips.sent")); onClose(); } })}>{t("trips.send")}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function HelpBody({ booking: b, onClose }: BodyProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  /** Opens (or reuses) the guest's Nuzul Support conversation and posts the issue with the reservation ID. */
  const ask = async (text: string) => {
    setBusy(true);
    try {
      const c = await messagingService.start({ kind: "SUPPORT" });
      await messagingService.send(c.id, text);
      void qc.invalidateQueries({ queryKey: ["me", "conversations"] });
      toast.success(t("trips.helpSent")); onClose(); navigate(`/messages/${c.id}`);
    } catch (e) { toast.error(errorMessage(e, t("errors.generic"))); } finally { setBusy(false); }
  };
  const items = ["confirmation", "noReply", "room", "charge", "safety"] as const;
  return (
    <DialogContent title={t("trips.helpTitle")}>
      <div className="flex flex-col">
        {items.map((k) => (
          <button key={k} type="button" disabled={busy} className="flex items-center justify-between border-b border-line py-3.5 text-start text-[13px] text-navy hover:text-gold"
            onClick={() => void ask(`${t(`trips.helpItems.${k}`)} — ${b.id}`)}>
            {t(`trips.helpItems.${k}`)} <ArrowRight className="size-4 rtl:rotate-180" />
          </button>
        ))}
      </div>
    </DialogContent>
  );
}

const CATS: ReviewCategoryKey[] = ["cleanliness", "location", "staff", "comfort", "facilities", "value"];
function ReviewBody({ booking: b, hotel: h, onClose }: BodyProps) {
  const { t } = useTranslation();
  const { range } = useDates();
  const [r, setR] = useState<Partial<Record<ReviewCategoryKey, number>>>({});
  const [text, setText] = useState("");
  const submit = useSubmitReview();
  const len = text.trim().length;
  const done = CATS.every((c) => r[c]) && len >= 30;
  return (
    <DialogContent size="lg" title={t("trips.reviewTitle", { hotel: h.name })}>
      <p className="flex items-start gap-2 bg-success-bg p-3 text-[12px] text-success"><BadgeCheck className="size-4 shrink-0" /> {t("trips.verifiedNote", { dates: range(b.checkIn, b.checkOut), id: b.id })}</p>
      <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 max-sm:grid-cols-1">
        {CATS.map((c) => (
          <div key={c} className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-navy">{t(`categories.${c}`)}</span>
            <div role="radiogroup" aria-label={t(`categories.${c}`)} className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={r[c] === n} aria-label={`${n} / 5`} onClick={() => setR({ ...r, [c]: n })} className={cn("p-1", (r[c] ?? 0) >= n ? "text-gold" : "text-line")}>
                  <Star className={cn("size-5", (r[c] ?? 0) >= n && "fill-current")} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Field className="mt-5" label={t("trips.tell")} htmlFor="rv-text" hint={<span className={len >= 30 ? "" : "text-warn"}>{t("trips.minChars", { n: len })}</span>}>
        <Textarea id="rv-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("trips.tellPh")} />
      </Field>
      <p className="mt-3 text-[11px] text-ink-muted">{t("trips.insightNote")}</p>
      {submit.error && <p role="alert" className="text-[12px] font-semibold text-error">{errorMessage(submit.error, t("errors.generic"))}</p>}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
        <Button variant="gold" disabled={!done || submit.isPending} onClick={() => submit.mutate({ id: b.id, categories: r as Record<string, number>, text }, { onSuccess: () => { toast.success(t("trips.submitted")); onClose(); } })}>{t("trips.submit")}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
