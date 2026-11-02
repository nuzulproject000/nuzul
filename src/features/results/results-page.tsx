/* Search results (§11, §13, §15–17, §76–78): list / split / map, filters, sorting, categories,
 * Match thresholds, flexible-date strip, monthly prices, compare tray, pagination. */
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { LatLngBounds } from "leaflet";
import { ArrowUpDown, CalendarDays, Filter, LayoutDashboard, List, Map as MapIcon, Search, X } from "lucide-react";
import type { SortKey } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CardSkeleton, Chip, EmptyState, ErrorState, Pagination } from "@/components/common";
import { HotelCard } from "@/components/hotel/hotel-card";
import { SearchBar } from "@/features/search/search-bar";
import { useCategories, useCompareHotels, useFlexibleDates, useHotelSearch } from "@/hooks/queries";
import { useMoney } from "@/hooks/use-format";
import { useCompare } from "@/stores/compare.store";
import { useSearch } from "@/stores/search.store";
import { nightsBetween } from "@/lib/dates";
import { categoryIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { FiltersSheet } from "./filters-sheet";
import { EMPTY_FILTERS, toSearchParams, useResultFilters } from "./use-result-filters";

const ResultsMap = lazy(() => import("./results-map").then((m) => ({ default: m.ResultsMap })));
const SORTS: SortKey[] = ["RECOMMENDED", "MATCH", "PRICE_ASC", "PRICE_DESC", "RATING", "DISTANCE", "REVIEWS", "POPULARITY"];

export default function ResultsPage() {
  const { t } = useTranslation();
  const s = useSearch();
  const { filters, setFilters, sort, page, view, monthly, destination, write, activeCount } = useResultFilters();
  const { data: categories } = useCategories();
  const [sheet, setSheet] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [area, setArea] = useState<LatLngBounds | null>(null);

  // URL destination wins (shareable links); keep the search store in sync.
  useEffect(() => { if (destination !== null && destination !== s.destination) s.set({ destination }); }, [destination]); // eslint-disable-line react-hooks/exhaustive-deps
  const dest = destination ?? s.destination;
  const isMonthly = monthly || s.mode === "MONTHLY";
  const nights = isMonthly ? 30 : Math.max(1, nightsBetween(s.checkIn, s.checkOut));
  const guests = s.guests.adults + s.guests.children;
  const base = { destination: dest, checkIn: s.checkIn, checkOut: s.checkOut, guests, rooms: s.guests.rooms, pets: s.guests.pets > 0 || undefined };
  const params = { ...toSearchParams(filters, base), sort, page, pageSize: 12 };
  const { data, isLoading, isFetching, error, refetch } = useHotelSearch(params);

  const items = useMemo(() => (area && data ? data.items.filter((h) => area.contains([h.coordinates.lat, h.coordinates.lng])) : data?.items ?? []), [data, area]);
  const quick = (k: "guestFavorite" | "freeCancellation", label: string) => <Chip active={filters[k]} onClick={() => setFilters({ ...filters, [k]: !filters[k] })}>{label}</Chip>;

  const chips: { label: string; clear: () => void }[] = [
    ...filters.propertyTypes.map((v) => ({ label: t(`filters.type.${v}`), clear: () => setFilters({ ...filters, propertyTypes: filters.propertyTypes.filter((x) => x !== v) }) })),
    ...filters.amenities.map((v) => ({ label: v, clear: () => setFilters({ ...filters, amenities: filters.amenities.filter((x) => x !== v) }) })),
    ...filters.accessibility.map((v) => ({ label: v, clear: () => setFilters({ ...filters, accessibility: filters.accessibility.filter((x) => x !== v) }) })),
    ...(["instantBook", "freeCancellation", "flexibleCancellation", "payLater", "guestFavorite", "highlyRated", "highMatch", "recommended", "matchesPrefs"] as const).filter((k) => filters[k]).map((k) => ({ label: t(`filters.${k}`), clear: () => setFilters({ ...filters, [k]: false }) })),
    ...(filters.minMatch ? [{ label: t("results.matchPlus", { n: filters.minMatch }), clear: () => setFilters({ ...filters, minMatch: undefined }) }] : []),
    ...(filters.minRating ? [{ label: `${filters.minRating}+ ★`, clear: () => setFilters({ ...filters, minRating: undefined }) }] : []),
    ...(filters.minPrice || filters.maxPrice ? [{ label: t("filters.price"), clear: () => setFilters({ ...filters, minPrice: undefined, maxPrice: undefined }) }] : []),
    ...(filters.roomType ? [{ label: t(`match.room.${filters.roomType}`), clear: () => setFilters({ ...filters, roomType: undefined }) }] : []),
    ...(filters.category ? [{ label: filters.category, clear: () => setFilters({ ...filters, category: undefined }) }] : []),
    ...(area ? [{ label: t("results.searchArea"), clear: () => setArea(null) }] : []),
  ];

  return (
    <div>
      <div className="bg-soft px-12 pt-8 pb-5 max-md:px-3 max-md:py-3.5"><SearchBar compact /></div>
      <nav aria-label={t("home.categories.title")} className="scrollbar-none flex gap-7 overflow-x-auto border-b border-line px-12 pt-3.5 max-md:gap-5 max-md:px-4">
        {categories?.filter((c) => c.active).map((c) => { const Icon = categoryIcon(c.name); const on = filters.category === c.name; return (
          <button key={c.id} type="button" aria-pressed={on} onClick={() => setFilters({ ...filters, category: on ? undefined : c.name })} className={cn("flex shrink-0 flex-col items-center gap-1.5 border-b-2 pb-3 text-[11px]", on ? "border-navy text-navy" : "border-transparent text-ink-muted hover:border-line hover:text-navy")}>
            <Icon className="size-[18px]" /><span>{c.name}</span>
          </button>
        ); })}
      </nav>
      <div className="flex items-center justify-between gap-3 border-b border-line px-12 py-3.5 max-md:px-4">
        <div className="scrollbar-none flex gap-2 overflow-x-auto">
          <Chip onClick={() => setSheet(true)}><Filter className="size-4" /> {t("results.filters")} {activeCount > 0 && <span className="grid size-[18px] place-items-center rounded-full bg-navy text-[10px] text-white">{activeCount}</span>}</Chip>
          {[70, 80, 90, 95].map((n) => <Chip key={n} active={filters.minMatch === n} onClick={() => setFilters({ ...filters, minMatch: filters.minMatch === n ? undefined : n })}>{t("results.matchPlus", { n })}</Chip>)}
          {quick("guestFavorite", t("filters.guestFavorite"))}{quick("freeCancellation", t("filters.freeCancellation"))}
        </div>
        <div role="radiogroup" aria-label={t("results.map")} className="flex shrink-0 gap-1.5">
          {([["list", List], ["split", LayoutDashboard], ["map", MapIcon]] as const).map(([v, Icon]) => (
            <Chip key={v} active={view === v} role="radio" aria-checked={view === v} onClick={() => write({ view: v === "split" ? undefined : v }, false)} className={v === "split" ? "max-md:hidden" : ""}><Icon className="size-4" /> {t(`results.${v}`)}</Chip>
          ))}
        </div>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line px-12 py-2.5 max-md:px-4">
          {chips.map((c) => <Chip key={c.label} active onClick={c.clear} aria-label={`${t("common.remove")} ${c.label}`}>{c.label} <X className="size-3" /></Chip>)}
          <Button variant="text" className="ms-2 text-[12px]" onClick={() => { setFilters(EMPTY_FILTERS); setArea(null); }}>{t("common.clearAll")}</Button>
        </div>
      )}

      <div className={cn(view === "split" ? "grid grid-cols-[minmax(640px,58%)_1fr] max-lg:grid-cols-[minmax(480px,62%)_1fr] max-md:block" : "block")}>
        <section className={cn("px-12 pt-9 pb-28 max-md:px-4 max-md:pt-6", view === "map" && "hidden")} aria-busy={isFetching}>
          <div className="mb-7 flex items-end justify-between gap-5 max-md:flex-col max-md:items-start">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-gold uppercase">{dest || t("nav.explore")} · {isMonthly ? t("results.monthly") : t("common.night", { count: nights })} · {t("common.guest", { count: guests })}</span>
              <h1 className="my-2 text-[34px] max-md:text-[26px]" aria-live="polite">
                {isLoading ? t("results.finding") : t("results.count", { count: area ? items.length : data?.total ?? 0 })}
              </h1>
              {!isLoading && data && dest && data.inDestination < 4 && data.inDestination > 0 && <p className="mb-1 text-[13px] text-navy">{t("results.alternatives", { count: data.inDestination, place: dest })}</p>}
              <p className="m-0 text-[11px] text-ink-muted">{t("results.meta")}</p>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-[12px] text-navy" htmlFor="sort"><ArrowUpDown className="size-3.5" /> {t("results.sort")}
              <Select id="sort" className="min-h-10 w-48" value={sort} onValueChange={(v) => write({ sort: v === "RECOMMENDED" ? undefined : v })} options={SORTS.map((k) => ({ value: k, label: t(`results.sortBy.${k}`) }))} />
            </label>
          </div>
          {(s.mode === "FLEXIBLE" || s.flexibility > 0) && data?.items[0] && <FlexStrip hotelId={data.items[0].id} nights={Math.max(1, nightsBetween(s.checkIn, s.checkOut))} />}
          {isMonthly && <div className="mb-6 flex items-start gap-2.5 bg-soft px-4 py-3.5 text-[12px] leading-relaxed text-navy"><CalendarDays className="size-[18px] shrink-0 text-gold" /><span><b>{t("results.monthly")}</b> · {t("results.monthlyText")}</span></div>}

          {error ? <ErrorState title={t("results.error")} error={error} onRetry={() => void refetch()} />
            : isLoading ? <div className={cn("grid gap-x-5 gap-y-9", view === "list" ? "grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1" : "grid-cols-2 max-lg:grid-cols-1")}>{Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)}</div>
              : items.length === 0 ? <EmptyState icon={<Search />} title={t("results.empty")} text={t("results.emptyText")} action={t("common.clearAll")} onAction={() => { setFilters(EMPTY_FILTERS); setArea(null); }} />
                : <div className={cn("grid gap-x-5 gap-y-9 transition-opacity", isFetching && "opacity-60", view === "list" ? "grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1" : "grid-cols-2 max-lg:grid-cols-1")}>
                  {items.map((h) => <HotelCard key={h.id} hotel={h} nights={nights} monthly={isMonthly} showCompare highlighted={hover === h.id || selected === h.id} onHover={setHover} />)}
                </div>}
          {data && !area && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => { write({ page: p }, false); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
        </section>
        {view !== "list" && (
          <aside className={cn("sticky top-[78px] h-[calc(100vh-78px)]", view === "split" && "max-md:hidden", view === "map" && "h-[calc(100vh-230px)] max-md:h-[calc(100vh-260px)]")}>
            <Suspense fallback={<div className="skeleton h-full" />}>
              <ResultsMap focus={dest} hotels={items} hoverId={hover} selectedId={selected} onSelect={setSelected} onSearchArea={setArea} />
            </Suspense>
          </aside>
        )}
      </div>
      <CompareTray />
      <FiltersSheet open={sheet} onOpenChange={setSheet} value={filters} onApply={setFilters} base={base} />
    </div>
  );
}

