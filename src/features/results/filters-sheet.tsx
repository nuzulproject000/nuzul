/* Comprehensive filter system (§14, §52, §77). Draft state + live result count from the API. */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { PropertyType, RoomType } from "@/types/models";
import type { HotelSearchParams } from "@/types/api";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CheckRow, Slider } from "@/components/ui/controls";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SegButtons } from "@/components/common";
import { useHotelSearch } from "@/hooks/queries";
import { ACCESSIBILITY, AMENITIES } from "@/lib/icons";
import { EMPTY_FILTERS, toSearchParams, type ResultFilters } from "./use-result-filters";

const TYPES: PropertyType[] = ["HOTEL", "RESORT", "APARTMENT", "VILLA", "ENTIRE_PROPERTY"];
const ROOM_TYPES: RoomType[] = ["SINGLE", "DOUBLE", "TRIPLE", "SUITE", "FAMILY", "APARTMENT"];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="border-b border-line py-5"><legend className="sr-only">{title}</legend><h3 className="mb-3 text-sm">{title}</h3>{children}</fieldset>;
}

export function FiltersSheet({ open, onOpenChange, value, onApply, base }: { open: boolean; onOpenChange: (o: boolean) => void; value: ResultFilters; onApply: (f: ResultFilters) => void; base: Partial<HotelSearchParams> }) {
  const { t } = useTranslation();
  const [d, setD] = useState<ResultFilters>(value);
  useEffect(() => { if (open) setD(value); }, [open, value]);
  const { data: preview, isFetching } = useHotelSearch({ ...toSearchParams(d, base), pageSize: 1 });
  const toggle = <K extends "propertyTypes" | "amenities" | "accessibility">(k: K, v: string) => setD((x) => ({ ...x, [k]: (x[k] as string[]).includes(v) ? (x[k] as string[]).filter((y) => y !== v) : [...(x[k] as string[]), v] }));
  const flag = (k: keyof ResultFilters, label: string) => <CheckRow id={`f-${k}`} label={label} checked={!!d[k]} onCheckedChange={(v) => setD({ ...d, [k]: v })} />;
  const count = preview?.total ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={t("filters.title")} footer={<><Button variant="text" onClick={() => setD(EMPTY_FILTERS)}>{t("common.clearAll")}</Button><Button onClick={() => { onApply(d); onOpenChange(false); }} disabled={isFetching && !preview}>{t("filters.show", { count })}</Button></>}>
        <Group title={t("filters.personalized")}>
          {flag("highMatch", t("filters.highMatch"))}{flag("recommended", t("filters.recommended"))}{flag("matchesPrefs", t("filters.matchesPrefs"))}
          <p className="mt-3 mb-2 text-[11px] text-ink-muted">{t("filters.minMatch")}</p>
          <SegButtons<number> ariaLabel={t("filters.minMatch")} value={d.minMatch ?? 0} onChange={(v) => setD({ ...d, minMatch: v || undefined })} options={[0, 70, 80, 90, 95].map((v) => ({ value: v, label: v ? `${v}%+` : t("filters.any") }))} />
        </Group>
        <Group title={t("filters.price")}>
          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-[10px] text-ink-muted">{t("filters.min")}<Input type="number" inputMode="numeric" min={0} value={d.minPrice ?? ""} onChange={(e) => setD({ ...d, minPrice: e.target.value ? Number(e.target.value) : undefined })} className="min-h-10" /></label>
            <span className="pb-2.5">—</span>
            <label className="flex flex-1 flex-col gap-1 text-[10px] text-ink-muted">{t("filters.max")}<Input type="number" inputMode="numeric" min={0} value={d.maxPrice ?? ""} onChange={(e) => setD({ ...d, maxPrice: e.target.value ? Number(e.target.value) : undefined })} className="min-h-10" /></label>
          </div>
          <Slider className="mt-3" min={0} max={80000} step={500} value={[d.minPrice ?? 0, d.maxPrice ?? 80000]} thumbLabels={[t("filters.min"), t("filters.max")]} onValueChange={([a, b]) => setD({ ...d, minPrice: a || undefined, maxPrice: b >= 80000 ? undefined : b })} />
        </Group>
        <Group title={t("filters.rating")}>
          <SegButtons<number> ariaLabel={t("filters.rating")} value={d.minRating ?? 0} onChange={(v) => setD({ ...d, minRating: v || undefined })} options={[0, 4, 4.5, 4.7, 4.8].map((v) => ({ value: v, label: v ? `${v}+` : t("filters.any") }))} />
        </Group>
        <Group title={t("filters.quality")}>{flag("guestFavorite", t("filters.guestFavorite"))}{flag("highlyRated", t("filters.highlyRated"))}</Group>
        <Group title={t("filters.property")}>
          <div className="grid grid-cols-2 gap-x-4 max-sm:grid-cols-1">{TYPES.map((v) => <CheckRow key={v} id={`pt-${v}`} label={t(`filters.type.${v}`)} checked={d.propertyTypes.includes(v)} onCheckedChange={() => toggle("propertyTypes", v)} />)}</div>
        </Group>
        <Group title={t("filters.rooms")}>
          {([["minCapacity", t("filters.beds")], ["minBathrooms", t("filters.bathrooms")]] as const).map(([k, label]) => (
            <div key={k} className="mb-3 flex items-center justify-between gap-3 text-[13px] text-navy"><span>{label}</span>
              <SegButtons<number> ariaLabel={label} value={d[k] ?? 0} onChange={(v) => setD({ ...d, [k]: v || undefined })} options={[0, 1, 2, 3, 4].map((v) => ({ value: v, label: v ? `${v}+` : t("filters.any") }))} />
            </div>
          ))}
          <label className="mt-2 flex flex-col gap-2 text-[11px] font-bold text-navy" htmlFor="f-roomtype">{t("filters.roomType")}
            <Select id="f-roomtype" value={d.roomType ?? "ANY"} onValueChange={(v) => setD({ ...d, roomType: v === "ANY" ? undefined : (v as RoomType) })} options={[{ value: "ANY", label: t("filters.any") }, ...ROOM_TYPES.map((r) => ({ value: r, label: t(`match.room.${r}`) }))]} />
          </label>
        </Group>
        <Group title={t("filters.amenities")}>
          <div className="grid grid-cols-2 gap-x-4 max-sm:grid-cols-1">{AMENITIES.map((a) => <CheckRow key={a} id={`am-${a}`} label={a} checked={d.amenities.includes(a)} onCheckedChange={() => toggle("amenities", a)} />)}</div>
        </Group>
        <Group title={t("filters.booking")}>
          <div className="grid grid-cols-2 gap-x-4 max-sm:grid-cols-1">{flag("instantBook", t("filters.instantBook"))}{flag("freeCancellation", t("filters.freeCancellation"))}{flag("payLater", t("filters.payLater"))}{flag("flexibleCancellation", t("filters.flexibleCancellation"))}</div>
        </Group>
        <Group title={t("filters.accessibility")}>
          <div className="grid grid-cols-2 gap-x-4 max-sm:grid-cols-1">{ACCESSIBILITY.map((a) => <CheckRow key={a} id={`ac-${a}`} label={a} checked={d.accessibility.includes(a)} onCheckedChange={() => toggle("accessibility", a)} />)}</div>
          <p className="mt-2 text-[11px] text-ink-muted">{t("filters.otherAccess")}</p>
        </Group>
      </SheetContent>
    </Sheet>
  );
}
