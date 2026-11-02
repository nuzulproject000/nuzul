/* Design system & states reference (§58–59, §63, §65, §70–71, §79) — built from the real components. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, Check, Heart, Lock, Search, TriangleAlert } from "lucide-react";
import type { BookingState } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookingStateBadge, CardSkeleton, Counter, EmptyState, ErrorState, GuestFavoriteBadge, PageHeader, Rating, VerifiedStay } from "@/components/common";
import { MatchLarge, MatchPill } from "@/components/match";
import { HotelCard } from "@/components/hotel/hotel-card";
import { useCollection } from "@/hooks/queries";
import { MatchingExplainer } from "./matching-explainer";

const SWATCHES = [["Navy", "#0f1c2e"], ["Sand", "#d8b98a"], ["Gold", "#b8945b"], ["Ivory", "#f8f5ef"], ["Charcoal", "#252a30"], ["Success", "#315f4d"], ["Error", "#a1473e"]];
const FLOW: BookingState[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "COMPLETED"];
const ALT: BookingState[] = ["CANCELLED", "REFUNDED", "FAILED", "EXPIRED", "NO_SHOW"];

function Card({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return <section className={`border border-line bg-paper p-6 ${wide ? "col-span-2 max-lg:col-span-1" : ""}`}><h3 className="mb-4 text-base">{title}</h3>{children}</section>;
}

export default function SystemPage() {
  const { t } = useTranslation();
  const [n, setN] = useState(2);
  const { data: hotels } = useCollection("high-match");
  const h = hotels?.[0];
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow={t("system.eyebrow")} title={t("system.title")} lead={t("system.lead")} />
      <Tabs defaultValue="components">
        <TabsList>{(["components", "states", "matching", "architecture"] as const).map((k) => <TabsTrigger key={k} value={k}>{t(`system.tabs.${k}`)}</TabsTrigger>)}</TabsList>
        <TabsContent value="components" className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
          <Card title="Colour tokens"><div className="flex flex-wrap gap-3">{SWATCHES.map(([nm, c]) => <span key={nm} className="flex flex-col gap-1 text-[11px]"><i className="block h-12 w-16 border border-line" style={{ background: c }} /><b className="text-navy">{nm}</b><small className="text-ink-muted">{c}</small></span>)}</div></Card>
          <Card title="Typography"><p className="m-0 flex flex-col gap-2 text-navy"><span className="text-[40px] leading-none font-bold tracking-tight">Montserrat Display</span><span className="text-[22px] font-semibold">Heading 3 · 22/600</span><span>Body · 14/400 · line-height 1.7</span><span className="font-arabic text-xl">نُزُل — Tajawal for Arabic</span></p></Card>
          <Card title="Buttons"><div className="flex flex-wrap gap-2"><Button>Primary</Button><Button variant="gold">Accent</Button><Button variant="outline">Secondary</Button><Button variant="destructive">Destructive</Button><Button disabled>Disabled</Button><Button variant="text">Text <ArrowRight className="rtl:rotate-180" /></Button></div></Card>
          <Card title="Inputs"><div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1"><Field label="Default" htmlFor="ds1"><Input id="ds1" placeholder="Placeholder" /></Field><Field label="Error" htmlFor="ds2" error="Enter a valid email"><Input id="ds2" aria-invalid defaultValue="nadia@" /></Field><Field label="Disabled" htmlFor="ds3"><Input id="ds3" disabled defaultValue="Read only" /></Field><Field label="Select" htmlFor="ds4"><Select id="ds4" value="a" onValueChange={() => undefined} options={[{ value: "a", label: "Option" }, { value: "b", label: "Option B" }]} /></Field></div></Card>
          <Card title="Match Score — Nuzul identity">{h && <div className="flex flex-wrap items-center gap-4"><MatchPill score={h.match.score} hotelId={h.id} /><MatchPill score={82} /><span className="bg-navy p-2"><MatchPill score={96} dark /></span><MatchLarge match={h.match} hotelId={h.id} /></div>}</Card>
          <Card title="Rating vs. badges"><div className="flex flex-wrap items-center gap-3"><Rating rating={4.8} reviews={892} /><GuestFavoriteBadge /><VerifiedStay label={t("hotel.verifiedStay")} />{["CONFIRMED", "PENDING", "CANCELLED", "COMPLETED"].map((s) => <BookingStateBadge key={s} state={s as BookingState} />)}</div></Card>
          <Card title="Counters"><div className="border border-line px-4"><Counter label={t("search.adults")} sub={t("search.adultsSub")} value={n} min={1} onChange={setN} /></div></Card>
          <Card title="Toasts"><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => toast.success(t("card.savedTo", { name: "Red Sea escape" }))}>Success toast</Button><Button variant="outline" onClick={() => toast.error(t("booking.failedTitle"))}>Error toast</Button><Button variant="outline" onClick={() => toast.info(t("common.loading"))}>Info toast</Button></div></Card>
          <Card title="Hotel card" wide><div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">{hotels?.slice(0, 3).map((x) => <HotelCard key={x.id} hotel={x} showCompare />)}</div></Card>
        </TabsContent>
        <TabsContent value="states" className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
          <Card title="Skeleton loading"><div className="grid grid-cols-2 gap-4"><CardSkeleton /><CardSkeleton /></div></Card>
          <Card title="Empty — no hotels found"><EmptyState icon={<Search />} title={t("results.empty")} text={t("results.emptyText")} /></Card>
          <Card title="Empty — no saved hotels"><EmptyState icon={<Heart />} title={t("wishlists.emptyTitle")} text={t("wishlists.emptyText")} /></Card>
          <Card title="Error — search failed"><ErrorState title={t("results.error")} error={{ status: 0, code: "NETWORK", message: t("results.errorText") }} onRetry={() => toast.info(t("common.retry"))} /></Card>
          <Card title="Error — payment failed"><p role="alert" className="m-0 flex items-start gap-2 bg-error-bg p-4 text-[13px] text-error"><TriangleAlert className="size-4 shrink-0" /> <span><b>{t("booking.failedTitle")}</b> — Your bank declined the authorisation. No money was taken.</span></p></Card>
          <Card title="Success"><p className="m-0 flex items-center gap-2 bg-success-bg p-4 text-[13px] text-success"><Check className="size-4" /> <b>{t("booking.confirmedTitle")}</b> — NZL-260519-8472</p></Card>
          <Card title="Cancelled"><p className="m-0 flex items-center gap-2 bg-soft p-4 text-[13px] text-navy"><Lock className="size-4" /> <b>{t("trips.cancelled")}</b></p></Card>
          <Card title="Focus states"><p className="text-[13px] text-ink-muted">All interactive elements show a 3 px sand focus ring for keyboard users. Dialogs trap focus and close with Esc.</p><Button variant="outline" className="outline-3 outline-sand">Focused button</Button></Card>
        </TabsContent>
        <TabsContent value="matching"><MatchingExplainer /></TabsContent>
        <TabsContent value="architecture" className="max-w-4xl">
          <h3 className="text-lg">{t("system.pipeline")}</h3>
          <ol className="mb-8 grid grid-cols-5 gap-px bg-line max-md:grid-cols-1">{[["Search Engine", "Destination, dates, guests, filters"], ["Ranking Engine", "Availability, price, quality, popularity"], ["Match Engine", "Profile × hotel data × review insights"], ["Recommendation Engine", "History, likes, saves, bookings"], ["Personalized Results", "Ranked, explained results"]].map(([a, b]) => <li key={a} className="flex flex-col gap-1 bg-paper p-4"><b className="text-[12px] text-navy">{a}</b><small className="text-[11px] text-ink-muted">{b}</small></li>)}</ol>
          <h3 className="text-lg">{t("system.stateMachine")}</h3>
          <div className="flex flex-wrap items-center gap-2">{FLOW.map((s, i) => <span key={s} className="flex items-center gap-2"><BookingStateBadge state={s} />{i < FLOW.length - 1 && <ArrowRight className="size-3.5 text-ink-muted rtl:rotate-180" />}</span>)}</div>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">{t("system.alternative")}: {ALT.map((s) => <BookingStateBadge key={s} state={s} />)}</p>
          <h3 className="mt-8 text-lg">{t("system.payments")}</h3>
          <p className="text-[13px] text-charcoal">{t("system.paymentsText")}</p>
          <p className="mt-6 border-s-2 border-gold ps-3 text-[12px] text-ink-muted">{t("system.prototypeNote")}</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
