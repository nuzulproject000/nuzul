/* Hotel detail (§18–19, §24–28, §31, §37, §68). */
import { track } from "@/lib/analytics";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Accessibility, Award, CalendarDays, Check, ChevronRight, CircleHelp, Clock3, Heart, Image as ImageIcon, MapPin, MessageCircle, Share2, ShieldCheck, Users, X } from "lucide-react";
import { toast } from "sonner";
import type { HotelWithMatch } from "@/types/api";
import { Button } from "@/components/ui/button";
import { ErrorState, GuestFavoriteBadge, Rating, SectionHeading } from "@/components/common";
import { MatchLarge, MatchPill, useMatchSummary, useReasonText } from "@/components/match";
import { useHotelBySlug, useMatchProfile, useToggleLike, useWishlists } from "@/hooks/queries";
import { useShare } from "@/hooks/use-share";
import { useCompare } from "@/stores/compare.store";
import { useSearch } from "@/stores/search.store";
import { nightsBetween } from "@/lib/dates";
import { amenityIcon, nearbyIcon } from "@/lib/icons";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";
import { BookingCard } from "./booking-card";
import { RoomsSection } from "./rooms-section";
import { ReviewsSection } from "./reviews-section";
import { Gallery } from "./gallery";
import { useSeo } from "./use-seo";

const LocationMap = lazy(() => import("./location-map"));
const SECTIONS = ["overview", "match", "rooms", "amenities", "location", "reviews", "policies"] as const;

export default function HotelPage() {
  const { t } = useTranslation();
  const slug = useParams()["*"] ?? "";
  const { data: hotel, isLoading, error, refetch } = useHotelBySlug(slug);
  if (error) return <div className="container-page py-20"><ErrorState error={error} title={t("errors.notFound")} onRetry={() => void refetch()} /></div>;
  if (isLoading || !hotel) return <div className="mx-auto max-w-[1440px] px-12 py-8 max-md:px-4" aria-busy><div className="skeleton h-8 w-1/3" /><div className="skeleton mt-6 h-[480px]" /></div>;
  return <HotelView hotel={hotel} />;
}

