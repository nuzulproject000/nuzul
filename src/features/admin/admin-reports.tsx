/* Reports & trust (§52): user, hotel, fraud, abuse, payment reports with status workflow. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Report } from "@/types/models";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Chip, EmptyState, ErrorState } from "@/components/common";
import { DataTable, Toolbar } from "@/components/dashboard";
import { useAdminMutation, useAdminReports } from "@/hooks/queries";
import { adminService } from "@/services/ops.service";
import { useDates } from "@/hooks/use-format";

const TYPES = ["ALL", "USER", "HOTEL", "FRAUD", "ABUSE", "PAYMENT"] as const;
const STATUS: Report["status"][] = ["OPEN", "IN_REVIEW", "HIGH_PRIORITY", "RESOLVED"];
const TONE = { OPEN: "warn", IN_REVIEW: "neutral", HIGH_PRIORITY: "danger", RESOLVED: "success" } as const;

export default function AdminReports() {
  const { t } = useTranslation();
  const { date } = useDates();
  const [type, setType] = useState<(typeof TYPES)[number]>("ALL");
  const { data, isLoading, error, refetch } = useAdminReports(type === "ALL" ? undefined : type);
  const update = useAdminMutation(({ id, status }: { id: string; status: Report["status"] }) => adminService.updateReport(id, status));
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <Toolbar title={t("admin.nav.reports")}>{TYPES.map((k) => <Chip key={k} active={type === k} onClick={() => setType(k)}>{k === "ALL" ? t("notifications.all") : t(`admin.rep.type.${k}`)}</Chip>)}</Toolbar>
      {isLoading ? <div className="skeleton h-80" /> : (
        <DataTable caption={t("admin.nav.reports")} rows={data ?? []} rowKey={(r) => r.id} empty={<EmptyState title={t("admin.rep.empty")} text={t("admin.rep.emptyText")} />} cols={[
          { head: t("host.col.type"), cell: (r) => <Badge tone="outline">{t(`admin.rep.type.${r.type}`)}</Badge> },
          { head: t("admin.rep.subject"), cell: (r) => <span className="flex flex-col"><b className="text-navy">{r.subject}</b><small className="text-ink-muted">{r.summary}</small></span> },
          { head: t("host.col.date"), cell: (r) => date(r.createdAt, "d MMM") },
          { head: t("common.status"), cell: (r) => <Badge tone={TONE[r.status]}>{t(`admin.rep.status.${r.status}`)}</Badge> },
          { head: t("common.actions"), cell: (r) => <Select ariaLabel={`${t("common.status")} · ${r.subject}`} value={r.status} onValueChange={(v) => update.mutate({ id: r.id, status: v as Report["status"] }, { onSuccess: () => toast.success(t("admin.rep.updated")) })} className="min-h-9 w-40 text-[12px]" options={STATUS.map((s) => ({ value: s, label: t(`admin.rep.status.${s}`) }))} /> },
        ]} />
      )}
    </>
  );
}
