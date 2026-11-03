/* Main search (§5, §15, §16): destination autocomplete, exact / flexible / monthly
 * dates, adults · children · infants · pets · rooms. Built with React Hook Form + Yup. */
import { track } from "@/lib/analytics";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { addMonths, format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarDays, Crosshair, Globe2, Hotel, Landmark, MapPin, Search } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/overlay";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Chip, Counter, SegButtons } from "@/components/common";
import { useSuggestions } from "@/hooks/queries";
import { useDates } from "@/hooks/use-format";
import { useSearch, totalGuests, type DateMode, type Flexibility, type FlexPeriod } from "@/stores/search.store";
import { toISODate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const KIND_ICON = { CITY: MapPin, COUNTRY: Globe2, HOTEL: Hotel, LANDMARK: Landmark, NEARBY: Crosshair } as const;

const schema = yup.object({
  destination: yup.string().trim().required("search.errDestination"),
  checkIn: yup.string().required(),
  checkOut: yup.string().required().test("after", "search.errDates", function (v) { return this.parent.mode !== "DATES" || (!!v && v > this.parent.checkIn); }),
  mode: yup.mixed<DateMode>().oneOf(["DATES", "FLEXIBLE", "MONTHLY"]).required(),
});
type FormValues = yup.InferType<typeof schema>;

export function SearchBar({ compact = false, onSubmitted }: { compact?: boolean; onSubmitted?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const s = useSearch();
  const dates = useDates();
  const [open, setOpen] = useState<"" | "where" | "when" | "who">("");
  const [query, setQuery] = useState(s.destination);
  const { data: suggestions = [] } = useSuggestions(open === "where" ? query : "");
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: yupResolver(schema),
    values: { destination: s.destination, checkIn: s.checkIn, checkOut: s.checkOut, mode: s.mode },
  });
  const mode = watch("mode");
  useEffect(() => setQuery(s.destination), [s.destination]);

  const whenLabel = useMemo(() => {
    if (s.mode === "MONTHLY") return t("search.monthlyLabel", { count: s.months, date: dates.date(s.checkIn, "d MMM") });
    if (s.mode === "FLEXIBLE") return t("search.flexibleLabel", { period: t(`search.${s.flexPeriod === "WEEKEND" ? "weekend" : s.flexPeriod === "WEEK" ? "week" : "month"}`) });
    return `${dates.range(s.checkIn, s.checkOut)}${s.flexibility ? ` · ±${s.flexibility}` : ""}`;
  }, [s, t, dates]);
  const g = s.guests;
  const whoLabel = [t("common.guest", { count: totalGuests(g) }), g.infants ? t("search.infant", { count: g.infants }) : "", g.pets ? t("search.pet", { count: g.pets }) : "", t("common.room", { count: g.rooms })].filter(Boolean).join(" · ");

  const onSubmit = (v: FormValues) => {
    s.set({ destination: v.destination, checkIn: v.checkIn, checkOut: v.checkOut, mode: v.mode });
    s.commit();
    track("search", { destination: v.destination, mode: v.mode });
    setOpen("");
    onSubmitted?.();
    navigate(`/search?destination=${encodeURIComponent(v.destination)}${v.mode === "MONTHLY" ? "&mode=monthly" : ""}`);
  };
  const onInvalid = () => setOpen(errors.destination ? "where" : "when");

  const range: DateRange = { from: parseISO(s.checkIn), to: parseISO(s.checkOut) };
  /* Flat layout (no card): fields sit on the page background with thin vertical dividers.
   * Mobile: one row of three columns, text wraps instead of truncating. Same on home and /search. */
  const fieldCls = (k: string) => cn(
    "relative flex min-w-0 cursor-pointer flex-col justify-center border-e border-line px-6 text-start transition-opacity duration-150 hover:opacity-80 max-lg:px-4",
    "max-md:justify-start max-md:px-2 max-md:py-1 max-md:first:ps-0 max-md:last:pe-0",
    open === k && "opacity-100",
  );
  const labelCls = "text-[10px] font-bold tracking-[0.12em] text-gold uppercase max-md:tracking-[0.06em]";
  const valueCls = "mt-1.5 text-[13px] font-semibold text-navy md:truncate max-md:mt-1 max-md:text-[11px] max-md:leading-snug max-md:break-words";
  const errorKey = errors.destination?.message ?? errors.checkOut?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} role="search" aria-label={t("nav.search")} className="relative z-30 mx-auto w-full max-w-[1280px]" noValidate>
      <div className={cn("grid grid-cols-[1.4fr_1.1fr_1fr_auto] items-stretch max-md:grid-cols-3 max-md:gap-y-3", compact ? "min-h-14" : "min-h-16")}>
        {/* Where */}
        <Popover open={open === "where"} onOpenChange={(o) => setOpen(o ? "where" : "")}>
          <PopoverAnchor asChild>
            <div className={fieldCls("where")} onClick={() => document.getElementById("sb-where")?.focus()}>
              <label htmlFor="sb-where" className={cn(labelCls, "cursor-pointer")}>{t("search.where")}</label>
              {/* Mobile: show the full destination wrapped; the single-line input takes over while typing */}
              {open !== "where" && <span aria-hidden className={cn(valueCls, "md:hidden", !query && "font-normal text-ink-muted/70")}>{query || t("search.wherePh")}</span>}
              <Controller control={control} name="destination" render={({ field }) => (
                <input id="sb-where" {...field} value={query} autoComplete="off" placeholder={t("search.wherePh")} aria-autocomplete="list" aria-expanded={open === "where"} aria-invalid={!!errors.destination}
                  onFocus={() => setOpen("where")} onChange={(e) => { setQuery(e.target.value); field.onChange(e.target.value); setOpen("where"); }}
                  className={cn(valueCls, "w-full cursor-pointer bg-transparent outline-none placeholder:text-ink-muted/70 focus:cursor-text", open !== "where" && "max-md:absolute max-md:size-px max-md:overflow-hidden max-md:opacity-0")} />
              )} />
            </div>
          </PopoverAnchor>
          <PopoverContent className="w-[min(380px,calc(100vw-32px))] p-3" onOpenAutoFocus={(e) => e.preventDefault()}>
            <small className="mb-2 block px-2 text-[10px] font-bold tracking-widest text-ink-muted uppercase">{query ? t("search.suggestions") : t("search.popularNearby")}</small>
            <ul role="listbox" aria-label={t("search.suggestions")}>
              {suggestions.length === 0 && <li className="p-3 text-[13px] text-ink-muted">{t("search.noMatches")}</li>}
              {suggestions.map((sg) => { const Icon = KIND_ICON[sg.kind]; return (
                <li key={sg.label + sg.kind}>
                  <button type="button" role="option" aria-selected={false} className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-start hover:opacity-80 focus-visible:bg-soft"
                    onClick={() => {
                      if (sg.kind === "HOTEL") { setOpen(""); navigate(`/hotels/${sg.value}`); return; }
                      const v = sg.kind === "NEARBY" ? "Egypt" : sg.value;
                      setQuery(sg.kind === "NEARBY" ? t("search.kind.NEARBY") : sg.label); setValue("destination", v); s.set({ destination: v }); setOpen("when");
                    }}>
                    <span className="grid size-[38px] shrink-0 place-items-center rounded-lg bg-soft text-navy"><Icon className="size-4" /></span>
                    <span><b className="block text-[13px] text-navy">{sg.label}</b><small className="text-[11px] text-ink-muted">{t(`search.kind.${sg.kind}`)} · {sg.sub}</small></span>
                  </button>
                </li>
              ); })}
            </ul>
          </PopoverContent>
        </Popover>

        {/* When */}
        <Popover open={open === "when"} onOpenChange={(o) => setOpen(o ? "when" : "")}>
          <PopoverAnchor asChild>
            <button type="button" className={fieldCls("when")} onClick={() => setOpen(open === "when" ? "" : "when")} aria-expanded={open === "when"}>
              <span className={labelCls}>{t("search.when")}</span>
              <span className={valueCls}>{whenLabel}</span>
            </button>
          </PopoverAnchor>
          <PopoverContent className="w-[min(680px,calc(100vw-32px))]" align="center">
            <div className="mb-4 flex justify-center"><SegButtons<DateMode> ariaLabel={t("search.when")} value={mode} onChange={(m) => { setValue("mode", m); s.set({ mode: m }); }} options={[{ value: "DATES", label: t("search.dates") }, { value: "FLEXIBLE", label: t("search.flexible") }, { value: "MONTHLY", label: t("search.months") }]} /></div>
            {mode === "DATES" && (
              <>
                <Calendar mode="range" numberOfMonths={typeof window !== "undefined" && window.innerWidth < 760 ? 1 : 2} selected={range} disabled={{ before: new Date() }} defaultMonth={range.from}
                  onSelect={(r) => { if (r?.from) { const ci = toISODate(r.from); const co = r.to ? toISODate(r.to) : s.checkOut <= ci ? toISODate(new Date(r.from.getTime() + 86400000)) : s.checkOut; s.set({ checkIn: ci, checkOut: co }); setValue("checkIn", ci); setValue("checkOut", co); } }} />
                <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
                  {([0, 1, 3, 7, 14] as Flexibility[]).map((f) => <Chip key={f} active={s.flexibility === f} onClick={() => s.set({ flexibility: f })}>{f === 0 ? t("search.exact") : t("search.plusMinus", { count: f })}</Chip>)}
                </div>
              </>
            )}
            {mode === "FLEXIBLE" && (
              <div className="space-y-4">
                <p className="m-0 text-[11px] font-bold tracking-widest text-ink-muted uppercase">{t("search.stayFor")}</p>
                <div className="flex flex-wrap gap-2">{(["WEEKEND", "WEEK", "MONTH"] as FlexPeriod[]).map((p) => <Chip key={p} active={s.flexPeriod === p} onClick={() => s.set({ flexPeriod: p })}>{t(`search.${p === "WEEKEND" ? "weekend" : p === "WEEK" ? "week" : "month"}`)}</Chip>)}</div>
                <p className="m-0 text-[11px] font-bold tracking-widest text-ink-muted uppercase">{t("search.goIn")}</p>
                <div className="grid grid-cols-6 gap-2 max-sm:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => addMonths(new Date(), i)).map((d) => { const key = format(d, "yyyy-MM"); const on = s.flexMonths.includes(key); return (
                    <button type="button" key={key} aria-pressed={on} onClick={() => s.set({ flexMonths: on ? s.flexMonths.filter((x) => x !== key) : [...s.flexMonths, key] })} className={cn("flex flex-col items-center gap-1 border border-line bg-ivory px-1 py-2.5 text-[12px] font-semibold text-navy", on && "border-navy bg-paper ring-1 ring-navy")}>
                      <CalendarDays className="size-4" />{dates.date(toISODate(d), "MMM")}<small className="text-[10px] font-normal text-ink-muted">{format(d, "yyyy")}</small>
                    </button>
                  ); })}
                </div>
                <p className="m-0 text-[11px] text-ink-muted">{t("search.flexNote")}</p>
              </div>
            )}
            {mode === "MONTHLY" && (
              <div className="space-y-4">
                <p className="m-0 text-[11px] font-bold tracking-widest text-ink-muted uppercase">{t("search.howManyMonths")}</p>
                <div className="flex flex-wrap gap-2">{[1, 2, 3, 4, 6, 9, 12].map((n) => <button type="button" key={n} aria-pressed={s.months === n} onClick={() => s.set({ months: n })} className={cn("size-11 rounded-full border border-line font-bold text-navy", s.months === n ? "bg-navy text-white" : "bg-ivory")}>{n}</button>)}</div>
                <label className="flex flex-col gap-2 text-[11px] font-bold text-navy">{t("search.starting")}<input type="date" value={s.checkIn} min={toISODate(new Date())} onChange={(e) => s.set({ checkIn: e.target.value })} className="min-h-11 border border-line bg-paper px-3" /></label>
                <p className="m-0 text-[11px] text-ink-muted">{t("search.monthlyNote")}</p>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <Button variant="text" onClick={() => s.set({ flexibility: 0, flexMonths: [] })}>{t("common.clear")}</Button>
              <Button size="sm" onClick={() => setOpen("who")}>{t("common.next")}</Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Who */}
        <Popover open={open === "who"} onOpenChange={(o) => setOpen(o ? "who" : "")}>
          <PopoverAnchor asChild>
            <button type="button" className={cn(fieldCls("who"), "border-e-0")} onClick={() => setOpen(open === "who" ? "" : "who")} aria-expanded={open === "who"}>
              <span className={labelCls}>{t("search.who")}</span>
              <span className={valueCls}>{whoLabel}</span>
            </button>
          </PopoverAnchor>
          <PopoverContent className="w-[min(360px,calc(100vw-32px))]" align="end">
            <Counter label={t("search.adults")} sub={t("search.adultsSub")} value={g.adults} min={1} onChange={(n) => s.set({ guests: { ...g, adults: n } })} />
            <Counter label={t("search.children")} sub={t("search.childrenSub")} value={g.children} onChange={(n) => s.set({ guests: { ...g, children: n } })} />
            <Counter label={t("search.infants")} sub={t("search.infantsSub")} value={g.infants} max={5} onChange={(n) => s.set({ guests: { ...g, infants: n } })} />
            <Counter label={t("search.pets")} sub={t("search.petsSub")} value={g.pets} max={3} onChange={(n) => s.set({ guests: { ...g, pets: n } })} />
            <Counter label={t("search.rooms")} value={g.rooms} min={1} max={8} onChange={(n) => s.set({ guests: { ...g, rooms: n } })} />
            <div className="mt-3 flex justify-end border-t border-line pt-3"><Button size="sm" onClick={() => setOpen("")}>{t("common.done")}</Button></div>
          </PopoverContent>
        </Popover>

        {/* Desktop: icon only, no box. Mobile: compact full-width button under the fields. */}
        <Button type="submit" variant="ghost" aria-label={t("search.search")}
          className="ms-3 size-12 min-h-0 self-center rounded-full p-0 text-gold hover:text-gold hover:opacity-80 max-md:col-span-3 max-md:ms-0 max-md:h-10 max-md:w-full max-md:gap-1.5 max-md:rounded-lg max-md:bg-gold max-md:text-[12px] max-md:text-white max-md:hover:text-white">
          <Search className="size-5 max-md:size-4" /><span className="md:hidden">{t("search.search")}</span>
        </Button>
      </div>
      {errorKey && <p role="alert" className="mt-2 px-1 text-[11px] font-semibold text-error">{t(errorKey)}</p>}
    </form>
  );
}
