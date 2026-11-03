/* Hotel comparison (§20): up to 4 stays, Match Score and guest rating kept separate, best-in-row. */
import { track } from "@/lib/analytics";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react";
import type { HotelWithMatch } from "@/types/api";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, GuestFavoriteBadge, Rating } from "@/components/common";
import { MatchPill, useReasonText } from "@/components/match";
import { useCompareHotels, useMatchProfile } from "@/hooks/queries";
import { useMoney } from "@/hooks/use-format";
import { useCompare } from "@/stores/compare.store";
import { toEGP } from "@/lib/currency";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";

type Row = { key: string; label: string; sub?: string; cell: (h: HotelWithMatch) => React.ReactNode; value?: (h: HotelWithMatch) => number; lowerIsBetter?: boolean; highlight?: boolean };

export default function ComparePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const money = useMoney();
  const reason = useReasonText();
  const { ids, toggle } = useCompare();
  const { data: profile } = useMatchProfile();
  const { data, isLoading, error, refetch } = useCompareHotels(ids);
  const hotels = (data ?? []).filter((h) => ids.includes(h.id));
  useEffect(() => { if (ids.length >= 2) track("compare", { count: ids.length }); }, [ids.length]);

  if (ids.length < 2) return <div className="container-page py-16"><EmptyState icon={<Plus />} title={t("compare.emptyTitle")} text={t("compare.emptyText")} action={t("compare.browse")} onAction={() => navigate("/search")} /></div>;
  if (error) return <div className="container-page py-16"><ErrorState error={error} onRetry={() => void refetch()} /></div>;

  const want = profile?.facilities ?? [];
  const rows: Row[] = [
    { key: "match", label: t("compare.rows.match"), sub: t("compare.rows.matchSub"), highlight: true, cell: (h) => <MatchPill score={h.match.score} hotelId={h.id} />, value: (h) => h.match.score },
    { key: "rating", label: t("compare.rows.rating"), sub: t("compare.rows.ratingSub"), cell: (h) => <Rating rating={h.rating} reviews={h.reviewCount} compact />, value: (h) => h.rating },
    { key: "price", label: t("compare.rows.price"), cell: (h) => money(h.fromPrice, h.currency, { original: true }), value: (h) => toEGP(h.fromPrice, h.currency), lowerIsBetter: true },
    { key: "location", label: t("compare.rows.location"), cell: (h) => `${h.reviewCategories.location.toFixed(1)} · ${h.area}`, value: (h) => h.reviewCategories.location },
    { key: "distance", label: t("compare.rows.distance"), cell: (h) => `${h.distanceKm} km`, value: (h) => h.distanceKm, lowerIsBetter: true },
    ...(["cleanliness", "comfort", "facilities", "staff", "value"] as const).map((k) => ({ key: k, label: t(`compare.rows.${k}`), cell: (h: HotelWithMatch) => h.reviewCategories[k].toFixed(1), value: (h: HotelWithMatch) => h.reviewCategories[k] })),
    { key: "rooms", label: t("compare.rows.roomTypes"), cell: (h) => h.rooms.map((r) => t(`match.room.${r.type}`)).join(", ") },
    { key: "amenities", label: t("compare.rows.amenities"), sub: want.length ? t("compare.rows.amenitiesSub", { list: want.join(", ") }) : undefined, value: (h) => want.filter((f) => h.amenities.includes(f)).length,
      cell: (h) => <span className="flex flex-col gap-1">{want.map((f) => <em key={f} className={cn("flex items-center gap-1 text-[11px] not-italic", h.amenities.includes(f) ? "text-success" : "text-error")}>{h.amenities.includes(f) ? <Check className="size-3" /> : <X className="size-3" />} {f}</em>)}<small className="text-[10px] text-ink-muted">{t("compare.rows.amenTotal", { n: h.amenities.length })}</small></span> },
    { key: "cancel", label: t("compare.rows.cancellation"), cell: (h) => t(`policy.short.${h.cancellationPolicy}`) },
    { key: "gf", label: t("compare.rows.gf"), cell: (h) => (h.guestFavorite ? <GuestFavoriteBadge small /> : "—") },
    { key: "insights", label: t("compare.rows.insights"), cell: (h) => { const pos = h.insights.find((i) => i.sentiment === "positive"); const neg = h.insights.find((i) => i.sentiment === "negative"); return <span className="flex flex-col gap-1 text-[11px]">{pos && <b className="text-success">+ {pos.topic} {pos.pct}%</b>}{neg && <b className="text-error">− {neg.topic} {neg.pct}%</b>}</span>; } },
    { key: "maynot", label: t("compare.rows.mayNot"), cell: (h) => <span className="first-letter:uppercase">{h.match.negatives[0] ? reason(h.match.negatives[0]) : t("match.nothingConflicts")}</span> },
  ];
  const bestIdx = (r: Row) => {
    if (!r.value || hotels.length < 2) return -1;
    const vals = hotels.map(r.value);
    const target = r.lowerIsBetter ? Math.min(...vals) : Math.max(...vals);
    return vals.filter((v) => v === target).length === vals.length ? -1 : vals.indexOf(target);
  };
  const cols = { gridTemplateColumns: `200px repeat(${hotels.length}, minmax(200px, 1fr))` };

  return (
    <div className="container-page py-10">
      <Button variant="text" onClick={() => navigate(-1)}><ArrowLeft className="rtl:rotate-180" /> {t("compare.back")}</Button>
      <h1 className="mt-3 mb-2 text-[44px] max-md:text-[32px]">{t("compare.title")}</h1>
      <p className="text-ink-muted">{t("compare.sub")} <span className="ms-1 rounded bg-[#fbf6ec] px-2 py-0.5 text-[11px] font-bold text-gold-ink">{t("compare.best")}</span></p>

      {isLoading ? <div className="skeleton mt-8 h-[600px]" /> : <>
        <div className="mt-8 overflow-x-auto border border-line bg-paper max-md:hidden" role="table" aria-label={t("compare.title")}>
          <div role="row" className="grid border-b border-line" style={cols}>
            <div role="columnheader" />
            {hotels.map((h) => (
              <div role="columnheader" key={h.id} className="relative flex flex-col gap-2 border-s border-line p-4">
                <button type="button" onClick={() => toggle(h.id)} aria-label={`${t("common.remove")} ${h.name}`} className="absolute end-6 top-6 z-[1] grid size-8 place-items-center text-white transition-opacity duration-150 hover:opacity-80"><X className="size-5 [filter:drop-shadow(0_1px_1.5px_rgb(0_0_0/.75))_drop-shadow(0_0_6px_rgb(0_0_0/.35))]" /></button>
                <img src={h.images[0]} alt="" className="aspect-[4/3] w-full object-cover" />
                <h3 className="m-0 text-[15px]">{h.name}</h3>
                <p className="m-0 text-[11px] text-ink-muted">{h.city}, {h.country}</p>
                <Link to={hotelPath(h)} className="inline-flex items-center gap-1 text-[12px] font-bold text-gold">{t("match.viewStay")} <ArrowRight className="size-3 rtl:rotate-180" /></Link>
              </div>
            ))}
          </div>
          {rows.map((r) => { const best = bestIdx(r); return (
            <div role="row" key={r.key} className={cn("grid border-b border-line last:border-0", r.highlight && "bg-[#fbf6ec]")} style={cols}>
              <div role="rowheader" className="flex flex-col p-4 text-[12px] font-bold text-navy">{r.label}{r.sub && <small className="mt-0.5 text-[10px] font-normal text-ink-muted">{r.sub}</small>}</div>
              {hotels.map((h, j) => <div role="cell" key={h.id} className={cn("border-s border-line p-4 text-[12px] text-charcoal", best === j && "bg-success-bg/70 font-bold text-navy")}>{r.cell(h)}{best === j && <span className="sr-only"> ({t("compare.best")})</span>}</div>)}
            </div>
          ); })}
        </div>

        <div className="mt-8 flex flex-col gap-4 md:hidden">
          {hotels.map((h) => (
            <article key={h.id} className="border border-line bg-paper">
              <div className="relative"><img src={h.images[0]} alt="" className="h-44 w-full object-cover" /><button type="button" onClick={() => toggle(h.id)} aria-label={`${t("common.remove")} ${h.name}`} className="absolute end-3 top-3 grid size-8 place-items-center text-white transition-opacity duration-150 hover:opacity-80"><X className="size-5 [filter:drop-shadow(0_1px_1.5px_rgb(0_0_0/.75))_drop-shadow(0_0_6px_rgb(0_0_0/.35))]" /></button></div>
              <dl className="m-0 p-4">
                <h3 className="mb-2 text-lg"><Link to={hotelPath(h)}>{h.name}</Link></h3>
                {rows.map((r) => { const best = bestIdx(r) === hotels.indexOf(h); return <div key={r.key} className={cn("flex items-start justify-between gap-4 border-b border-line py-2 text-[12px] last:border-0", best && "font-bold")}><dt className="text-ink-muted">{r.label}</dt><dd className="m-0 text-end text-navy">{r.cell(h)}</dd></div>; })}
              </dl>
            </article>
          ))}
        </div>
      </>}
    </div>
  );
}
