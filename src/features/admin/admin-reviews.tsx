/* Review moderation (§26, §52): flagged queue, publish / remove with reason. Removal never alters the guest’s booking. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Star } from "lucide-react";
import type { Review } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Chip, EmptyState, ErrorState, VerifiedStay } from "@/components/common";
import { Toolbar } from "@/components/dashboard";
import { useAdminMutation, useAdminReviews } from "@/hooks/queries";
import { adminService } from "@/services/ops.service";
import { useDates } from "@/hooks/use-format";

const TABS = ["FLAGGED", "PUBLISHED", "REMOVED"] as const;
const REASONS = ["spam", "offensive", "notStay", "personal", "conflict"] as const;

export default function AdminReviews() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<(typeof TABS)[number]>("FLAGGED");
  const { data, isLoading, error, refetch } = useAdminReviews(tab);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <Toolbar title={t("admin.nav.reviews")} sub={t("admin.rv.sub")}>{TABS.map((k) => <Chip key={k} active={tab === k} onClick={() => setTab(k)}>{t(`admin.rv.${k}`)}</Chip>)}</Toolbar>
      {isLoading ? <div className="skeleton h-80" /> : !data?.length ? <EmptyState title={t("admin.rv.empty")} text={t("admin.rv.emptyText")} /> : data.map((r) => <Item key={r.id} r={r} />)}
    </>
  );
}

function Item({ r }: { r: Review }) {
  const { t } = useTranslation();
  const { date } = useDates();
  const [reason, setReason] = useState<string>(r.flagReason ?? "");
  const mod = useAdminMutation(({ m, reason }: { m: Review["moderation"]; reason?: string }) => adminService.moderateReview(r.id, m, reason), [["reviews"]]);
  return (
    <article className="border border-line bg-paper p-5">
      <header className="flex flex-wrap items-center gap-3"><b className="text-navy">{r.author}</b><small className="text-[11px] text-ink-muted">{r.hotelId} · {date(r.createdAt, "d MMM yyyy")}</small><span className="inline-flex items-center gap-1 text-[12px] font-bold"><Star className="size-3.5 fill-current" /> {r.overall}</span>{r.verifiedStay && <VerifiedStay label={t("hotel.verifiedStay")} />}{r.flagReason && <Badge tone="warn">{r.flagReason}</Badge>}</header>
      <p className="my-3 text-[13px]">{r.text}</p>
      <div className="flex flex-wrap items-center gap-2">
        {r.moderation !== "PUBLISHED" && <Button size="sm" disabled={mod.isPending} onClick={() => mod.mutate({ m: "PUBLISHED" }, { onSuccess: () => toast.success(t("admin.rv.published")) })}>{t("admin.rv.publish")}</Button>}
        {r.moderation !== "REMOVED" && <>
          <Select ariaLabel={t("trips.reason")} value={reason || undefined} placeholder={t("admin.rv.reason")} onValueChange={setReason} className="min-h-9 w-52 text-[12px]" options={REASONS.map((k) => ({ value: t(`admin.rv.reasons.${k}`), label: t(`admin.rv.reasons.${k}`) }))} />
          <Button size="sm" variant="destructive" disabled={!reason || mod.isPending} onClick={() => mod.mutate({ m: "REMOVED", reason }, { onSuccess: () => toast.success(t("admin.rv.removed")) })}>{t("admin.rv.remove")}</Button>
        </>}
      </div>
    </article>
  );
}
