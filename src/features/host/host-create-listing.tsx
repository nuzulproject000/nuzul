/* Become a host / create listing wizard (§43, §45 verification). Submits to POST /host/hotels;
 * documents are captured as file names only — secure upload is backend-dependent. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, Check, Plus, ShieldCheck, TrendingUp, Upload, Users, X } from "lucide-react";
import type { CancellationPolicy, PropertyType, RoomType } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CheckRow, RadioGroup, RadioItem } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { useHostMutation } from "@/hooks/queries";
import { hostService } from "@/services/ops.service";
import { ACCESSIBILITY, AMENITIES } from "@/lib/icons";
import { errorMessage } from "@/lib/forms";
import { cn } from "@/lib/utils";

const STEPS = ["intro", "basics", "rooms", "photos", "amenities", "pricing", "availability", "policies", "verification", "publish"] as const;
const DOCS = ["identity", "business", "license", "location", "insurance", "contact"] as const;
type RoomDraft = { name: string; type: RoomType; capacity: number; units: number; price: number };

export default function HostCreateListing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState<Record<string, string>>({});
  const [f, setF] = useState({ name: "", type: "HOTEL" as PropertyType, city: "", area: "", description: "", amenities: ["Wi-Fi"] as string[], accessibility: [] as string[], price: 6500, weekendPct: 15, longStayPct: 10, monthlyPct: 22, openFrom: "", minStay: 1, maxStay: 30, policy: "FLEXIBLE" as CancellationPolicy });
  const [rooms, setRooms] = useState<RoomDraft[]>([{ name: "Deluxe Double", type: "DOUBLE", capacity: 2, units: 24, price: 6500 }]);
  const [docs, setDocs] = useState<Partial<Record<(typeof DOCS)[number], string>>>({});
  const create = useHostMutation(hostService.createHotel);

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 1) { if (!f.name.trim()) e.name = t("host.v.name"); if (!f.city.trim()) e.city = t("host.v.city"); if (f.description.trim().length < 40) e.description = t("host.v.description"); }
    if (step === 2 && (!rooms.length || rooms.some((r) => !r.name.trim() || r.price <= 0 || r.units < 1))) e.rooms = t("host.v.rooms");
    if (step === 5 && f.price <= 0) e.price = t("host.v.price");
    if (step === 6 && f.minStay > f.maxStay) e.stay = t("host.v.stay");
    setErr(e);
    return !Object.keys(e).length;
  };
  const next = () => validate() && setStep(step + 1);
  const submit = () => create.mutate({ name: f.name, propertyType: f.type, city: f.city, area: f.area, description: f.description, amenities: f.amenities, accessibility: f.accessibility, cancellationPolicy: f.policy, fromPrice: f.price, monthlyDiscountPct: f.monthlyPct }, {
    onSuccess: () => { toast.success(t("host.wizard.submitted")); navigate("/host/listings"); },
    onError: (e) => { setErr({ submit: errorMessage(e, t("errors.generic")) }); },
  });
  const tog = (k: "amenities" | "accessibility", v: string) => setF({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] });

  return (
    <div className="grid grid-cols-[230px_1fr] gap-4 max-md:grid-cols-1">
      <ol className="flex flex-col gap-1 border border-line bg-paper p-3 max-md:flex-row max-md:overflow-x-auto" aria-label={t("host.wizard.steps")}>
        {STEPS.map((k, i) => <li key={k} aria-current={i === step ? "step" : undefined} className={cn("flex items-center gap-2 rounded-md px-2.5 py-2 text-[12px] whitespace-nowrap", i === step ? "bg-navy text-white" : i < step ? "text-navy" : "text-ink-muted")}><i className={cn("grid size-5 place-items-center rounded-full text-[10px] not-italic", i < step ? "bg-gold text-white" : i === step ? "bg-white text-navy" : "bg-soft")}>{i < step ? <Check className="size-3" /> : i + 1}</i>{t(`host.wizard.${k}`)}</li>)}
      </ol>
      <section className="border border-line bg-paper p-7 max-md:p-4">
        <span className="eyebrow">{t("host.wizard.step", { n: step + 1, total: STEPS.length })}</span>
        {step === 0 && <><h2>{t("host.wizard.introTitle")}</h2><p className="text-ink-muted">{t("host.wizard.introText")}</p>
          <ul className="mt-5 flex flex-col gap-3 text-[13px] text-navy [&_svg]:size-5 [&_svg]:text-gold">{[[Users, "host.wizard.b1"], [TrendingUp, "host.wizard.b2"], [ShieldCheck, "host.wizard.b3"]].map(([I, k]) => { const Icon = I as typeof Users; return <li key={k as string} className="flex items-center gap-3"><Icon /> {t(k as string)}</li>; })}</ul></>}
        {step === 1 && <><h2>{t("host.wizard.basics")}</h2><div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field label={t("host.f.name")} htmlFor="w-name" error={err.name}><Input id="w-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nile Garden Residence" aria-invalid={!!err.name} /></Field>
          <Field label={t("filters.property")} htmlFor="w-type"><Select id="w-type" value={f.type} onValueChange={(v) => setF({ ...f, type: v as PropertyType })} options={(["HOTEL", "RESORT", "APARTMENT", "VILLA", "ENTIRE_PROPERTY"] as const).map((x) => ({ value: x, label: t(`filters.type.${x}`) }))} /></Field>
          <Field label={t("host.f.city")} htmlFor="w-city" error={err.city}><Input id="w-city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} aria-invalid={!!err.city} /></Field>
          <Field label={t("host.f.address")} htmlFor="w-area"><Input id="w-area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field>
          <Field className="col-span-2 max-sm:col-span-1" label={t("host.f.description")} htmlFor="w-desc" error={err.description} hint={`${f.description.trim().length}/40+`}><Textarea id="w-desc" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} aria-invalid={!!err.description} /></Field>
        </div></>}
        {step === 2 && <><h2>{t("host.wizard.rooms")}</h2>
          {rooms.map((r, i) => <div key={i} className="mb-2 grid grid-cols-[2fr_1fr_80px_80px_110px_auto] items-end gap-2 max-md:grid-cols-2">
            <Field label={t("host.f.roomName")} htmlFor={`rn-${i}`}><Input id={`rn-${i}`} value={r.name} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="min-h-10" /></Field>
            <Field label={t("filters.roomType")} htmlFor={`rt-${i}`}><Select id={`rt-${i}`} value={r.type} onValueChange={(v) => setRooms(rooms.map((x, j) => (j === i ? { ...x, type: v as RoomType } : x)))} options={(["SINGLE", "DOUBLE", "TRIPLE", "SUITE", "FAMILY", "APARTMENT"] as const).map((x) => ({ value: x, label: t(`match.room.${x}`) }))} className="min-h-10" /></Field>
            <Field label={t("host.f.capacity")} htmlFor={`rc-${i}`}><Input id={`rc-${i}`} type="number" min={1} value={r.capacity} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, capacity: Number(e.target.value) } : x)))} className="min-h-10" /></Field>
            <Field label={t("host.f.units")} htmlFor={`ru-${i}`}><Input id={`ru-${i}`} type="number" min={1} value={r.units} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, units: Number(e.target.value) } : x)))} className="min-h-10" /></Field>
            <Field label={t("host.f.price")} htmlFor={`rp-${i}`}><Input id={`rp-${i}`} type="number" min={1} value={r.price} onChange={(e) => setRooms(rooms.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))} className="min-h-10" /></Field>
            <Button variant="ghost" size="icon-sm" aria-label={t("common.remove")} onClick={() => setRooms(rooms.filter((_, j) => j !== i))}><X /></Button>
          </div>)}
          <Button variant="outline" size="sm" onClick={() => setRooms([...rooms, { name: "", type: "DOUBLE", capacity: 2, units: 1, price: f.price }])}><Plus /> {t("host.addRoomType")}</Button>
          {err.rooms && <p role="alert" className="mt-3 text-[12px] font-semibold text-error">{err.rooms}</p>}</>}
        {step === 3 && <><h2>{t("host.wizard.photos")}</h2><p className="text-[13px] text-ink-muted">{t("host.wizard.photosText")}</p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-gold p-10 text-[13px] text-navy"><Upload className="size-6 text-gold" /> {t("host.upload")}<small className="text-ink-muted">{t("host.uploadRules")}</small><input type="file" accept="image/jpeg,image/png" multiple className="sr-only" onChange={(e) => toast.info(t("host.filesSelected", { count: e.target.files?.length ?? 0 }))} /></label></>}
        {step === 4 && <><h2>{t("host.wizard.amenities")}</h2><div className="grid grid-cols-3 gap-x-4 max-md:grid-cols-2">{AMENITIES.map((a) => <CheckRow key={a} id={`wa-${a}`} label={a} checked={f.amenities.includes(a)} onCheckedChange={() => tog("amenities", a)} />)}</div>
          <h4 className="mt-5 mb-2 text-[13px]">{t("filters.accessibility")}</h4><div className="grid grid-cols-3 gap-x-4 max-md:grid-cols-2">{ACCESSIBILITY.map((a) => <CheckRow key={a} id={`wx-${a}`} label={a} checked={f.accessibility.includes(a)} onCheckedChange={() => tog("accessibility", a)} />)}</div></>}
        {step === 5 && <><h2>{t("host.wizard.pricing")}</h2><div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field label={t("host.f.basePrice")} htmlFor="w-price" error={err.price}><Input id="w-price" type="number" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></Field>
          <Field label={t("host.pricing.weekend")} htmlFor="w-wk"><Input id="w-wk" type="number" value={f.weekendPct} onChange={(e) => setF({ ...f, weekendPct: Number(e.target.value) })} /></Field>
          <Field label={t("host.pricing.longStay")} htmlFor="w-ls"><Input id="w-ls" type="number" value={f.longStayPct} onChange={(e) => setF({ ...f, longStayPct: Number(e.target.value) })} /></Field>
          <Field label={t("host.pricing.monthly")} htmlFor="w-mo"><Input id="w-mo" type="number" value={f.monthlyPct} onChange={(e) => setF({ ...f, monthlyPct: Number(e.target.value) })} /></Field>
        </div></>}
        {step === 6 && <><h2>{t("host.wizard.availability")}</h2><div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
          <Field label={t("host.f.openFrom")} htmlFor="w-open"><Input id="w-open" type="date" value={f.openFrom} onChange={(e) => setF({ ...f, openFrom: e.target.value })} /></Field>
          <Field label={t("host.f.minStay")} htmlFor="w-min" error={err.stay}><Input id="w-min" type="number" min={1} value={f.minStay} onChange={(e) => setF({ ...f, minStay: Number(e.target.value) })} /></Field>
          <Field label={t("host.f.maxStay")} htmlFor="w-max"><Input id="w-max" type="number" min={1} value={f.maxStay} onChange={(e) => setF({ ...f, maxStay: Number(e.target.value) })} /></Field>
        </div></>}
        {step === 7 && <><h2>{t("host.wizard.policies")}</h2>
          <RadioGroup value={f.policy} onValueChange={(v) => setF({ ...f, policy: v as CancellationPolicy })} className="grid grid-cols-2 gap-3 max-sm:grid-cols-1" aria-label={t("host.f.cancellation")}>
            {(["NON_REFUNDABLE", "FLEXIBLE", "MODERATE", "STRICT"] as const).map((p) => <label key={p} htmlFor={`wp-${p}`} className={cn("flex cursor-pointer items-start gap-3 border p-4", f.policy === p ? "border-gold shadow-[inset_0_0_0_1px_var(--gold)]" : "border-line")}><RadioItem id={`wp-${p}`} value={p} className="mt-0.5" /><span><b className="text-[13px] text-navy">{t(`policy.${p}`)}</b><small className="block text-[11px] text-ink-muted">{t(`policy.long.${p}`)}</small></span></label>)}
          </RadioGroup></>}
        {step === 8 && <><h2>{t("host.wizard.verification")}</h2>
          <ul className="flex flex-col">{DOCS.map((k) => <li key={k} className="flex items-center gap-3 border-b border-line py-3.5">{docs[k] ? <BadgeCheck className="size-5 text-success" /> : <Upload className="size-5 text-gold" />}<span className="flex flex-1 flex-col"><b className="text-[13px] text-navy">{t(`host.docs.${k}`)}</b><small className="text-[11px] text-ink-muted">{docs[k] ?? t(`host.docs.${k}Sub`)}</small></span>
            <Badge tone={docs[k] ? "warn" : "neutral"}>{docs[k] ? t("host.docs.submitted") : t("host.docs.missing")}</Badge>
            <label className="cursor-pointer text-[12px] font-bold text-gold">{t("host.docs.choose")}<input type="file" className="sr-only" accept=".pdf,image/*" onChange={(e) => e.target.files?.[0] && setDocs({ ...docs, [k]: e.target.files[0].name })} /></label></li>)}</ul>
          <p className="mt-3 text-[11px] text-ink-muted">{t("host.docs.levels")}</p></>}
        {step === 9 && <><h2>{t("host.wizard.publishTitle")}</h2><p className="flex items-start gap-2 bg-success-bg p-4 text-[13px] text-success"><Check className="size-4 shrink-0" /> {t("host.wizard.publishText")}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 text-[13px]"><dt className="text-ink-muted">{t("host.f.name")}</dt><dd className="m-0 text-navy">{f.name}</dd><dt className="text-ink-muted">{t("host.f.city")}</dt><dd className="m-0 text-navy">{f.city}</dd><dt className="text-ink-muted">{t("host.wizard.rooms")}</dt><dd className="m-0 text-navy">{rooms.length}</dd><dt className="text-ink-muted">{t("host.wizard.verification")}</dt><dd className="m-0 text-navy">{Object.keys(docs).length}/{DOCS.length}</dd></dl>
          {err.submit && <p role="alert" className="mt-3 text-[12px] font-semibold text-error">{err.submit}</p>}</>}
        <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
          <Button variant="text" disabled={step === 0} onClick={() => setStep(step - 1)}>{t("common.back")}</Button>
          {step < STEPS.length - 1 ? <Button variant="gold" onClick={next}>{t("common.continue")} <ArrowRight className="rtl:rotate-180" /></Button> : <Button variant="gold" disabled={create.isPending} onClick={submit}>{t("host.wizard.submit")}</Button>}
        </div>
      </section>
    </div>
  );
}
