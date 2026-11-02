/* Host listings & listing editor (§41, §43–44): status, verification, completion, and per-section editing. */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Accessibility, Check, Eye, MapPin, Pencil, Plus, Upload, X } from "lucide-react";
import type { CancellationPolicy, Hotel, PropertyType } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CheckRow } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Bar, Chip, EmptyState, ErrorState } from "@/components/common";
import { DataTable, Toolbar } from "@/components/dashboard";
import { useCategories, useHostHotels, useUpdateHostHotel } from "@/hooks/queries";
import { ACCESSIBILITY, AMENITIES, amenityIcon } from "@/lib/icons";
import { errorMessage } from "@/lib/forms";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";
import { STATUS_TONE, completion } from "./host-utils";

const SECTIONS = ["basics", "description", "photos", "amenities", "accessibility", "location", "policies", "checkin", "categories"] as const;
type Section = (typeof SECTIONS)[number];
const TYPES: PropertyType[] = ["HOTEL", "RESORT", "APARTMENT", "VILLA", "ENTIRE_PROPERTY"];
const POLICIES: CancellationPolicy[] = ["NON_REFUNDABLE", "FLEXIBLE", "MODERATE", "STRICT"];

export default function HostListings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, error, refetch } = useHostHotels();
  const editing = data?.find((h) => h.id === params.get("edit"));
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <Toolbar title={t("host.listings.title")} sub={t("host.listings.sub", { count: data?.length ?? 0 })}><Button variant="gold" onClick={() => navigate("/host/listings/new")}><Plus /> {t("host.addListing")}</Button></Toolbar>
      {isLoading ? <div className="skeleton h-60" /> : (
        <DataTable caption={t("host.listings.title")} rows={data ?? []} rowKey={(h) => h.id} empty={<EmptyState title={t("host.listings.empty")} text={t("host.listings.emptyText")} action={t("host.addListing")} onAction={() => navigate("/host/listings/new")} />} cols={[
          { head: t("host.col.property"), cell: (h) => <span className="flex items-center gap-3"><img src={h.images[0]} alt="" className="h-10 w-14 object-cover" /><span className="flex flex-col"><b className="text-navy">{h.name}</b><small className="text-ink-muted">{h.city}</small></span></span> },
          { head: t("common.status"), cell: (h) => <Badge tone={STATUS_TONE[h.status]}>{t(`host.status.${h.status}`)}</Badge> },
          { head: t("host.col.verification"), cell: (h) => <Badge tone={h.verification === "BASIC" ? "neutral" : "success"}>{t(`host.verification.${h.verification}`)}</Badge> },
          { head: t("host.col.rooms"), cell: (h) => t("host.roomTypes", { count: h.rooms.length }) },
          { head: t("match.rating"), cell: (h) => (h.reviewCount ? `★ ${h.rating}` : t("host.new")) },
          { head: t("host.col.completion"), cell: (h) => <span className="flex items-center gap-2"><Bar value={completion(h)} className="w-20" label={t("host.col.completion")} /> {completion(h)}%</span> },
          { head: "", cell: (h) => <Button size="sm" variant="outline" onClick={() => setParams({ edit: h.id })}><Pencil /> {t("common.edit")}</Button> },
        ]} />
      )}
      {editing && <Editor key={editing.id} hotel={editing} onClose={() => setParams({})} />}
    </>
  );
}

