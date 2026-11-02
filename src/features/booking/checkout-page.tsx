/* 8-step checkout (§29–31, §61). Payments are mocked: the UI only ever sends a provider *token*,
 * never card data, and every surface is labelled as a prototype. */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { parseISO } from "date-fns";
import { ArrowLeft, ArrowRight, BedDouble, Building2, CalendarDays, Check, CreditCard, Lock, ShieldCheck, Smartphone, TriangleAlert, Users } from "lucide-react";
import type { Booking } from "@/types/models";
import type { ApiError } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CheckRow, RadioGroup, RadioItem } from "@/components/ui/controls";
import { Calendar } from "@/components/ui/calendar";
import { Counter, ErrorState, Logo } from "@/components/common";
import { MatchPill } from "@/components/match";
import { useCreateBooking, useHotel } from "@/hooks/queries";
import { hotelsService } from "@/services/catalog.service";
import { useDates, useMoney } from "@/hooks/use-format";
import { useSearch, totalGuests } from "@/stores/search.store";
import { useSession } from "@/stores/session.store";
import { computePrice, POLICY_CHECKPOINTS, refundPct } from "@/lib/pricing";
import { nightsBetween, toISODate } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/forms";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";
import { PriceLines } from "@/features/hotel/booking-card";

const STEPS = ["room", "dates", "guests", "price", "policies", "details", "payment", "confirmation"] as const;
type Method = Booking["payment"]["method"];

const detailsSchema = yup.object({
  firstName: yup.string().trim().required("booking.v.first"),
  lastName: yup.string().trim().required("booking.v.last"),
  email: yup.string().trim().required("booking.v.email").matches(/^\S+@\S+\.\S+$/, "booking.v.email"),
  phone: yup.string().trim().required("booking.v.phone").test("phone", "booking.v.phone", (v) => (v ?? "").replace(/\D/g, "").length >= 8),
  requests: yup.string().max(500).default(""),
});
type Details = yup.InferType<typeof detailsSchema>;

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { hotelId = "" } = useParams();
  const { data: h, isLoading, error, refetch } = useHotel(hotelId);
  if (error) return <div className="container-page py-20"><ErrorState error={error} onRetry={() => void refetch()} /></div>;
  if (isLoading || !h) return <div className="container-page py-20" aria-busy><div className="skeleton h-96" /><span className="sr-only">{t("common.loading")}</span></div>;
  return <Checkout hotel={h} />;
}

