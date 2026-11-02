/* Reviews (§25–27): verified-stay only, category scores, Review Insights, sorting, pagination. */
import { useIsGuest } from "@/stores/session.store";
import { useAuthGate } from "@/components/auth/auth-gate";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageSquareQuote, PenLine, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import type { HotelWithMatch, ReviewSort } from "@/types/api";
import type { ReviewCategoryKey } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Bar, EmptyState, Pagination, SectionHeading, VerifiedStay } from "@/components/common";
import { useMyBookings, useReviews } from "@/hooks/queries";
import { useDates } from "@/hooks/use-format";

const CATS: ReviewCategoryKey[] = ["cleanliness", "location", "staff", "comfort", "facilities", "value"];

export function ReviewsSection({ hotel: h }: { hotel: HotelWithMatch }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { date } = useDates();
  const [sort, setSort] = useState<ReviewSort>("RELEVANT");
  const [page, setPage] = useState(1);
  const [gate, setGate] = useState(false);
  const { data, isLoading } = useReviews(h.id, sort, page);
  const isGuest = useIsGuest();
  const authGate = useAuthGate();
  const { data: bookings } = useMyBookings(isGuest);
  const eligible = bookings?.find((b) => b.hotelId === h.id && b.state === "COMPLETED" && !b.reviewed);
  const label = h.rating >= 4.8 ? t("hotel.exceptional") : h.rating >= 4.5 ? t("hotel.excellent") : t("hotel.veryGood");
  const positive = h.insights.filter((i) => i.sentiment === "positive");
  const negative = h.insights.filter((i) => i.sentiment === "negative");
  const sentiment = Math.round((positive.reduce((n, i) => n + i.pct, 0) / Math.max(1, h.insights.reduce((n, i) => n + i.pct, 0))) * 100);

  return (
    <section id="sec-reviews">
      <SectionHeading eyebrow={t("hotel.sections.reviews")} title={t("hotel.whatGuestsSay")} sub={t("hotel.verifiedOnly")} />
      <div className="grid grid-cols-[220px_1fr] gap-10 max-md:grid-cols-1 max-md:gap-6">
        <div className="flex flex-col items-start gap-1">
          <b className="flex items-center gap-2 text-[52px] leading-none text-navy"><Star className="size-8 fill-gold text-gold" /> {h.rating.toFixed(1)}</b>
          <span className="text-sm font-bold text-navy">{label}</span>
          <span className="text-[12px] text-ink-muted">{t("common.review", { count: h.reviewCount })}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 max-sm:grid-cols-1">
          {CATS.map((c) => <div key={c} className="grid grid-cols-[1fr_90px_32px] items-center gap-3 text-[12px] text-navy"><span>{t(`categories.${c}`)}</span><Bar value={h.reviewCategories[c]} max={5} tone="navy" label={t(`categories.${c}`)} /><b className="text-end">{h.reviewCategories[c].toFixed(1)}</b></div>)}
        </div>
      </div>

      <div className="mt-9 border border-line bg-paper p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="m-0 flex items-center gap-2 text-base"><MessageSquareQuote className="size-4 text-gold" /> {t("hotel.insights")}</h3><small className="text-[11px] text-ink-muted">{t("hotel.insightsSub", { count: h.reviewCount })}</small></div>
        <div className="mt-4 grid grid-cols-2 gap-6 max-md:grid-cols-1">
          {([[t("hotel.love"), positive, ThumbsUp, "text-success"], [t("hotel.mention"), negative, ThumbsDown, "text-warn"]] as const).map(([title, list, Icon, tone]) => (
            <div key={title}>
              <b className={`mb-2 flex items-center gap-1.5 text-[12px] ${tone}`}><Icon className="size-3.5" /> {title}</b>
              <ul className="flex flex-col gap-2">{list.map((i) => <li key={i.topic} className="grid grid-cols-[1fr_80px_36px] items-center gap-2 text-[12px] text-navy"><span>{i.topic}</span><Bar value={i.pct} tone={i.sentiment === "positive" ? "gold" : "danger"} label={i.topic} /><span className="text-end text-ink-muted">{i.pct}%</span></li>)}</ul>
            </div>
          ))}
        </div>
        <p className="mt-4 mb-0 text-[11px] text-ink-muted">{t("hotel.sentiment", { pct: sentiment })}</p>
      </div>

      <div className="mt-9 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="w-56"><Select ariaLabel={t("results.sort")} value={sort} onValueChange={(v) => { setSort(v as ReviewSort); setPage(1); }} options={(["RELEVANT", "RECENT", "HIGHEST", "LOWEST"] as const).map((k) => ({ value: k, label: t(`hotel.sortReviews.${k}`) }))} className="min-h-10" /></div>
        <Button variant="outline" size="sm" onClick={() => authGate("review", () => (eligible ? navigate(`/trips?tab=COMPLETED&review=${eligible.id}`) : setGate(true)))}><PenLine /> {t("hotel.writeReview")}</Button>
      </div>

      {isLoading ? <div className="skeleton h-40" /> : !data?.items.length ? <EmptyState title={t("hotel.noReviews")} text={t("hotel.noReviewsText")} /> : (
        <div className="grid grid-cols-2 gap-x-10 gap-y-8 max-md:grid-cols-1" aria-live="polite">
          {data.items.map((r) => (
            <article key={r.id} className="flex flex-col gap-2">
              <header className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-soft text-xs font-bold text-navy">{r.author.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
                <span className="flex flex-col"><b className="text-[13px] text-navy">{r.author}</b><small className="text-[11px] text-ink-muted">{r.country} · {r.tripType} · {date(r.createdAt, "MMM yyyy")}</small></span>
              </header>
              <div className="flex items-center gap-3"><span className="inline-flex items-center gap-1 text-[12px] font-bold text-navy"><Star className="size-3.5 fill-current" /> {r.overall.toFixed(1)}</span>{r.verifiedStay ? <VerifiedStay label={t("hotel.verifiedStay")} /> : <small className="text-[11px] text-ink-muted">{t("hotel.notVerified")}</small>}</div>
              <p className="m-0 text-[13px] text-charcoal">{r.text}</p>
              {r.hostReply && <blockquote className="m-0 border-s-2 border-gold bg-soft/50 px-3.5 py-2.5 text-[12px] text-charcoal"><b className="mb-1 block text-[11px] text-navy">{t("hotel.hostResponse", { name: h.host.name })}</b>{r.hostReply}</blockquote>}
            </article>
          ))}
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}

      <Dialog open={gate} onOpenChange={setGate}>
        <DialogContent title={t("hotel.gateTitle")} description={t("hotel.gateText", { hotel: h.name })}>
          <DialogFooter><Button variant="outline" onClick={() => setGate(false)}>{t("common.close")}</Button><Button onClick={() => navigate("/trips?tab=COMPLETED")}>{t("hotel.gateCta")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
