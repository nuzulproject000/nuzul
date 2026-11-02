/* Admin dashboard (§49, §52): platform KPIs, booking trend, Match Engine health, trust & safety queue. */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flag, ShieldAlert, UserX, Wallet } from "lucide-react";
import { ErrorState } from "@/components/common";
import { BarSeries, HBars, Metric, MetricGrid, Panel, SampleBanner, compact } from "@/components/dashboard";
import { useAdminStats } from "@/hooks/queries";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: s, error, refetch } = useAdminStats();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!s) return <div className="skeleton h-[600px]" />;
  const fraud = [
    { icon: UserX, label: t("admin.fraud.fakeAccounts"), value: s.fraud.fakeAccounts, to: "/admin/users?status=SUSPENDED" },
    { icon: Wallet, label: t("admin.fraud.heldPayments"), value: s.fraud.heldPayments, to: "/admin/payments" },
    { icon: Flag, label: t("admin.fraud.reviewFlags"), value: s.fraud.reviewFlags, to: "/admin/reviews" },
    { icon: ShieldAlert, label: t("admin.fraud.spam"), value: s.fraud.spam, to: "/admin/reports" },
  ];
  return (
    <>
      <SampleBanner />
      <MetricGrid cols={6}>
        <Metric label={t("admin.m.users")} value={compact(s.users)} delta={s.usersDelta} />
        <Metric label={t("admin.m.hotels")} value={compact(s.hotels)} delta={s.hotelsDelta} />
        <Metric label={t("admin.m.bookings")} value={compact(s.bookings30d)} sub={t("admin.m.last30")} />
        <Metric label={t("admin.m.gmv")} value={`EGP ${compact(s.gmv30d)}`} sub={t("admin.m.last30")} />
        <Metric label={t("admin.m.verification")} value={s.pendingVerification} sub={t("admin.m.awaiting")} />
        <Metric label={t("admin.m.reports")} value={s.openReports} sub={t("admin.m.open")} />
      </MetricGrid>
      <div className="grid grid-cols-[2fr_1fr] gap-4 max-lg:grid-cols-1">
        <Panel title={t("admin.bookingsTrend")} sub={t("admin.last14")}><BarSeries label={t("admin.bookingsTrend")} data={s.bookingsSeries} x="day" y="bookings" /></Panel>
        <Panel title={t("admin.matchHealth")} sub={t("admin.matchHealthSub")}>
          <HBars rows={[
            { label: t("admin.mh.completion"), value: s.match.questionnaireCompletion, max: 100 },
            { label: t("admin.mh.clicks"), value: s.match.scoreClickRate, max: 100 },
            { label: t("admin.mh.highMatch"), value: s.match.bookedHighMatch, max: 100 },
            { label: t("admin.mh.because"), value: s.match.selectedBecauseOfMatch, max: 100 },
          ]} format={(v) => `${v}%`} />
          <Link to="/admin/match-engine" className="mt-4 inline-block text-[12px] font-bold text-gold">{t("admin.configure")}</Link>
        </Panel>
      </div>
      <Panel title={t("admin.trust")} sub={t("admin.trustSub")}>
        <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">{fraud.map(({ icon: I, label, value, to }) => <Link key={label} to={to} className="flex items-center gap-3 border border-line p-4 hover:border-gold"><I className="size-5 text-gold" /><span className="flex flex-col"><b className="text-xl text-navy">{value}</b><small className="text-[11px] text-ink-muted">{label}</small></span></Link>)}</div>
      </Panel>
    </>
  );
}
