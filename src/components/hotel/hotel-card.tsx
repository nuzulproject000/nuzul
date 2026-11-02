import { useCallback, useEffect, useState } from "react";
import { useIsGuest } from "@/stores/session.store";
import { useAuthGate } from "@/components/auth/auth-gate";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Heart, MapPin, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { HotelWithMatch } from "@/types/api";
import { MatchPill } from "@/components/match";
import { GuestFavoriteBadge, Rating } from "@/components/common";
import { Checkbox } from "@/components/ui/controls";
import { useToggleLike, useWishlists } from "@/hooks/queries";
import { useMoney } from "@/hooks/use-format";
import { useShare } from "@/hooks/use-share";
import { useCompare } from "@/stores/compare.store";
import { usePreferences } from "@/stores/preferences.store";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";

type Props = { hotel: HotelWithMatch; nights?: number; showCompare?: boolean; highlighted?: boolean; onHover?: (id: string | null) => void; monthly?: boolean; className?: string };

/** Hotel card (§12): carousel, favourite, share, category, rating, Guest Favorite, Match Score, nightly + total price, availability. */
export function HotelCard({ hotel, nights = 3, showCompare = false, highlighted = false, onHover, monthly = false, className }: Props) {
  const { t } = useTranslation();
  const money = useMoney();
  const share = useShare();
  const locale = usePreferences((s) => s.locale);
  const isGuest = useIsGuest();
  const gate = useAuthGate();
  const { data: wishlists } = useWishlists(isGuest);
  const like = useToggleLike();
  const compare = useCompare();
  const saved = !!wishlists?.some((w) => w.hotelIds.includes(hotel.id));
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, direction: locale === "ar" ? "rtl" : "ltr" });
  const [index, setIndex] = useState(0);
  useEffect(() => { if (!embla) return; const on = () => setIndex(embla.selectedScrollSnap()); embla.on("select", on); return () => { embla.off("select", on); }; }, [embla]);
  const go = useCallback((dir: 1 | -1) => (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (dir === 1) embla?.scrollNext(); else embla?.scrollPrev(); }, [embla]);
  const href = hotelPath(hotel);
  const monthlyPrice = Math.round(hotel.fromPrice * 30 * (1 - hotel.monthlyDiscountPct / 100));
  const policyLabel = hotel.cancellationPolicy === "FLEXIBLE" ? t("card.freeCancel") : t("card.policyCancel", { policy: t(`policy.${hotel.cancellationPolicy}`) });

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    gate("save", () => like.mutate(hotel.id, { onSuccess: (r) => (r.liked ? toast.success(t("card.savedTo", { name: r.wishlistName })) : toast.info(t("card.removed"))) }));
  };

  return (
    <article className={cn("group relative min-w-0", className)} onMouseEnter={() => onHover?.(hotel.id)} onMouseLeave={() => onHover?.(null)} aria-label={hotel.name}>
      <div className={cn("relative aspect-[4/3] overflow-hidden", highlighted && "ring-3 ring-gold")}>
        <Link to={href} tabIndex={-1} aria-hidden className="block h-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {hotel.images.map((src, i) => (
              <img key={i} src={src} alt="" loading="lazy" className="h-full min-w-0 flex-[0_0_100%] object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            ))}
          </div>
        </Link>
        <div className="absolute start-3 top-3 z-10">{hotel.guestFavorite && <GuestFavoriteBadge small />}</div>
        <div className="absolute end-3 top-3 z-10 flex gap-1.5">
          <button type="button" onClick={(e) => { e.preventDefault(); void share(hotel.name, href); }} aria-label={`${t("common.share")} ${hotel.name}`} className="grid size-9 place-items-center rounded-full bg-paper/95 text-navy"><Share2 className="size-4" /></button>
          <button type="button" onClick={toggleLike} aria-pressed={saved} aria-label={saved ? t("card.removeFrom") : t("card.saveTo")} className={cn("grid size-9 place-items-center rounded-full bg-paper/95", saved ? "text-gold" : "text-navy")}><Heart className={cn("size-[17px]", saved && "fill-current")} /></button>
        </div>
        <button type="button" onClick={go(-1)} aria-label={t("card.prevPhoto")} className="absolute start-2.5 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-navy opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"><ChevronLeft className="size-4 rtl:rotate-180" /></button>
        <button type="button" onClick={go(1)} aria-label={t("card.nextPhoto")} className="absolute end-2.5 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-paper/90 text-navy opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 max-md:opacity-100"><ChevronRight className="size-4 rtl:rotate-180" /></button>
        <div className="absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1" aria-hidden>{hotel.images.map((_, i) => <i key={i} className={cn("size-1.5 rounded-full", i === index ? "bg-white" : "bg-white/55")} />)}</div>
      </div>
      <div className="pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] font-bold tracking-[0.08em] text-gold uppercase">{hotel.category}</span>
          <Rating rating={hotel.rating} reviews={hotel.reviewCount} compact />
        </div>
        <h3 className="mt-3 mb-1.5 text-lg"><Link to={href} className="hover:underline underline-offset-4">{hotel.name}</Link></h3>
        <p className="mb-3 flex items-center gap-1.5 text-[11px] text-ink-muted"><MapPin className="size-3.5" /> {hotel.area}, {hotel.city}</p>
        <div className="flex flex-wrap gap-1.5">{hotel.tags.map((tag) => <span key={tag} className="bg-soft px-2 py-1.5 text-[10px] text-[#6e5a3c]">{tag}</span>)}</div>
        <div className="mt-4 flex items-end justify-between gap-2.5 border-t border-line pt-4">
          <MatchPill score={hotel.match.score} hotelId={hotel.id} />
          <div className="text-end">
            {monthly ? (
              <><b className="text-base text-navy">{money(monthlyPrice, hotel.currency)}</b><span className="ms-1 text-[10px] text-ink-muted">{t("results.perMonth")}</span>
                <small className="mt-1 block text-[10px] text-success">{t("results.longStayOff", { pct: hotel.monthlyDiscountPct })}</small></>
            ) : (
              <><b className="text-base text-navy">{money(hotel.fromPrice, hotel.currency)}</b><span className="ms-1 text-[10px] text-ink-muted">{t("common.perNight")}</span>
                <small className="mt-1 block text-[10px] text-ink-muted">{t("card.totalNights", { total: money(hotel.fromPrice * nights, hotel.currency), nights })}</small></>
            )}
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className={cn("text-[11px] font-semibold", hotel.available ? "text-success" : "text-error")}>{hotel.available ? `${t("card.available")} · ${policyLabel}` : t("card.soldOut")}</span>
          {showCompare && (
            <label className="flex items-center gap-1.5 text-[11px] text-navy">
              <Checkbox checked={compare.ids.includes(hotel.id)} onCheckedChange={() => { if (!compare.toggle(hotel.id)) toast.info(t("results.compareLimit")); }} aria-label={`${t("common.compare")} ${hotel.name}`} />
              {t("common.compare")}
            </label>
          )}
        </div>
      </div>
    </article>
  );
}
