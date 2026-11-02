/* Payments ledger (§61): authorisations, captures, refunds, payouts. Read-only; money movement happens at the provider. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Transaction } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Chip, ErrorState } from "@/components/common";
import { DataTable, Metric, MetricGrid, SampleBanner, Toolbar, compact } from "@/components/dashboard";
import { useTransactions } from "@/hooks/queries";
import { useDates, useMoney } from "@/hooks/use-format";
import { toEGP } from "@/lib/currency";

const TYPES: (Transaction["type"] | "ALL")[] = ["ALL", "AUTHORISATION", "CAPTURE", "REFUND", "PARTIAL_REFUND", "PAYOUT", "FAILED"];

export default function AdminPayments() {
  const { t } = useTranslation();
  const money = useMoney();
  const { date } = useDates();
  const [type, setType] = useState<(typeof TYPES)[number]>("ALL");
  const { data, isLoading, error, refetch } = useTransactions();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const all = data?.items ?? [];
  const sum = (k: Transaction["type"][]) => all.filter((x) => k.includes(x.type)).reduce((n, x) => n + Math.abs(toEGP(x.amount, x.currency)), 0);
  return (
    <>
      <SampleBanner text={t("admin.pay.note")} />
      <MetricGrid>
        <Metric label={t("host.tx.AUTHORISATION")} value={`EGP ${compact(sum(["AUTHORISATION"]))}`} />
        <Metric label={t("host.tx.CAPTURE")} value={`EGP ${compact(sum(["CAPTURE"]))}`} />
        <Metric label={t("host.earn.refunds")} value={`EGP ${compact(sum(["REFUND", "PARTIAL_REFUND"]))}`} />
        <Metric label={t("host.tx.FAILED")} value={all.filter((x) => x.type === "FAILED").length} />
      </MetricGrid>
      <Toolbar title={t("admin.nav.payments")}>{TYPES.map((k) => <Chip key={k} active={type === k} onClick={() => setType(k)}>{k === "ALL" ? t("notifications.all") : t(`host.tx.${k}`)}</Chip>)}</Toolbar>
      {isLoading ? <div className="skeleton h-80" /> : (
        <DataTable caption={t("admin.nav.payments")} rows={all.filter((x) => type === "ALL" || x.type === type)} rowKey={(x) => x.id} cols={[
          { head: t("host.col.date"), cell: (x) => date(x.at, "d MMM yyyy") },
          { head: t("host.col.type"), cell: (x) => t(`host.tx.${x.type}`) },
          { head: t("host.col.reference"), cell: (x) => <span className="font-mono text-[11px]">{x.reference}</span> },
          { head: t("host.col.amount"), cell: (x) => <b className={x.amount < 0 ? "text-error" : "text-navy"}>{x.amount < 0 ? "−" : ""}{money(Math.abs(x.amount), x.currency)}</b> },
          { head: t("host.col.provider"), cell: (x) => x.provider },
          { head: t("common.status"), cell: (x) => <Badge tone={x.status === "FAILED" ? "danger" : x.status === "AUTHORISED" ? "warn" : "success"}>{t(`host.txStatus.${x.status}`)}</Badge> },
        ]} />
      )}
    </>
  );
}
