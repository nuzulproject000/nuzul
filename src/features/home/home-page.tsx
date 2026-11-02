/* Homepage — structure follows spec §75 exactly (15 blocks, in order). */
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BadgeCheck, Crosshair, Heart, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardSkeleton, ErrorState, GuestFavoriteBadge, SectionHeading } from "@/components/common";
import { MatchPill } from "@/components/match";
import { HotelCard } from "@/components/hotel/hotel-card";
import { SearchBar } from "@/features/search/search-bar";
import { Questionnaire } from "@/features/search/questionnaire";
import { useCategories, useCollection, useDestinations, useHotel, useMatchProfile, useMyBookings, useWishlists } from "@/hooks/queries";
import type { CollectionKind } from "@/services/catalog.service";
import { useSearch } from "@/stores/search.store";
import { categoryIcon } from "@/lib/icons";
import { photos } from "@/lib/imagery";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";

function HotelRow({ kind, columns = 4 }: { kind: CollectionKind; columns?: 3 | 4 }) {
  const { data, isLoading, error, refetch } = useCollection(kind);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <div className={cn("grid gap-5 max-md:-me-4 max-md:flex max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:pe-4 max-md:scrollbar-none", columns === 4 ? "grid-cols-4 max-xl:grid-cols-2" : "grid-cols-3 max-lg:grid-cols-2")}>
      {isLoading ? Array.from({ length: columns }, (_, i) => <CardSkeleton key={i} />) : data?.map((h) => <HotelCard key={h.id} hotel={h} className="max-md:flex-[0_0_84%] max-md:snap-start" />)}
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setSearch = useSearch((s) => s.set);
  const recent = useSearch((s) => s.recent);
  const { data: categories } = useCategories();
  const { data: destinations } = useDestinations();
  const { data: profile } = useMatchProfile();
  const { data: wishlists } = useWishlists();
  const { data: bookings } = useMyBookings();
  const { data: popular } = useCollection("popular");
  const { data: nearby } = useCollection("nearby");
  const savedCount = new Set(wishlists?.flatMap((w) => w.hotelIds)).size;
  const goCity = (city: string) => { setSearch({ destination: city }); navigate(`/search?destination=${encodeURIComponent(city)}`); };
  const goCategory = (c: string) => navigate(`/search?category=${encodeURIComponent(c)}`);
  const pastBooking = bookings?.find((b) => b.state === "COMPLETED");
  const { data: pastHotel } = useHotel(pastBooking?.hotelId ?? "");

  return (
    <>
      {/* 1–2 · Hero */}
      <section className="grid min-h-[650px] grid-cols-[.76fr_1.24fr] max-lg:grid-cols-[1fr_1.15fr] max-md:flex max-md:min-h-0 max-md:flex-col-reverse">
        <div className="flex flex-col items-start justify-center py-[70px] ps-[max(48px,calc((100vw-1440px)/2))] pe-12 max-lg:ps-9 max-md:px-5 max-md:pt-9 max-md:pb-20">
          <span className="eyebrow">{t("home.eyebrow")}</span>
          <h1 className="mb-6 max-md:text-[42px]">{t("home.title1")}<br />{t("home.title2")}</h1>
          <p className="max-w-[440px] text-base text-ink-muted max-md:text-[13px]">{t("home.lead")}</p>
          <div className="mt-5 mb-14 flex flex-wrap gap-3 max-md:mb-0">
            <Button asChild><Link to="/search">{t("home.explore")} <ArrowRight className="rtl:rotate-180" /></Link></Button>
            <Button variant="outline" onClick={() => document.getElementById("match")?.scrollIntoView({ behavior: "smooth" })}>{t("home.findMatch")}</Button>
          </div>
          <div className="flex items-center gap-3.5 max-md:hidden">
            <div className="flex">{["AM", "RS", "LN"].map((x, i) => <span key={x} className={cn("grid size-[30px] place-items-center rounded-full border-2 border-ivory bg-sand text-[8px] text-navy", i && "-ms-2")}>{x}</span>)}</div>
            <p className="m-0 text-[11px] leading-snug text-ink-muted"><b className="text-navy">{t("home.inventoryNote")}</b><br />{t("home.inventorySub", { count: 13 })}</p>
          </div>
        </div>
        <div className="relative my-6 me-6 min-h-[590px] overflow-hidden max-md:m-0 max-md:h-[340px] max-md:min-h-0">
          <img src={photos.hero} alt="Mediterranean resort beside clear blue water" className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent from-60% to-navy/50" />
          <small className="absolute start-6 bottom-6 z-10 text-white max-md:hidden">{t("home.heroCaption")}</small>
          <div className="absolute end-6 bottom-6 z-10 flex flex-col items-start gap-2 bg-navy/95 px-5 py-4 text-white max-md:end-4 max-md:bottom-4">
            <MatchPill score={96} dark /><span className="text-[11px]">{t("home.heroFit")}</span>
          </div>
        </div>
      </section>

      {/* 3 · Search — 4 · Questionnaire attached directly beneath */}
      <SearchBar />
      <div id="match" className="container-page">
        <div className="my-7 flex items-center gap-3.5 text-gold" aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/60 rtl:bg-gradient-to-l" />
          <small className="text-[10px] font-bold tracking-[0.16em] uppercase">{t("home.refine")}</small>
          <span className="h-px flex-1 bg-gradient-to-r from-gold/60 to-transparent rtl:bg-gradient-to-l" />
        </div>
        <Questionnaire />
      </div>

      {/* 5 · Category navigation */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.categories.eyebrow")} title={t("home.categories.title")} />
        <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-2">
          {categories?.filter((c) => c.active).map((c) => { const Icon = categoryIcon(c.name); return (
            <button key={c.id} type="button" onClick={() => goCategory(c.name)} className="flex shrink-0 items-center gap-2 rounded-full border border-line py-2.5 ps-2.5 pe-4 text-[12px] text-navy hover:bg-soft/60">
              <span className="grid size-[29px] place-items-center rounded-full bg-soft"><Icon className="size-3.5" /></span>{c.name}
            </button>
          ); })}
        </div>
      </section>

      {/* 6 · Popular destinations */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.destinations.eyebrow")} title={t("home.destinations.title")} action={t("home.destinations.all")} onAction={() => navigate("/search?destination=")} />
        <div className="grid grid-cols-[1.2fr_.8fr_.8fr] grid-rows-[240px_240px] gap-4 max-md:-me-4 max-md:flex max-md:overflow-x-auto max-md:scrollbar-none">
          {destinations?.slice(0, 4).map((d, i) => (
            <button key={d.city} type="button" onClick={() => goCity(d.city)} className={cn("group relative overflow-hidden text-start max-md:h-80 max-md:flex-[0_0_78%]", i === 0 && "row-span-2", i === 3 && "col-span-2")}>
              <img src={d.image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              <span className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-navy/75" />
              <span className="absolute start-5 bottom-5 z-10 flex flex-col text-white"><b className="text-lg">{d.city}</b><small className="mt-1 opacity-80">{d.detail}</small></span>
              <i className="absolute end-5 bottom-5 z-10 grid size-9 place-items-center rounded-full bg-white/90 text-navy"><ArrowRight className="size-4 rtl:rotate-180" /></i>
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
          {destinations?.slice(4).map((d) => (
            <button key={d.city} type="button" onClick={() => goCity(d.city)} className="flex items-center gap-3 border border-line bg-paper p-2 text-start hover:bg-soft/50">
              <img src={d.image} alt="" loading="lazy" className="h-[52px] w-16 object-cover" /><span><b className="block text-[13px] text-navy">{d.city}</b><small className="text-[11px] text-ink-muted">{d.detail}</small></span>
            </button>
          ))}
        </div>
      </section>

      {/* 7 · Recommended for you (signals §38) */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.recommended.eyebrow")} title={t("home.recommended.title")} action={t("common.seeAll")} onAction={() => navigate("/search")} />
        <div className="-mt-3 mb-6 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
          <span>{t("home.recommended.basedOn")}</span>
          {[t("home.recommended.profile"), profile && t(`profile.purposeLabel.${profile.purpose}`), profile && t(`profile.budgetLabel.${profile.budget}`), savedCount ? t("home.recommended.saved", { count: savedCount }) : null, recent[0] ? t("home.recommended.recent", { place: recent[0] }) : null, pastHotel ? t("home.recommended.past", { hotel: pastHotel.name }) : null]
            .filter(Boolean).map((s) => <em key={String(s)} className="rounded-full bg-soft px-2.5 py-1 not-italic text-navy">{s}</em>)}
        </div>
        <HotelRow kind="recommended" />
      </section>

      {/* 8 · High match hotels */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.highMatch.eyebrow")} title={t("home.highMatch.title")} sub={t("home.highMatch.sub")} action={t("home.highMatch.action")} onAction={() => navigate("/search?sort=MATCH")} />
        <HotelRow kind="high-match" columns={3} />
      </section>

      {/* 9 · Guest favorites — distinct from Match */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.favorites.eyebrow")} title={t("home.favorites.title")} sub={t("home.favorites.sub")} />
        <div className="-mt-2 mb-6 flex flex-wrap items-center gap-2.5 border border-line bg-paper px-4 py-3.5 text-[11px] text-ink-muted">
          <GuestFavoriteBadge /><span>{t("home.favorites.gfMeans")}</span><b className="text-base text-gold">+</b><MatchPill score={94} /><span>{t("home.favorites.matchMeans")}</span>
        </div>
        <HotelRow kind="guest-favorites" />
      </section>

      {/* 10 · Popular hotels */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.popular.eyebrow")} title={t("home.popular.title")} />
        <ol className="grid grid-cols-2 gap-3 max-lg:grid-cols-1">
          {popular?.map((h, i) => (
            <li key={h.id}>
              <Link to={hotelPath(h)} className="grid grid-cols-[28px_76px_1fr_auto] items-center gap-3.5 border border-line bg-paper py-2.5 ps-2.5 pe-3.5 max-md:grid-cols-[22px_60px_1fr]">
                <b className="text-center text-[22px] text-gold">{i + 1}</b><img src={h.images[0]} alt="" loading="lazy" className="h-[60px] object-cover" />
                <span><b className="block text-[13px] text-navy">{h.name}</b><small className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted"><MapPin className="size-3" /> {h.city} · {t("common.review", { count: h.reviewCount })}</small></span>
                <MatchPill score={h.match.score} className="max-md:col-start-3 max-md:justify-self-start" />
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* 11 · Discover by category */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.discover.eyebrow")} title={t("home.discover.title")} />
        <div className="grid grid-cols-6 gap-3 max-xl:grid-cols-3 max-md:grid-cols-2">
          {([["Romantic", photos.sunset], ["Business", photos.city], ["Family", photos.pool], ["Spa", photos.lounge], ["Hotels with views", photos.coast], ["Hotels near landmarks", photos.villa]] as const).map(([c, img]) => (
            <button key={c} type="button" onClick={() => goCategory(c)} className="group relative aspect-[3/4] overflow-hidden text-start">
              <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              <span className="absolute inset-0 bg-gradient-to-b from-transparent from-45% to-navy/80" />
              <span className="absolute inset-x-3.5 bottom-3.5 z-10 text-[13px] font-bold text-white">{c}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 12 · Monthly / long stays */}
      <section className="container-page mt-28 grid grid-cols-[1.15fr_.85fr] max-md:mt-16 max-md:block">
        <div className="max-md:h-64"><img src={photos.lounge} alt="Warm natural hotel lounge" loading="lazy" className="h-full w-full object-cover" /></div>
        <div className="bg-navy p-16 max-md:px-6 max-md:py-10">
          <span className="eyebrow eyebrow-light">{t("home.longStay.eyebrow")}</span>
          <h2 className="text-ivory">{t("home.longStay.title1")}<br />{t("home.longStay.title2")}</h2>
          <p className="text-[#aeb7c2]">{t("home.longStay.text")}</p>
          <Button variant="ivory" onClick={() => { setSearch({ mode: "MONTHLY" }); navigate("/search?mode=monthly"); }}>{t("home.longStay.cta")} <ArrowRight className="rtl:rotate-180" /></Button>
          <div className="mt-11 flex gap-12 border-t border-white/15 pt-7">
            <span className="flex flex-col"><b className="text-[22px] text-sand">{t("home.longStay.stat1")}</b><small className="mt-1 text-[#aeb7c2]">{t("home.longStay.stat1Sub")}</small></span>
            <span className="flex flex-col"><b className="text-[22px] text-sand">{t("home.longStay.stat2")}</b><small className="mt-1 text-[#aeb7c2]">{t("home.longStay.stat2Sub")}</small></span>
          </div>
        </div>
      </section>

      {/* 13 · Nearby */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.nearby.eyebrow")} title={t("home.nearby.title")} sub={t("home.nearby.sub")} action={t("home.nearby.action")} onAction={() => goCity("Egypt")} />
        <div className="grid grid-cols-4 gap-3.5 max-lg:grid-cols-2 max-md:grid-cols-1">
          {nearby?.map((h) => (
            <Link key={h.id} to={hotelPath(h)} className="flex flex-col gap-2 border border-line bg-paper pb-3">
              <img src={h.images[0]} alt="" loading="lazy" className="h-36 object-cover" />
              <span className="flex flex-col px-3"><b className="text-[13px] text-navy">{h.name}</b><small className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-muted"><Crosshair className="size-3" /> {h.city} · {h.distanceKm} km</small></span>
              <MatchPill score={h.match.score} className="mx-3 self-start" />
            </Link>
          ))}
        </div>
      </section>

      {/* 14 · Travel inspiration */}
      <section className="container-page pt-24 max-md:pt-16">
        <SectionHeading eyebrow={t("home.inspiration.eyebrow")} title={t("home.inspiration.title")} />
        <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
          {[{ title: "A slow week on the Red Sea", sub: "Quiet resorts with spas and reef access", img: photos.coast, q: "Hurghada" }, { title: "Cairo for working travellers", sub: "Fast Wi-Fi, real desks, central locations", img: photos.city, q: "Cairo" }, { title: "Alexandria, the literary city", sub: "Heritage hotels on the Corniche", img: photos.sunset, q: "Alexandria" }].map((x) => (
            <button key={x.title} type="button" onClick={() => goCity(x.q)} className="border border-line bg-paper text-start">
              <img src={x.img} alt="" loading="lazy" className="h-52 w-full object-cover" />
              <div className="p-5"><span className="eyebrow">{t("home.inspiration.guide")}</span><h3 className="mb-1.5 text-lg">{x.title}</h3><p className="m-0 text-[13px] text-ink-muted">{x.sub}</p></div>
            </button>
          ))}
        </div>
      </section>

      <section className="container-page mt-28 grid grid-cols-2 items-end gap-8 border-y border-line py-16 max-md:mt-16 max-md:block">
        <div><span className="eyebrow">{t("home.host.eyebrow")}</span><h2>{t("home.host.title1")}<br />{t("home.host.title2")}</h2></div>
        <div><p className="max-w-xl text-ink-muted">{t("home.host.text")}</p><Button variant="gold" asChild><Link to="/host/listings/new">{t("nav.listHotel")} <ArrowRight className="rtl:rotate-180" /></Link></Button></div>
      </section>
      <div className="container-page flex flex-wrap justify-center gap-10 pt-10 text-[12px] text-navy max-md:flex-col max-md:items-center max-md:gap-3.5">
        <span className="flex items-center gap-2"><BadgeCheck className="size-4 text-gold" /> {t("home.trust.verified")}</span>
        <span className="flex items-center gap-2"><Heart className="size-4 text-gold" /> {t("home.trust.wishlists")}</span>
        <span className="flex items-center gap-2"><Search className="size-4 text-gold" /> {t("home.trust.prices")}</span>
      </div>
    </>
  );
}
