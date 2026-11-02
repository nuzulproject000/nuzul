/* Hotel management & verification review (§45, §52): approve, reject, set verification level, suspend. */
import { errorMessage } from "@/lib/forms";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Eye } from "lucide-react";
import type { Hotel, VerificationLevel } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Chip, ErrorState } from "@/components/common";
import { DataTable, Toolbar } from "@/components/dashboard";
import { useAdminHotels, useAdminMutation } from "@/hooks/queries";
import { adminService } from "@/services/ops.service";
import { STATUS_TONE } from "@/features/host/host-utils";
import { hotelPath } from "@/app/paths";

const FILTERS = ["ALL", "PENDING", "IN_REVIEW", "LIVE", "SUSPENDED", "REJECTED"] as const;

export default function AdminHotels() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [review, setReview] = useState<Hotel | null>(null);
  const [note, setNote] = useState("");
  const { data, isLoading, error, refetch } = useAdminHotels();
  const update = useAdminMutation(({ id, patch }: { id: string; patch: Partial<Hotel> }) => adminService.updateHotel(id, patch), [["hotels"]]);
  const rows = (data?.items ?? []).filter((h) => filter === "ALL" || h.status === filter);
  const [suspend, setSuspend] = useState<Hotel | null>(null);
  const act = (h: Hotel, patch: Partial<Hotel>, msg: string) => update.mutate({ id: h.id, patch }, { onSuccess: () => { toast.success(msg); setReview(null); setSuspend(null); setNote(""); }, onError: (e) => toast.error(errorMessage(e, t("errors.generic"))) });
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <Toolbar title={t("admin.nav.hotels")} sub={t("admin.hotels.sub", { count: data?.total ?? 0 })} />
      <div className="flex flex-wrap gap-2">{FILTERS.map((f) => <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f === "ALL" ? t("notifications.all") : t(`host.status.${f}`)} <span className="opacity-60">{f === "ALL" ? data?.items.length : data?.items.filter((h) => h.status === f).length}</span></Chip>)}</div>
      {isLoading ? <div className="skeleton h-80" /> : (
        <DataTable caption={t("admin.nav.hotels")} rows={rows} rowKey={(h) => h.id} cols={[
          { head: t("host.col.property"), cell: (h) => <span className="flex items-center gap-3"><img src={h.images[0]} alt="" className="h-10 w-14 object-cover" /><span className="flex flex-col"><b className="text-navy">{h.name}</b><small className="text-ink-muted">{h.city}, {h.country}</small>{h.moderationNote && h.status !== "LIVE" && <small className="max-w-56 text-[10px] text-error">{h.moderationNote}</small>}</span></span> },
          { head: t("admin.col.host"), cell: (h) => h.host.name },
          { head: t("common.status"), cell: (h) => <Badge tone={STATUS_TONE[h.status]}>{t(`host.status.${h.status}`)}</Badge> },
          { head: t("host.col.verification"), cell: (h) => <Select ariaLabel={`${t("host.col.verification")} · ${h.name}`} value={h.verification} onValueChange={(v) => act(h, { verification: v as VerificationLevel }, t("admin.hotels.levelSet"))} className="min-h-9 w-44 text-[12px]" options={(["BASIC", "VERIFIED", "PREMIUM_VERIFIED"] as const).map((v) => ({ value: v, label: t(`host.verification.${v}`) }))} /> },
          { head: t("match.rating"), cell: (h) => (h.reviewCount ? `★ ${h.rating} · ${h.reviewCount}` : "—") },
          { head: t("common.actions"), cell: (h) => <div className="flex flex-wrap gap-1.5">
            {["PENDING", "IN_REVIEW"].includes(h.status) && <Button size="xs" onClick={() => setReview(h)}>{t("admin.hotels.review")}</Button>}
            {h.status === "LIVE" && <Button size="xs" variant="outline" className="text-error" onClick={() => { setNote(""); setSuspend(h); }}>{t("admin.hotels.suspend")}</Button>}
            {["SUSPENDED", "REJECTED"].includes(h.status) && <Button size="xs" variant="outline" onClick={() => act(h, { status: "LIVE" }, t("admin.hotels.restored"))}>{t("admin.hotels.restore")}</Button>}
            <Button size="icon-sm" variant="ghost" asChild aria-label={t("host.preview")}><Link to={hotelPath(h)} target="_blank"><Eye /></Link></Button>
          </div> },
        ]} />
      )}
      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        {review && <DialogContent size="lg" title={t("admin.hotels.reviewTitle", { name: review.name })} description={t("admin.hotels.reviewText")}>
          <div className="grid grid-cols-[200px_1fr] gap-5 max-sm:grid-cols-1"><img src={review.images[0]} alt="" className="aspect-[4/3] w-full object-cover" /><div className="text-[13px]"><p className="m-0 text-charcoal">{review.description}</p><p className="mt-2 text-ink-muted">{review.area}, {review.city} · {t("host.roomTypes", { count: review.rooms.length })} · {review.amenities.length} {t("filters.amenities").toLowerCase()}</p></div></div>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-[12px] max-sm:grid-cols-1">{(["identity", "business", "license", "location", "insurance", "contact"] as const).map((k, i) => <li key={k} className="flex items-center justify-between border border-line px-3 py-2"><span>{t(`host.docs.${k}`)}</span><Badge tone={i % 3 === 2 ? "warn" : "success"}>{i % 3 === 2 ? t("host.docs.missing") : t("host.docs.submitted")}</Badge></li>)}</ul>
          <label htmlFor="rv-note" className="mt-4 block text-[11px] font-bold text-navy">{t("admin.hotels.note")}</label>
          <Textarea id="rv-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.hotels.notePh")} className="mt-2" />
          <DialogFooter>
            <Button variant="destructive" disabled={update.isPending || !note.trim()} onClick={() => act(review, { status: "REJECTED", moderationNote: note }, t("admin.hotels.rejected"))}>{t("admin.hotels.reject")}</Button>
            <Button variant="outline" disabled={update.isPending} onClick={() => act(review, { status: "IN_REVIEW", moderationNote: note || undefined }, t("admin.hotels.infoRequested"))}>{t("admin.hotels.requestInfo")}</Button>
            <Button disabled={update.isPending} onClick={() => act(review, { status: "LIVE", verification: "VERIFIED" }, t("admin.hotels.approved"))}>{t("admin.hotels.approve")}</Button>
          </DialogFooter>
        </DialogContent>}
      </Dialog>
      <Dialog open={!!suspend} onOpenChange={(o) => !o && setSuspend(null)}>
        {suspend && <DialogContent title={t("admin.hotels.suspendTitle", { name: suspend.name })} description={t("admin.hotels.suspendText")}>
          <label htmlFor="sus-note" className="block text-[11px] font-bold text-navy">{t("admin.hotels.note")}</label>
          <Textarea id="sus-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("admin.hotels.notePh")} className="mt-2" />
          <DialogFooter><Button variant="outline" onClick={() => setSuspend(null)}>{t("common.cancel")}</Button><Button variant="destructive" disabled={!note.trim() || update.isPending} onClick={() => act(suspend, { status: "SUSPENDED", moderationNote: note }, t("admin.hotels.suspended"))}>{t("admin.hotels.suspend")}</Button></DialogFooter>
        </DialogContent>}
      </Dialog>
    </>
  );
}
