/* Host analytics (§49): occupancy, ADR (nightly room revenue only, fees excluded), funnel, cancellations, saves. */
import { useTranslation } from "react-i18next";
import { ErrorState } from "@/components/common";
import { BarSeries, CHART, HBars, Metric, MetricGrid, Panel, SampleBanner, compact } from "@/components/dashboard";
import { useHostStats } from "@/hooks/queries";

export default function HostAnalytics() {
  const { t } = useTranslation();
  const { data: s, error, refetch } = useHostStats();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!s) return <div className="skeleton h-96" />;
  const conv = ((s.funnel[3].value / s.funnel[0].value) * 100).toFixed(2);
  return (
    <>
      <SampleBanner />
      <MetricGrid>
        <Metric label={t("host.m.adr")} value={`EGP ${s.adr.toLocaleString()}`} sub={t("host.m.adrSub")} />
        <Metric label={t("host.m.occupancy")} value={`${s.occupancy}%`} delta={s.occupancyDelta} />
        <Metric label={t("host.m.cancellation")} value={`${s.cancellationRate}%`} />
        <Metric label={t("host.m.saves")} value={compact(s.wishlistSaves)} sub={t("host.m.conversion", { pct: conv })} />
      </MetricGrid>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Panel title={t("host.an.occupancy")} sub={t("host.an.occupancySub")}><BarSeries label={t("host.an.occupancy")} data={s.occupancyByMonth} x="month" y="occupancy" format={(v) => `${v}%`} /></Panel>
        <Panel title={t("host.an.funnel")} sub={t("host.an.funnelSub")}><HBars tone="navy" rows={s.funnel.map((f) => ({ label: t(`host.funnel.${f.step}`, { defaultValue: f.step }), value: f.value }))} format={compact} /></Panel>
        <Panel title={t("host.an.revenue")} sub={t("host.last30")} className="col-span-2 max-lg:col-span-1"><BarSeries label={t("host.an.revenue")} data={s.revenueSeries} x="day" y="revenue" color={CHART.navy} format={compact} /></Panel>
      </div>
    </>
  );
}
