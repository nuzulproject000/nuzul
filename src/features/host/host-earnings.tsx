/* Earnings & payouts (§48). Payouts are executed by the payment provider (backend-dependent). */
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/common";
import { DataTable, Metric, MetricGrid, Panel, SampleBanner, Toolbar, compact } from "@/components/dashboard";
import { useHostEarnings } from "@/hooks/queries";
import { useDates, useMoney } from "@/hooks/use-format";

export default function HostEarnings() {
  const { t } = useTranslation();
  const money = useMoney();
  const { date } = useDates();
  const { data: e, error, refetch } = useHostEarnings();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!e) return <div className="skeleton h-96" />;
  const exportCsv = () => {
    const csv = ["date,type,reference,amount,currency,provider,status", ...e.transactions.map((x) => [x.at, x.type, x.reference, x.amount, x.currency, x.provider, x.status].join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = "nuzul-earnings.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(t("host.earn.exported"));
  };
  return (
    <>
      <SampleBanner text={t("host.earn.note")} />
      <Toolbar title={t("host.nav.earnings")}><Button variant="outline" onClick={exportCsv}><Download /> {t("host.earn.export")}</Button></Toolbar>
      <MetricGrid>
        <Metric label={t("host.earn.gross")} value={`EGP ${compact(e.gross)}`} />
        <Metric label={t("host.earn.commission", { pct: e.commissionPct })} value={`EGP ${compact(e.commission)}`} />
        <Metric label={t("host.earn.refunds")} value={`EGP ${compact(e.refunds)}`} />
        <Metric label={t("host.earn.net")} value={`EGP ${compact(e.net)}`} sub={t("host.earn.next", { date: date(e.nextPayout, "d MMM yyyy") })} />
      </MetricGrid>
      <Panel title={t("host.earn.tx")}>
        <DataTable caption={t("host.earn.tx")} rows={e.transactions} rowKey={(x) => x.id} cols={[
          { head: t("host.col.date"), cell: (x) => date(x.at, "d MMM yyyy") },
          { head: t("host.col.type"), cell: (x) => t(`host.tx.${x.type}`) },
          { head: t("host.col.reference"), cell: (x) => <span className="font-mono text-[11px]">{x.reference}</span> },
          { head: t("host.col.amount"), cell: (x) => <b className={x.type.includes("REFUND") ? "text-error" : "text-navy"}>{x.type.includes("REFUND") ? "−" : ""}{money(x.amount, x.currency)}</b> },
          { head: t("host.col.provider"), cell: (x) => x.provider },
          { head: t("common.status"), cell: (x) => <Badge tone={x.status === "FAILED" ? "danger" : x.status === "AUTHORISED" ? "warn" : "success"}>{t(`host.txStatus.${x.status}`)}</Badge> },
        ]} />
      </Panel>
    </>
  );
}
