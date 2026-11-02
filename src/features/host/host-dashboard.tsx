/* Host dashboard (§40): KPIs, revenue & occupancy, match insights, today’s arrivals, to-dos. */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, CircleHelp, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingStateBadge, ErrorState } from "@/components/common";
import { MatchPill } from "@/components/match";
import { Avatar, CHART, DataTable, HBars, LineSeries, Metric, MetricGrid, Panel, SampleBanner, compact } from "@/components/dashboard";
import { useConversations, useHostHotels, useHostMatchInsights, useHostReviews, useHostStats } from "@/hooks/queries";
import { useDates, useMoney } from "@/hooks/use-format";

export default function HostDashboard() {
  const { t } = useTranslation();
  const money = useMoney();
  const { date } = useDates();
  const { data: s, error, refetch } = useHostStats();
  const { data: insights } = useHostMatchInsights();
  const { data: hotels } = useHostHotels();
  const { data: reviews } = useHostReviews();
  const { data: convos } = useConversations();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!s) return <div className="skeleton h-[600px]" />;
  const roomName = (hid: string, rid: string) => hotels?.find((h) => h.id === hid)?.rooms.find((r) => r.id === rid)?.name ?? "";
  const unreplied = (reviews ?? []).filter((r) => !r.hostReply).length;
  const unread = (convos ?? []).reduce((n, c) => n + c.unread, 0);
  return (
    <>
      <SampleBanner />
      <MetricGrid cols={6}>
        <Metric label={t("host.m.revenue")} value={`EGP ${compact(s.revenue)}`} delta={s.revenueDelta} />
        <Metric label={t("host.m.occupancy")} value={`${s.occupancy}%`} delta={s.occupancyDelta} />
        <Metric label={t("host.m.bookings")} value={s.bookings} sub={t("host.m.bookingsSub", { n: s.bookingsDelta })} />
        <Metric label={t("host.m.checkIns")} value={s.checkInsNext7} sub={t("host.m.next7")} />
        <Metric label={t("host.m.checkOuts")} value={s.checkOutsNext7} sub={t("host.m.next7")} />
        <Metric label={t("host.m.rating")} value={s.averageRating} sub={t("common.review", { count: s.reviewCount })} />
      </MetricGrid>
      <div className="grid grid-cols-[2fr_1fr] gap-4 max-lg:grid-cols-1">
        <Panel title={t("host.revOcc")} sub={t("host.last30")}>
          <LineSeries label={t("host.revOcc")} data={s.revenueSeries} x="day" lines={[{ key: "revenue", color: CHART.gold, name: t("host.m.revenue") }]} format={compact} />
        </Panel>
        <Panel title={t("host.matchCard")} sub={t("host.matchCardSub")} action={insights && <MatchPill score={insights.average} />}>
          {insights && <HBars rows={insights.segments.slice(0, 4).map((x) => ({ label: t(`host.segment.${x.label}`, { defaultValue: x.label }), value: x.score, max: 100 }))} format={(v) => `${v}%`} />}
          <Button variant="text" size="sm" className="mt-3" asChild><Link to="/host/match-insights">{t("host.fullInsights")} <ArrowRight className="rtl:rotate-180" /></Link></Button>
        </Panel>
      </div>
      <div className="grid grid-cols-[2fr_1fr] gap-4 max-lg:grid-cols-1">
        <Panel title={t("host.today")} sub={t("host.todaySub", { n: s.today.length })} action={<Button variant="text" size="sm" asChild><Link to="/host/reservations">{t("host.allReservations")}</Link></Button>}>
          <DataTable caption={t("host.today")} rows={s.today} rowKey={(b) => b.id} cols={[
            { head: t("host.col.guest"), cell: (b) => <span className="flex items-center gap-2"><Avatar name={b.guestName} /><b className="text-navy">{b.guestName}</b></span> },
            { head: t("host.col.room"), cell: (b) => roomName(b.hotelId, b.roomId) },
            { head: t("host.col.dates"), cell: (b) => `${date(b.checkIn)} → ${date(b.checkOut)}` },
            { head: t("host.col.total"), cell: (b) => money(b.price.total, b.currency) },
            { head: t("common.status"), cell: (b) => <BookingStateBadge state={b.state} /> },
          ]} />
        </Panel>
        <Panel title={t("host.todo")}>
          <ul className="flex flex-col gap-3 text-[12px] text-charcoal [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-gold">
            <li className="flex items-center gap-2"><CircleHelp /> <span className="flex-1">{t("host.todoRequests", { count: s.pendingRequests })}</span><Link className="font-bold text-gold" to="/host/reservations?state=PENDING">{t("host.review")}</Link></li>
            <li className="flex items-center gap-2"><MessageCircle /> <span className="flex-1">{t("host.todoMessages", { count: unread })}</span><Link className="font-bold text-gold" to="/host/messages">{t("host.reply")}</Link></li>
            <li className="flex items-center gap-2"><Star /> <span className="flex-1">{t("host.todoReviews", { count: unreplied })}</span><Link className="font-bold text-gold" to="/host/reviews">{t("host.reply")}</Link></li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
