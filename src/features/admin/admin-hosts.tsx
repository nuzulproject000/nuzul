/* Host quality management (§52): response, cancellation, accuracy, complaints; badge assignment. */
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { HostQuality } from "@/types/models";
import { Select } from "@/components/ui/select";
import { Bar, ErrorState } from "@/components/common";
import { Avatar, DataTable, Toolbar } from "@/components/dashboard";
import { useAdminMutation, useHostQuality } from "@/hooks/queries";
import { adminService } from "@/services/ops.service";
import { cn } from "@/lib/utils";

export default function AdminHosts() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useHostQuality();
  const update = useAdminMutation(({ id, patch }: { id: string; patch: Partial<HostQuality> }) => adminService.updateHostQuality(id, patch));
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const pct = (v: number, good: boolean) => <span className={cn("font-bold", good ? "text-success" : "text-error")}>{v}%</span>;
  return (
    <>
      <Toolbar title={t("admin.nav.hosts")} sub={t("admin.hosts.sub")} />
      {isLoading ? <div className="skeleton h-80" /> : (
        <DataTable caption={t("admin.nav.hosts")} rows={data ?? []} rowKey={(h) => h.hostId} cols={[
          { head: t("admin.col.host"), cell: (h) => <span className="flex items-center gap-2"><Avatar name={h.name} /><b className="text-navy">{h.name}</b></span> },
          { head: t("host.q.responseRate"), cell: (h) => <span className="flex flex-col">{pct(h.responseRate, h.responseRate >= 90)}<small className="text-[10px] text-ink-muted">{h.responseTime}</small></span> },
          { head: t("host.m.cancellation"), cell: (h) => pct(h.cancellationRate, h.cancellationRate <= 5) },
          { head: t("match.rating"), cell: (h) => `★ ${h.rating}` },
          { head: t("admin.hosts.accuracy"), cell: (h) => h.accuracy.toFixed(1) },
          { head: t("admin.hosts.complaints"), cell: (h) => pct(h.complaintsPct, h.complaintsPct <= 2) },
          { head: t("admin.hosts.reliability"), cell: (h) => <span className="flex items-center gap-2"><Bar value={h.reliability} className="w-16" label={t("admin.hosts.reliability")} />{h.reliability}</span> },
          { head: t("admin.hosts.badge"), cell: (h) => <Select ariaLabel={`${t("admin.hosts.badge")} · ${h.name}`} value={h.badge ?? "NONE"} onValueChange={(v) => update.mutate({ id: h.hostId, patch: { badge: v === "NONE" ? undefined : (v as HostQuality["badge"]) } }, { onSuccess: () => toast.success(t("admin.hosts.badgeSet")) })} className="min-h-9 w-44 text-[12px]" options={[{ value: "NONE", label: t("admin.hosts.noBadge") }, { value: "TOP_HOST", label: "Top Host" }, { value: "HIGHLY_RATED_HOST", label: "Highly Rated Host" }]} /> },
        ]} />
      )}
      <p className="text-[11px] text-ink-muted">{t("admin.hosts.note")}</p>
    </>
  );
}