function FlexStrip({ hotelId, nights }: { hotelId: string; nights: number }) {
  const { t } = useTranslation();
  const s = useSearch();
  const money = useMoney();
  const { data } = useFlexibleDates(hotelId, s.checkIn, nights);
  if (!data) return null;
  const min = Math.min(...data.map((d) => d.total));
  const best = Math.max(...data.map((d) => d.matchScore));
  const max = Math.max(...data.map((d) => d.total));
  return (
    <div className="mb-6 border border-line bg-paper p-4">
      <p className="mb-3 text-[12px] text-navy"><b>{t("results.flexTitle")}</b> · {t("results.flexSub", { nights })}</p>
      <div className="scrollbar-none grid grid-cols-5 gap-2 overflow-x-auto max-md:grid-cols-[repeat(5,120px)]">
        {data.map((d) => {
          const mine = d.checkIn === s.checkIn;
          const tag = mine ? t("results.yourDates") : d.total === min ? t("results.cheapest") : d.matchScore === best ? t("results.bestMatch") : "";
          return (
            <button key={d.checkIn} type="button" onClick={() => { const out = new Date(d.checkIn); out.setDate(out.getDate() + nights); s.set({ checkIn: d.checkIn, checkOut: out.toISOString().slice(0, 10) }); }} aria-pressed={mine}
              className={cn("relative flex min-h-24 flex-col items-start gap-1 border border-line bg-ivory p-2.5 text-start", mine && "border-navy ring-1 ring-navy")}>
              <small className="text-[10px] text-ink-muted">{d.checkIn.slice(5)}</small><b className="text-[12px] text-navy">{money(d.total, d.currency)}</b>
              {tag && <em className="text-[9px] font-bold tracking-wide text-success uppercase not-italic">{tag}</em>}
              <i className="absolute end-2.5 bottom-2.5 w-1.5 bg-sand" style={{ height: `${(d.total / max) * 34}px` }} aria-hidden />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompareTray() {
  const { t } = useTranslation();
  const { ids, clear } = useCompare();
  const { data } = useCompareHotels(ids);
  if (!ids.length) return null;
  return (
    <div role="region" aria-label={t("results.compareBar", { count: ids.length })} className="fixed start-1/2 bottom-6 z-40 flex w-[min(760px,calc(100%-32px))] -translate-x-1/2 items-center justify-between gap-5 bg-navy py-3.5 ps-6 pe-4.5 text-white shadow-lift rtl:translate-x-1/2 max-md:bottom-[78px] max-md:flex-wrap max-md:gap-2.5 max-md:px-3.5">
      <span className="flex flex-col"><b className="text-[13px]">{t("results.compareBar", { count: ids.length })}</b><small className="mt-0.5 text-[11px] text-[#9da5af]">{t("results.compareSub")}</small></span>
      <div className="flex max-md:hidden">{data?.map((h, i) => <img key={h.id} src={h.images[0]} alt={h.name} className={cn("size-10 rounded-full border-2 border-navy object-cover", i && "-ms-2")} />)}</div>
      <div className="flex items-center gap-2"><Button variant="light" size="sm" onClick={clear}>{t("common.clear")}</Button><Button variant="gold" disabled={ids.length < 2} asChild={ids.length >= 2}>{ids.length >= 2 ? <Link to="/compare">{t("results.compareCta")}</Link> : <span>{t("results.compareCta")}</span>}</Button></div>
    </div>
  );
}