function Checkout({ hotel: h }: { hotel: NonNullable<ReturnType<typeof useHotel>["data"]> }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const money = useMoney();
  const { range, date } = useDates();
  const [params, setParams] = useSearchParams();
  const s = useSearch();
  const user = useSession((x) => x.user);
  const room = h.rooms.find((r) => r.id === params.get("room")) ?? h.rooms.find((r) => r.available > 0) ?? h.rooms[0];
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState<string>();
  const [agree, setAgree] = useState(false);
  const [method, setMethod] = useState<Method>("CARD_ON_FILE");
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [payError, setPayError] = useState<string>();
  const create = useCreateBooking();
  const nights = nightsBetween(s.checkIn, s.checkOut);
  const g = s.guests;
  const price = useMemo(() => computePrice(room.nightlyPrice, Math.max(nights, 1), { rooms: g.rooms, longStayPct: h.monthlyDiscountPct }), [room.nightlyPrice, nights, g.rooms, h.monthlyDiscountPct]);
  const form = useForm<Details>({ resolver: yupResolver(detailsSchema), defaultValues: { firstName: user?.name.split(" ")[0] ?? "", lastName: user?.name.split(" ").slice(1).join(" ") ?? "", email: user?.email ?? "", phone: user?.phone ?? "", requests: "" } });
  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

  const validate = async (n: number): Promise<boolean> => {
    let e: string | undefined;
    if (n === 1 && room.available === 0) e = t("hotel.soldOut");
    if (n === 2) e = nights < 1 ? t("booking.v.nights") : nights < room.minStay ? t("booking.v.minStay", { room: room.name, n: room.minStay }) : nights > room.maxStay ? t("booking.v.maxStay", { n: room.maxStay }) : undefined;
    if (n === 3 && totalGuests(g) > room.capacity * g.rooms) e = t("booking.v.capacity", { rooms: g.rooms, room: room.name, n: room.capacity * g.rooms });
    if (n === 5 && !agree) e = t("booking.v.agree");
    if (!e && (n === 2 || n === 3)) {
      // Live check against the host calendar so closed dates / sold-out nights are caught before payment.
      try {
        const a = await hotelsService.availability(h.id, { roomId: room.id, checkIn: s.checkIn, checkOut: s.checkOut, rooms: g.rooms });
        if (!a.available) e = a.blockedDates.length ? t("booking.v.unavailableDates", { dates: a.blockedDates.map((d) => date(d, "d MMM")).join(", ") }) : t("hotel.soldOutDates");
      } catch { /* the server re-checks on submit */ }
    }
    setStepError(e);
    if (e) return false;
    if (n === 6) return form.trigger();
    return true;
  };
  const next = async () => { if (await validate(step)) setStep(step + 1); };
  const back = () => (step > 1 ? (setStepError(undefined), setStep(step - 1)) : navigate(hotelPath(h)));

  const pay = () => {
    setPayError(undefined);
    const d = form.getValues();
    // A real integration obtains this token from the provider's hosted field / wallet sheet.
    const paymentToken = simulateDecline ? "tok_decline" : method === "PAY_AT_HOTEL" ? undefined : `tok_mock_${method.toLowerCase()}`;
    create.mutate(
      { hotelId: h.id, roomId: room.id, checkIn: s.checkIn, checkOut: s.checkOut, guests: g, guest: { firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone }, specialRequests: d.requests || undefined, paymentMethod: method, paymentToken, acceptedPolicy: room.cancellationPolicy },
      {
        onSuccess: (b) => navigate(`/booking/confirmation/${b.id}`, { replace: true }),
        onError: (err) => {
          const e = err as unknown as ApiError;
          if (e.status === 402) setPayError(e.message);
          else if (e.status === 409) { setPayError(e.message); if (e.code === "NOT_AVAILABLE") { setStep(2); setStepError(e.message); } }
          else if (applyFieldErrors(e, form.setError)) { setStep(6); }
          else setPayError(e.message ?? t("errors.generic"));
        },
      },
    );
  };
  const fe = (k: keyof Details) => { const m = form.formState.errors[k]?.message; return m ? t(m as string, { defaultValue: m as string }) : undefined; };
  const methods: { v: Method; icon: typeof CreditCard; title: string; sub: string; show: boolean }[] = [
    { v: "CARD_ON_FILE", icon: CreditCard, title: t("booking.savedCard"), sub: t("booking.savedCardSub"), show: true },
    { v: "NEW_CARD", icon: CreditCard, title: t("booking.newCard"), sub: t("booking.newCardSub"), show: true },
    { v: "WALLET", icon: Smartphone, title: t("booking.wallet"), sub: t("booking.walletSub"), show: true },
    { v: "PAY_AT_HOTEL", icon: Building2, title: t("booking.payLater"), sub: t("booking.payLaterSub"), show: h.payLater },
  ];

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between gap-4 border-b border-line px-12 py-4 max-md:px-4">
        <Button variant="ghost" size="sm" onClick={back}><ArrowLeft className="rtl:rotate-180" /> {t("common.back")}</Button>
        <Link to="/" aria-label="Nuzul home"><Logo compact /></Link>
        <span className="flex items-center gap-1.5 text-[11px] text-ink-muted"><Lock className="size-3.5" /> <span className="max-sm:hidden">{t("booking.secure")}</span></span>
      </header>

      <ol aria-label={t("booking.step", { n: step })} className="scrollbar-none mx-auto flex max-w-[1180px] gap-1 overflow-x-auto px-12 pt-7 max-md:px-4">
        {STEPS.map((k, i) => (
          <li key={k} aria-current={step === i + 1 ? "step" : undefined} className="flex min-w-[88px] flex-1 flex-col gap-2">
            <span className={cn("h-[3px]", step >= i + 1 ? "bg-gold" : "bg-line")} />
            <span className={cn("flex items-center gap-1.5 text-[10px] font-semibold whitespace-nowrap", step >= i + 1 ? "text-navy" : "text-ink-muted")}>
              <i className={cn("grid size-[18px] place-items-center rounded-full text-[9px] not-italic", step > i + 1 ? "bg-gold text-white" : step === i + 1 ? "bg-navy text-white" : "bg-soft")}>{step > i + 1 ? <Check className="size-3" /> : i + 1}</i>
              {t(`booking.steps.${k}`)}
            </span>
          </li>
        ))}
      </ol>

      <div className="mx-auto mt-10 grid max-w-[1180px] grid-cols-[minmax(0,1fr)_360px] gap-14 px-12 max-lg:grid-cols-[1fr_300px] max-lg:gap-8 max-md:block max-md:px-4">
        <section aria-live="polite">
          <span className="eyebrow">{t("booking.step", { n: step })}</span>

          {step === 1 && <>
            <h1 className="text-[38px] max-md:text-[30px]">{t("booking.selectRoom")}</h1>
            <RadioGroup value={room.id} onValueChange={(v) => setParams({ room: v }, { replace: true })} className="flex flex-col gap-3" aria-label={t("booking.selectRoom")}>
              {h.rooms.map((r) => (
                <label key={r.id} htmlFor={`r-${r.id}`} className={cn("grid cursor-pointer grid-cols-[auto_96px_1fr_auto] items-center gap-4 border bg-paper p-3 max-sm:grid-cols-[auto_1fr_auto]", r.id === room.id ? "border-gold shadow-[inset_0_0_0_1px_var(--gold)]" : "border-line", r.available === 0 && "opacity-60")}>
                  <RadioItem id={`r-${r.id}`} value={r.id} disabled={r.available === 0} />
                  <img src={r.images[0]} alt="" className="h-16 w-24 object-cover max-sm:hidden" />
                  <span className="flex flex-col gap-1"><b className="text-[14px] text-navy">{r.name}</b>
                    <small className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted"><Users className="size-3" /> {r.capacity} · <BedDouble className="size-3" /> {r.beds} · {r.sizeM2} m²</small>
                    <small className="text-[11px] text-ink-muted">{t(`policy.short.${r.cancellationPolicy}`)} · {r.available === 0 ? t("hotel.soldOut") : t("hotel.nAvailable", { n: r.available })}</small></span>
                  <b className="text-end text-[15px] text-navy">{money(r.nightlyPrice, h.currency)}<small className="block text-[10px] font-normal text-ink-muted">{t("common.perNight")}</small></b>
                </label>
              ))}
            </RadioGroup>
          </>}

          {step === 2 && <>
            <h1 className="text-[38px] max-md:text-[30px]">{t("booking.selectDates")}</h1>
            <div className="border border-line bg-paper p-5">
              <Calendar mode="range" numberOfMonths={2} disabled={{ before: new Date() }} selected={{ from: parseISO(s.checkIn), to: parseISO(s.checkOut) }} onSelect={(r) => { if (r?.from) { s.set({ checkIn: toISODate(r.from), checkOut: toISODate(r.to ?? r.from) }); setStepError(undefined); } }} />
            </div>
            <div className="mt-5 flex items-start gap-3 bg-soft p-4"><CalendarDays className="size-5 shrink-0 text-gold" /><div><b className="text-[13px] text-navy">{range(s.checkIn, s.checkOut)} · {t("common.night", { count: nights })}</b><p className="m-0 text-[12px] text-ink-muted">{t("booking.minMax", { min: room.minStay, max: room.maxStay })} {nights >= 7 ? t("booking.longStayApplied", { pct: h.monthlyDiscountPct }) : t("booking.longStayHint")}</p></div></div>
          </>}

          {step === 3 && <>
            <h1 className="text-[38px] max-md:text-[30px]">{t("booking.whosComing")}</h1>
            <div className="border border-line bg-paper px-5">
              <Counter label={t("search.adults")} sub={t("search.adultsSub")} value={g.adults} min={1} onChange={(n) => s.set({ guests: { ...g, adults: n } })} />
              <Counter label={t("search.children")} sub={t("search.childrenSub")} value={g.children} onChange={(n) => s.set({ guests: { ...g, children: n } })} />
              <Counter label={t("search.infants")} sub={t("search.infantsSub")} value={g.infants} max={4} onChange={(n) => s.set({ guests: { ...g, infants: n } })} />
              <Counter label={t("search.rooms")} value={g.rooms} min={1} max={Math.max(1, room.available)} onChange={(n) => s.set({ guests: { ...g, rooms: n } })} />
            </div>
          </>}

          {step === 4 && <>
            <h1 className="text-[38px] max-md:text-[30px]">{t("booking.reviewPrice")}</h1>
            <div className="mb-5 flex items-center gap-4 border border-line bg-paper p-3"><img src={h.images[0]} alt="" className="h-20 w-28 object-cover" /><div className="flex flex-col items-start gap-1.5"><MatchPill score={h.match.score} hotelId={h.id} /><b className="text-navy">{h.name}</b><small className="text-[12px] text-ink-muted">{room.name} · {t("common.night", { count: nights })} · {t("common.guest", { count: totalGuests(g) })} · {t("common.room", { count: g.rooms })}</small></div></div>
            <div className="border border-line bg-paper p-5"><PriceLines nightly={room.nightlyPrice} nights={nights} rooms={g.rooms} currency={h.currency} longStayPct={h.monthlyDiscountPct} /></div>
            <p className="mt-3 text-[11px] text-ink-muted">{t("booking.currencyNote", { currency: h.currency })}</p>
          </>}

          {step === 5 && <>
            <h1 className="text-[38px] max-md:text-[30px]">{t("booking.reviewPolicies")}</h1>
            <div className="flex items-start gap-3 bg-soft p-5"><ShieldCheck className="size-5 shrink-0 text-success" /><div><b className="text-navy">{t("hotel.cancellation", { policy: t(`policy.${room.cancellationPolicy}`) })}</b><p className="m-0 mt-1 text-[13px] text-ink-muted">{t(`policy.long.${room.cancellationPolicy}`)}</p></div></div>
            <ol className="mt-5 grid grid-cols-4 gap-px bg-line max-sm:grid-cols-2" aria-label={t("trips.refund")}>
              {POLICY_CHECKPOINTS.map((d) => { const pct = refundPct(room.cancellationPolicy, d); return (
                <li key={d} className="flex flex-col gap-1 bg-paper p-3.5"><b className="text-[11px] text-navy">{t(`booking.refundAt.${d}`)}</b><em className={cn("text-[12px] not-italic", pct === 100 ? "text-success" : pct > 0 ? "text-warn" : "text-error")}>{t("booking.refundPct", { pct })}</em></li>
              ); })}
            </ol>
            <ul className="mt-5 flex flex-col gap-2 text-[13px] text-charcoal">
              {[t("booking.rule1", { time: h.checkIn, out: h.checkOut }), t("booking.rule2"), t("booking.rule3")].map((r) => <li key={r} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" /> {r}</li>)}
            </ul>
            <CheckRow id="agree" className="mt-5" label={t("booking.agree")} checked={agree} onCheckedChange={(v) => { setAgree(v); setStepError(undefined); }} />
          </>}

          {step === 6 && <form noValidate onSubmit={(e) => { e.preventDefault(); void next(); }}>
            <h1 className="text-[38px] max-md:text-[30px]">{t("booking.yourDetails")}</h1>
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <Field label={t("booking.firstName")} htmlFor="d-first" error={fe("firstName")}><Input id="d-first" autoComplete="given-name" aria-invalid={!!fe("firstName")} {...form.register("firstName")} /></Field>
              <Field label={t("booking.lastName")} htmlFor="d-last" error={fe("lastName")}><Input id="d-last" autoComplete="family-name" aria-invalid={!!fe("lastName")} {...form.register("lastName")} /></Field>
              <Field className="col-span-2 max-sm:col-span-1" label={t("booking.email")} htmlFor="d-email" error={fe("email")}><Input id="d-email" type="email" autoComplete="email" aria-invalid={!!fe("email")} {...form.register("email")} /></Field>
              <Field className="col-span-2 max-sm:col-span-1" label={t("booking.phone")} htmlFor="d-phone" error={fe("phone")}><Input id="d-phone" type="tel" autoComplete="tel" aria-invalid={!!fe("phone")} {...form.register("phone")} /></Field>
              <Field className="col-span-2 max-sm:col-span-1" label={<>{t("booking.requests")} <span className="font-normal text-ink-muted">({t("common.optional")})</span></>} htmlFor="d-req"><Textarea id="d-req" placeholder={t("booking.requestsPh")} {...form.register("requests")} /></Field>
            </div>
            <button type="submit" hidden />
          </form>}

          {step === 7 && <>
            <h1 className="text-[38px] max-md:text-[30px]">{t("booking.payment")}</h1>
            <RadioGroup value={method} onValueChange={(v) => { setMethod(v as Method); setPayError(undefined); }} className="flex flex-col gap-3" aria-label={t("booking.payment")}>
              {methods.filter((m) => m.show).map(({ v, icon: I, title, sub }) => (
                <label key={v} htmlFor={`pm-${v}`} className={cn("flex cursor-pointer items-center gap-3.5 border bg-paper p-4", method === v ? "border-gold shadow-[inset_0_0_0_1px_var(--gold)]" : "border-line")}>
                  <RadioItem id={`pm-${v}`} value={v} /><I className="size-5 text-gold" /><span className="flex flex-col"><b className="text-[13px] text-navy">{title}</b><small className="text-[11px] text-ink-muted">{sub}</small></span>
                </label>
              ))}
            </RadioGroup>
            {method === "NEW_CARD" && <div className="mt-3 flex items-start gap-2.5 border border-dashed border-gold bg-[#fbf6ec] p-4 text-[12px] text-charcoal"><Lock className="mt-0.5 size-4 shrink-0 text-gold" /> {t("booking.providerField")}</div>}
            <ol className="mt-5 grid grid-cols-3 gap-px bg-line text-[11px] max-sm:grid-cols-1">
              {[t("booking.flow1"), h.instantBook ? t("booking.flow2Instant") : t("booking.flow2"), t("booking.flow3")].map((x, i) => <li key={x} className="flex items-center gap-2 bg-paper p-3 text-navy"><b className="grid size-5 place-items-center rounded-full bg-navy text-[10px] text-white">{i + 1}</b>{x}</li>)}
            </ol>
            {payError && <div role="alert" className="mt-5 flex items-start gap-2.5 bg-error-bg p-4 text-[13px] text-error"><TriangleAlert className="mt-0.5 size-4 shrink-0" /><span><b>{t("booking.failedTitle")}</b> — {payError}</span></div>}
            <CheckRow id="sim" className="mt-4 text-ink-muted" label={t("booking.simulate")} checked={simulateDecline} onCheckedChange={setSimulateDecline} />
          </>}

          {stepError && <p role="alert" className="mt-4 flex items-center gap-2 text-[12px] font-semibold text-error"><TriangleAlert className="size-4" /> {stepError}</p>}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-6">
            {step > 1 ? <Button variant="text" onClick={back}>{t("common.back")}</Button> : <span />}
            {step < 7 ? <Button variant="gold" size="lg" onClick={() => void next()}>{t("common.continue")} <ArrowRight className="rtl:rotate-180" /></Button>
              : <Button variant="gold" size="lg" disabled={create.isPending} onClick={pay}>{create.isPending ? t("booking.authorising") : method === "PAY_AT_HOTEL" ? t("booking.reserve") : t("booking.pay", { amount: money(price.total, h.currency) })}</Button>}
          </div>
        </section>

        <aside className="sticky top-6 self-start border border-line bg-paper p-5 max-md:mt-10 max-md:static">
          <div className="mb-4 flex items-center gap-3"><img src={h.images[0]} alt="" className="h-16 w-20 object-cover" /><span className="flex flex-col"><b className="text-[13px] text-navy">{h.name}</b><small className="text-[11px] text-ink-muted">{room.name}</small><small className="text-[11px] text-ink-muted">{range(s.checkIn, s.checkOut)} · {t("common.guest", { count: totalGuests(g) })}</small></span></div>
          {nights > 0 && <PriceLines nightly={room.nightlyPrice} nights={nights} rooms={g.rooms} currency={h.currency} longStayPct={h.monthlyDiscountPct} />}
          <p className="mt-4 mb-0 flex items-center gap-2 text-[11px] text-ink-muted"><ShieldCheck className="size-3.5 text-success" /> {t(`policy.short.${room.cancellationPolicy}`)}</p>
        </aside>
      </div>
    </div>
  );
}