function Editor({ hotel, onClose }: { hotel: Hotel; onClose: () => void }) {
  const { t } = useTranslation();
  const [sec, setSec] = useState<Section>("basics");
  const [d, setD] = useState<Hotel>(hotel);
  useEffect(() => setD(hotel), [hotel]);
  const save = useUpdateHostHotel();
  const { data: cats } = useCategories();
  const dirty = useMemo(() => JSON.stringify(d) !== JSON.stringify(hotel), [d, hotel]);
  const toggle = (k: "amenities" | "accessibility" | "categories", v: string) => setD({ ...d, [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v] });
  const descErr = d.description.trim().length < 40 ? t("host.v.description") : undefined;
  const submit = () => {
    if (!d.name.trim() || descErr) { toast.error(t("host.v.fix")); return; }
    const { id, ...patch } = d;
    save.mutate({ id, patch }, { onSuccess: () => toast.success(t("host.saved")) });
  };
  return (
    <section className="grid grid-cols-[220px_1fr] border border-line bg-paper max-md:grid-cols-1" aria-label={t("host.listings.edit")}>
      <nav className="flex flex-col border-e border-line p-3 max-md:flex-row max-md:overflow-x-auto max-md:border-e-0 max-md:border-b">
        {SECTIONS.map((k) => <button key={k} type="button" aria-current={sec === k} onClick={() => setSec(k)} className={cn("flex items-center gap-2 rounded-md px-3 py-2.5 text-start text-[12px] whitespace-nowrap", sec === k ? "bg-navy text-white" : "text-navy hover:bg-soft")}><Check className="size-3.5" /> {t(`host.sec.${k}`)}</button>)}
      </nav>
      <div className="p-6 max-md:p-4">
        <div className="mb-5 flex items-start justify-between gap-3"><div><span className="eyebrow">{t("host.listings.edit")}</span><h2 className="m-0 text-[22px]">{hotel.name} · {t(`host.sec.${sec}`)}</h2></div><Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("common.close")}><X /></Button></div>
        {sec === "basics" && <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field label={t("host.f.name")} htmlFor="e-name" error={!d.name.trim() ? t("host.v.name") : undefined}><Input id="e-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
          <Field label={t("filters.property")} htmlFor="e-type"><Select id="e-type" value={d.propertyType} onValueChange={(v) => setD({ ...d, propertyType: v as PropertyType })} options={TYPES.map((x) => ({ value: x, label: t(`filters.type.${x}`) }))} /></Field>
          <Field label={t("host.f.category")} htmlFor="e-cat"><Input id="e-cat" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} /></Field>
          <Field label={t("host.f.city")} htmlFor="e-city"><Input id="e-city" value={d.city} onChange={(e) => setD({ ...d, city: e.target.value })} /></Field>
        </div>}
        {sec === "description" && <Field label={t("host.f.description")} htmlFor="e-desc" error={descErr} hint={`${d.description.length} / 2000`}><Textarea id="e-desc" rows={7} maxLength={2000} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></Field>}
        {sec === "photos" && <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
          {d.images.map((src, i) => <figure key={src + i} className="relative m-0"><img src={src} alt="" className="aspect-[4/3] w-full object-cover" /><figcaption className="mt-1 text-[10px] text-ink-muted">{i === 0 ? t("host.cover") : `#${i + 1}`}</figcaption>
            {i > 0 && <div className="absolute end-1.5 top-1.5 flex gap-1"><button type="button" className="rounded bg-paper/90 px-1.5 py-0.5 text-[10px] font-bold text-navy" onClick={() => setD({ ...d, images: [src, ...d.images.filter((x) => x !== src)] })}>{t("host.makeCover")}</button><button type="button" aria-label={t("common.remove")} className="grid size-5 place-items-center rounded bg-paper/90 text-error" onClick={() => setD({ ...d, images: d.images.filter((_, j) => j !== i) })}><X className="size-3" /></button></div>}</figure>)}
          <button type="button" onClick={() => toast.info(t("host.uploadNote"))} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 border border-dashed border-gold text-[11px] text-navy"><Upload className="size-5 text-gold" /> {t("host.upload")}<small className="text-[10px] text-ink-muted">{t("host.uploadRules")}</small></button>
        </div>}
        {sec === "amenities" && <div className="grid grid-cols-3 gap-x-4 max-md:grid-cols-2">{AMENITIES.map((a) => { const I = amenityIcon(a); return <CheckRow key={a} id={`am-${a}`} label={<span className="flex items-center gap-2"><I className="size-4 text-gold" />{a}</span>} checked={d.amenities.includes(a)} onCheckedChange={() => toggle("amenities", a)} />; })}</div>}
        {sec === "accessibility" && <div className="grid grid-cols-2 gap-x-4 max-sm:grid-cols-1">{ACCESSIBILITY.map((a) => <CheckRow key={a} id={`ac-${a}`} label={<span className="flex items-center gap-2"><Accessibility className="size-4 text-gold" />{a}</span>} checked={d.accessibility.includes(a)} onCheckedChange={() => toggle("accessibility", a)} />)}</div>}
        {sec === "location" && <>
          <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
            <Field className="col-span-3 max-md:col-span-1" label={t("host.f.address")} htmlFor="e-area"><Input id="e-area" value={d.area} onChange={(e) => setD({ ...d, area: e.target.value })} /></Field>
            <Field label={t("host.f.lat")} htmlFor="e-lat"><Input id="e-lat" type="number" step="0.0001" value={d.coordinates.lat} onChange={(e) => setD({ ...d, coordinates: { ...d.coordinates, lat: Number(e.target.value) } })} /></Field>
            <Field label={t("host.f.lng")} htmlFor="e-lng"><Input id="e-lng" type="number" step="0.0001" value={d.coordinates.lng} onChange={(e) => setD({ ...d, coordinates: { ...d.coordinates, lng: Number(e.target.value) } })} /></Field>
          </div>
          <h4 className="mt-6 mb-2 text-[13px]">{t("host.nearby")}</h4>
          {d.nearby.map((n, i) => <div key={i} className="mb-2 grid grid-cols-[auto_2fr_1fr_1fr_auto] items-center gap-2 max-md:grid-cols-[auto_1fr_auto]"><MapPin className="size-4 text-gold" /><Input aria-label={t("host.f.name")} value={n.name} onChange={(e) => setD({ ...d, nearby: d.nearby.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="min-h-10" /><Input aria-label="km" type="number" value={n.distanceKm} onChange={(e) => setD({ ...d, nearby: d.nearby.map((x, j) => (j === i ? { ...x, distanceKm: Number(e.target.value) } : x)) })} className="min-h-10 max-md:hidden" /><Input aria-label={t("host.f.travel")} value={n.travelTime} onChange={(e) => setD({ ...d, nearby: d.nearby.map((x, j) => (j === i ? { ...x, travelTime: e.target.value } : x)) })} className="min-h-10 max-md:hidden" /><Button variant="ghost" size="icon-sm" aria-label={t("common.remove")} onClick={() => setD({ ...d, nearby: d.nearby.filter((_, j) => j !== i) })}><X /></Button></div>)}
          <Button variant="text" size="sm" onClick={() => setD({ ...d, nearby: [...d.nearby, { name: "", kind: "ATTRACTION", distanceKm: 1, travelTime: "5 min" }] })}><Plus /> {t("host.addNearby")}</Button>
        </>}
        {sec === "policies" && <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field label={t("host.f.cancellation")} htmlFor="e-pol" hint={t(`policy.short.${d.cancellationPolicy}`)}><Select id="e-pol" value={d.cancellationPolicy} onValueChange={(v) => setD({ ...d, cancellationPolicy: v as CancellationPolicy })} options={POLICIES.map((p) => ({ value: p, label: t(`policy.${p}`) }))} /></Field>
          <Field label={t("host.f.monthlyDiscount")} htmlFor="e-md"><Input id="e-md" type="number" min={0} max={60} value={d.monthlyDiscountPct} onChange={(e) => setD({ ...d, monthlyDiscountPct: Number(e.target.value) })} /></Field>
          <CheckRow id="e-pets" label={t("search.pets")} checked={d.petsAllowed} onCheckedChange={(v) => setD({ ...d, petsAllowed: v })} />
          <CheckRow id="e-instant" label={t("filters.instantBook")} checked={d.instantBook} onCheckedChange={(v) => setD({ ...d, instantBook: v })} />
          <CheckRow id="e-later" label={t("filters.payLater")} checked={d.payLater} onCheckedChange={(v) => setD({ ...d, payLater: v })} />
        </div>}
        {sec === "checkin" && <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field label={t("hotel.checkInLabel")} htmlFor="e-in"><Input id="e-in" type="time" value={d.checkIn} onChange={(e) => setD({ ...d, checkIn: e.target.value })} /></Field>
          <Field label={t("hotel.checkOutLabel")} htmlFor="e-out"><Input id="e-out" type="time" value={d.checkOut} onChange={(e) => setD({ ...d, checkOut: e.target.value })} /></Field>
        </div>}
        {sec === "categories" && <><div className="flex flex-wrap gap-2">{cats?.filter((c) => c.active).map((c) => <Chip key={c.id} active={d.categories.includes(c.name)} onClick={() => (d.categories.includes(c.name) || d.categories.length < 6 ? toggle("categories", c.name) : toast.info(t("host.maxCategories")))}>{c.name}</Chip>)}</div><p className="mt-3 text-[11px] text-ink-muted">{t("host.categoriesNote")}</p></>}
        {save.error && <p role="alert" className="mt-4 text-[12px] font-semibold text-error">{errorMessage(save.error, t("errors.generic"))}</p>}
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          <Button variant="gold" disabled={!dirty || save.isPending} onClick={submit}>{t("common.saveChanges")}</Button>
          <Button variant="outline" disabled={!dirty} onClick={() => setD(hotel)}>{t("common.reset")}</Button>
          <Button variant="outline" asChild><Link to={hotelPath(hotel)} target="_blank"><Eye /> {t("host.preview")}</Link></Button>
        </div>
      </div>
    </section>
  );
}

