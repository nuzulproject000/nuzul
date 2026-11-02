/* Platform analytics (§49): conversion by Match band, Match Engine effectiveness, booking volume. */
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/common";
import { BarSeries, CHART, HBars, Metric, MetricGrid, Panel, SampleBanner } from "@/components/dashboard";
import { useAdminStats } from "@/hooks/queries";

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const { data: s, error, refetch } = useAdminStats();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!s) return <div className="skeleton h-96" />;
  return (
    <>
      <SampleBanner />
      <MetricGrid cols={4}>
        <Metric label={t("admin.mh.completion")} value={`${s.match.questionnaireCompletion}%`} />
        <Metric label={t("admin.mh.clicks")} value={`${s.match.scoreClickRate}%`} />
        <Metric label={t("admin.mh.conv")} value={`${s.match.matchToBooking}%`} />
        <Metric label={t("admin.mh.because")} value={`${s.match.selectedBecauseOfMatch}%`} />
      </MetricGrid>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Panel title={t("admin.an.band")} sub={t("admin.an.bandSub")}><BarSeries label={t("admin.an.band")} data={s.conversionByBand} x="band" y="rate" format={(v) => `${v}%`} /></Panel>
        <Panel title={t("admin.an.effect")} sub={t("admin.an.effectSub")}><HBars rows={[{ label: t("admin.mh.highMatch"), value: s.match.bookedHighMatch, max: 100 }, { label: t("admin.mh.because"), value: s.match.selectedBecauseOfMatch, max: 100 }, { label: t("admin.mh.clicks"), value: s.match.scoreClickRate, max: 100 }]} format={(v) => `${v}%`} /></Panel>
        <Panel title={t("admin.bookingsTrend")} sub={t("admin.last14")} className="col-span-2 max-lg:col-span-1"><BarSeries label={t("admin.bookingsTrend")} data={s.bookingsSeries} x="day" y="bookings" color={CHART.navy} /></Panel>
      </div>
    </>
  );
}