function HotelView({ hotel: h }: { hotel: HotelWithMatch }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const share = useShare();
  const s = useSearch();
  const { data: profile } = useMatchProfile();
  const { data: wishlists } = useWishlists();
  const like = useToggleLike();
  const compare = useCompare();
  const reason = useReasonText();
  const summary = useMatchSummary();
  const [tab, setTab] = useState<(typeof SECTIONS)[number]>("overview");
  const [gallery, setGallery] = useState<null | "ALL" | "ROOMS" | "FACILITIES">(null);
  const saved = !!wishlists?.some((w) => w.hotelIds.includes(h.id));
  const nights = Math.max(1, nightsBetween(s.checkIn, s.checkOut));
  const m = h.match;
  const wantsQuiet = profile?.atmosphere.includes("Quiet");
  useSeo(h);
  useEffect(() => { track("hotel_view", { hotelId: h.id }); track("match_view", { hotelId: h.id, score: h.match.score }); }, [h.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll-spy for the sticky section tabs.
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setTab(e.target.id.replace("sec-", "") as (typeof SECTIONS)[number])), { rootMargin: "-160px 0px -60% 0px" });
    SECTIONS.forEach((k) => { const el = document.getElementById(`sec-${k}`); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);
  const scrollTo = (k: string) => document.getElementById(`sec-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const [country, city] = h.slug.split("/");

  return (
    <div className="mx-auto max-w-[1440px] px-12 pt-7 pb-24 max-md:px-4 max-md:pb-40">
      <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted max-md:hidden">
        <Link to="/">Home</Link><ChevronRight className="size-3 rtl:rotate-180" />
        <Link to={`/search?destination=${encodeURIComponent(h.country)}`} className="capitalize">{country.replace(/-/g, " ")}</Link><ChevronRight className="size-3 rtl:rotate-180" />
        <Link to={`/search?destination=${encodeURIComponent(h.city)}`} className="capitalize">{city.replace(/-/g, " ")}</Link><ChevronRight className="size-3 rtl:rotate-180" />
        <span className="text-navy">{h.name}</span>
      </nav>

      <header className="flex items-end justify-between gap-5 max-md:flex-col max-md:items-start">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2.5"><span className="eyebrow m-0">{h.category}</span>{h.guestFavorite && <GuestFavoriteBadge />}<span className="inline-flex items-center gap-1 text-[11px] font-bold text-success"><ShieldCheck className="size-3.5" /> {h.verification.replace("_", " ").toLowerCase()}</span></div>
          <h1 className="mb-3 text-[43px] max-md:text-[30px]">{h.name}</h1>
          <p className="m-0 flex flex-wrap items-center gap-2.5 text-[12px] text-ink-muted"><MapPin className="size-4" /> {h.area}, {h.city}, {h.country} <Rating rating={h.rating} reviews={h.reviewCount} /> <MatchPill score={m.score} hotelId={h.id} /></p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" aria-label={t("common.share")} onClick={() => void share(h.name, hotelPath(h))}><Share2 /></Button>
          <Button size="icon" aria-pressed={saved} aria-label={saved ? t("card.removeFrom") : t("card.saveTo")} className={cn(saved && "border-gold text-gold")} onClick={() => like.mutate(h.id, { onSuccess: (r) => (r.liked ? toast.success(t("card.savedTo", { name: r.wishlistName })) : toast.info(t("card.removed"))) })}><Heart className={cn(saved && "fill-current")} /></Button>
          <Button size="sm" variant={compare.ids.includes(h.id) ? "default" : "outline"} onClick={() => { if (!compare.toggle(h.id)) toast.info(t("results.compareLimit")); }}>{compare.ids.includes(h.id) ? <><Check /> {t("hotel.inCompare")}</> : t("hotel.addCompare")}</Button>
        </div>
      </header>

      <section aria-label={t("hotel.showAll")} className="relative mt-6 grid grid-cols-[2fr_1fr_1fr] grid-rows-[235px_235px] gap-2 max-lg:grid-cols-[2fr_1fr] max-md:-mx-4 max-md:block max-md:h-[300px]">
        <button type="button" className="row-span-2 overflow-hidden" onClick={() => setGallery("ALL")}><img src={h.images[0]} alt={h.name} className="h-full w-full object-cover" /></button>
        {h.images.slice(1, 5).map((src, i) => <button key={i} type="button" className={cn("overflow-hidden max-md:hidden", i > 1 && "max-lg:hidden")} onClick={() => setGallery(i % 2 ? "FACILITIES" : "ROOMS")}><img src={src} alt="" loading="lazy" className="h-full w-full object-cover" /></button>)}
        <Button variant="ivory" size="sm" className="absolute end-4 bottom-4 rounded-none" onClick={() => setGallery("ALL")}><ImageIcon /> {t("hotel.showAll")}</Button>
      </section>

      <nav aria-label="Sections" className="scrollbar-none sticky top-[78px] z-[5] mt-8 mb-11 flex gap-8 overflow-x-auto border-b border-line bg-ivory max-md:top-16 max-md:-me-4 max-md:gap-5">
        {SECTIONS.map((k) => <button key={k} type="button" onClick={() => scrollTo(k)} aria-current={tab === k} className={cn("border-b-2 py-3.5 text-[12px] whitespace-nowrap", tab === k ? "border-gold font-bold text-navy" : "border-transparent text-ink-muted")}>{t(`hotel.sections.${k}`)}</button>)}
      </nav>

      <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-16 max-lg:grid-cols-[1fr_320px] max-lg:gap-8 max-md:block">
        <div className="[&>section]:mb-14 [&>section]:scroll-mt-36 [&>section]:border-b [&>section]:border-line [&>section]:pb-14">
          <section id="sec-overview">
            <span className="eyebrow">{t("hotel.theStay")}</span>
            <h2 className="text-[34px] max-md:text-[26px]">{t("hotel.sections.overview")} · {h.category}</h2>
            <p className="max-w-3xl text-[15px] text-ink-muted">{h.description}</p>
            <div className="mt-6 grid grid-cols-3 gap-3 max-md:grid-cols-1">{h.amenities.slice(0, 6).map((a) => { const I = amenityIcon(a); return <span key={a} className="flex items-center gap-2.5 text-[12px] text-charcoal"><I className="size-[17px] text-gold" /> {a}</span>; })}</div>
            <div className="mt-7 flex flex-wrap items-center gap-3.5 border border-line bg-paper px-4 py-3.5">
              <span className="grid size-10 place-items-center rounded-full bg-sand text-xs font-bold text-navy">{h.host.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
              <div className="flex min-w-44 flex-1 flex-col"><b className="text-[13px] text-navy">{t("hotel.managedBy", { name: h.host.name })}</b><small className="mt-0.5 text-[11px] text-ink-muted">{t("hotel.responds", { time: h.host.responseTime, rate: h.host.responseRate })}</small></div>
              {h.host.badge && <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-2.5 py-1.5 text-[10px] font-bold text-sand"><Award className="size-3.5" /> {h.host.badge === "TOP_HOST" ? "Top Host" : "Highly Rated Host"}</span>}
              <Button variant="outline" size="sm" onClick={() => navigate("/messages")}><MessageCircle /> {t("hotel.contact")}</Button>
            </div>
          </section>

          <section id="sec-match" className="!border-b-0 bg-navy !p-11 text-white max-md:-mx-4 max-md:!px-5 max-md:!py-7">
            <div className="flex justify-between gap-5 max-md:flex-col">
              <div><span className="eyebrow eyebrow-light">{t("hotel.personal")}</span><h2 className="text-ivory">{t("hotel.matchFor", { score: m.score })}</h2>
                <p className="text-[#aeb7c2]">{t("hotel.basedOn", { summary: profile ? [t(`profile.purposeLabel.${profile.purpose}`), t(`profile.budgetLabel.${profile.budget}`), ...profile.atmosphere, ...profile.facilities].slice(0, 6).join(" · ") : "—" })}</p></div>
              <MatchLarge match={m} hotelId={h.id} dark />
            </div>
            <div className="my-8 grid grid-cols-2 gap-x-6 gap-y-5 max-md:grid-cols-1">
              {m.factors.map((f) => (
                <div key={f.key}>
                  <span className="mb-2 flex justify-between text-[11px]">{t(`match.factor.${f.key}`)}<b>{f.score}%</b></span>
                  <span className="block h-[3px] bg-white/12"><span className={cn("block h-full", f.score < 76 ? "bg-[#d98b7c]" : "bg-sand")} style={{ width: `${f.score}%` }} /></span>
                  <small className="mt-1.5 block text-[10px] text-[#8f99a5]">{reason(f.note)}</small>
                </div>
              ))}
            </div>
            <p className="border-s-2 border-sand ps-3.5 text-[14px] text-ivory italic">“{summary(m, profile)}”</p>
            <div className="my-7 grid grid-cols-2 border-y border-white/15 py-6 max-md:grid-cols-1">
              <div className="pe-5 max-md:border-b max-md:border-white/15 max-md:pb-4 md:border-e md:border-white/15">
                <h4 className="flex items-center gap-1.5 text-[12px] text-white"><Check className="size-3.5" /> {t("hotel.why")}</h4>
                {m.positives.slice(0, 5).map((p, i) => <p key={i} className="my-1.5 text-[12px] text-[#aeb7c2]">{reason(p)}</p>)}
              </div>
              <div className="ps-7 max-md:ps-0 max-md:pt-4">
                <h4 className="flex items-center gap-1.5 text-[12px] text-white"><CircleHelp className="size-3.5" /> {t("hotel.mayNot")}</h4>
                {m.negatives.length ? m.negatives.map((n, i) => <p key={i} className="my-1.5 text-[12px] text-[#aeb7c2] first-letter:uppercase">{reason(n)}</p>) : <p className="my-1.5 text-[12px] text-[#aeb7c2]">{t("match.nothingConflicts")}</p>}
              </div>
            </div>
            {wantsQuiet && (
              <div className="mb-4 flex flex-col gap-1 bg-white/6 px-4 py-3.5">
                <span className="text-[9px] font-bold tracking-[0.14em] text-sand uppercase">{t("hotel.insightLink")}</span>
                <b className="text-[13px]">{t("hotel.noisePct", { pct: h.noiseMentionPct })}</b>
                <small className="text-[11px] text-[#aeb7c2]">{h.noiseMentionPct >= 15 ? t("hotel.noiseLowered") : t("hotel.noiseOk")}</small>
              </div>
            )}
            <div className="flex flex-wrap gap-6 text-[11px] text-[#aeb7c2]"><span>{t("hotel.rvmRating", { rating: h.rating })}</span><span>{t("hotel.rvmMatch", { score: m.score })}</span></div>
          </section>

          <RoomsSection hotel={h} nights={nights} />

          <section id="sec-amenities">
            <SectionHeading eyebrow={t("hotel.sections.amenities")} title={t("hotel.offers")} />
            <ul className="grid grid-cols-3 gap-x-5 gap-y-3.5 max-md:grid-cols-1">{h.amenities.map((a) => { const I = amenityIcon(a); return <li key={a} className="flex items-center gap-2.5 text-[13px]"><I className="size-[18px] text-gold" /> {a}</li>; })}</ul>
            <h3 className="mt-7 mb-3 text-base">{t("hotel.accessibility")}</h3>
            <ul className="grid grid-cols-3 gap-x-5 gap-y-3.5 max-md:grid-cols-1">
              {h.accessibility.map((a) => <li key={a} className="flex items-center gap-2.5 text-[13px]"><Accessibility className="size-[18px] text-gold" /> {a}</li>)}
              {h.accessibility.length < 3 && <li className="flex items-center gap-2.5 text-[13px] text-ink-muted"><CircleHelp className="size-[18px]" /> {t("hotel.accessContact")}</li>}
            </ul>
          </section>

          <section id="sec-location">
            <SectionHeading eyebrow={t("hotel.sections.location")} title={`${h.area}, ${h.city}`} sub={t("hotel.fromCentre", { km: h.distanceKm })} />
            <div className="h-[300px] overflow-hidden"><Suspense fallback={<div className="skeleton h-full" />}><LocationMap hotel={h} /></Suspense></div>
            <ul className="mt-5 grid grid-cols-2 gap-x-7 max-md:grid-cols-1">
              {h.nearby.map((n) => { const I = nearbyIcon(n.kind); return (
                <li key={n.name} className="flex items-center gap-3 border-b border-line py-3">
                  <I className="size-[17px] shrink-0 text-gold" />
                  <span className="flex min-w-0 flex-1 flex-col"><b className="text-[13px] text-navy">{n.name}</b><small className="text-[11px] text-ink-muted">{t(`hotel.nearbyKind.${n.kind}`)}</small></span>
                  <em className="text-[11px] whitespace-nowrap text-navy not-italic">{n.distanceKm} km · {n.travelTime}</em>
                </li>
              ); })}
            </ul>
          </section>

          <ReviewsSection hotel={h} />

          <section id="sec-policies" className="!border-b-0">
            <SectionHeading eyebrow={t("hotel.sections.policies")} title={t("hotel.goodToKnow")} />
            <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
              {[
                { i: Clock3, title: t("hotel.checkInLabel"), text: t("hotel.checkInText", { time: h.checkIn }) },
                { i: Clock3, title: t("hotel.checkOutLabel"), text: t("hotel.checkOutText", { time: h.checkOut }) },
                { i: ShieldCheck, title: t("hotel.cancellation", { policy: t(`policy.${h.cancellationPolicy}`) }), text: t(`policy.long.${h.cancellationPolicy}`) },
                { i: Users, title: t("hotel.children"), text: t("hotel.childrenText") },
                { i: CalendarDays, title: t("hotel.monthly"), text: t("hotel.monthlyText", { pct: h.monthlyDiscountPct }) },
                { i: X, title: t("hotel.rules"), text: t("hotel.rulesText", { pets: h.petsAllowed ? t("hotel.petsAllowed") : t("hotel.petsNo") }) },
              ].map(({ i: I, title, text }) => <div key={title} className="flex flex-col gap-1.5 border border-line bg-paper p-4"><I className="size-[18px] text-gold" /><b className="text-[13px] text-navy">{title}</b><p className="m-0 text-[12px] text-ink-muted">{text}</p></div>)}
            </div>
          </section>
        </div>
        <BookingCard hotel={h} onChooseRoom={() => scrollTo("rooms")} />
      </div>

      {gallery && <Gallery images={h.images} rooms={h.rooms.flatMap((r) => r.images)} name={h.name} initial={gallery} onClose={() => setGallery(null)} />}
    </div>
  );
}
