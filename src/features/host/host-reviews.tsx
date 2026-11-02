/* Host reviews (§51): verified reviews, category scores, public replies. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Star } from "lucide-react";
import type { Review } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Chip, EmptyState, ErrorState, VerifiedStay } from "@/components/common";
import { Metric, MetricGrid, Toolbar } from "@/components/dashboard";
import { useHostHotels, useHostMutation, useHostReviews } from "@/hooks/queries";
import { hostService } from "@/services/ops.service";
import { useDates } from "@/hooks/use-format";
import { errorMessage } from "@/lib/forms";

export default function HostReviews() {
  const { t } = useTranslation();
  const { data, isLoading, error, refetch } = useHostReviews();
  const { data: hotels } = useHostHotels();
  const [filter, setFilter] = useState<"ALL" | "UNREPLIED">("ALL");
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const list = (data ?? []).filter((r) => filter === "ALL" || !r.hostReply);
  const avg = data?.length ? (data.reduce((n, r) => n + r.overall, 0) / data.length).toFixed(1) : "—";
  return (
    <>
      <MetricGrid cols={3}>
        <Metric label={t("host.m.rating")} value={avg} sub={t("common.review", { count: data?.length ?? 0 })} />
        <Metric label={t("host.rv.unreplied")} value={(data ?? []).filter((r) => !r.hostReply).length} />
        <Metric label={t("host.rv.flagged")} value={(data ?? []).filter((r) => r.moderation === "FLAGGED").length} sub={t("host.rv.flaggedSub")} />
      </MetricGrid>
      <Toolbar title={t("host.nav.reviews")}><Chip active={filter === "ALL"} onClick={() => setFilter("ALL")}>{t("notifications.all")}</Chip><Chip active={filter === "UNREPLIED"} onClick={() => setFilter("UNREPLIED")}>{t("host.rv.unreplied")}</Chip></Toolbar>
      {isLoading ? <div className="skeleton h-80" /> : !list.length ? <EmptyState title={t("host.rv.empty")} text={t("host.rv.emptyText")} /> : list.map((r) => <ReviewItem key={r.id} r={r} hotel={hotels?.find((h) => h.id === r.hotelId)?.name ?? ""} />)}
    </>
  );
}

function ReviewItem({ r, hotel }: { r: Review; hotel: string }) {
  const { t } = useTranslation();
  const { date } = useDates();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const reply = useHostMutation((body: string) => hostService.reply(r.id, body));
  const tooShort = text.trim().length < 10;
  return (
    <article className="border border-line bg-paper p-5">
      <header className="flex flex-wrap items-center gap-3"><b className="text-navy">{r.author}</b><small className="text-[11px] text-ink-muted">{hotel} · {r.tripType} · {date(r.createdAt, "d MMM yyyy")}</small><span className="ms-auto inline-flex items-center gap-1 text-[12px] font-bold text-navy"><Star className="size-3.5 fill-current" /> {r.overall.toFixed(1)}</span>{r.verifiedStay && <VerifiedStay label={t("hotel.verifiedStay")} />}{r.moderation === "FLAGGED" && <Badge tone="warn">{t("host.rv.underReview")}</Badge>}</header>
      <p className="my-3 text-[13px]">{r.text}</p>
      <div className="flex flex-wrap gap-2">{Object.entries(r.categories).map(([k, v]) => <span key={k} className="rounded-full bg-soft px-2.5 py-1 text-[11px] text-navy">{t(`categories.${k}`)} <b>{v}</b></span>)}</div>
      {r.hostReply ? <blockquote className="mt-4 mb-0 border-s-2 border-gold bg-soft/50 px-3.5 py-2.5 text-[12px]"><b className="mb-1 block text-[11px] text-navy">{t("host.rv.yourReply")}</b>{r.hostReply}</blockquote>
        : open ? <div className="mt-4">
          <label htmlFor={`rp-${r.id}`} className="sr-only">{t("host.rv.reply")}</label>
          <Textarea id={`rp-${r.id}`} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("host.rv.placeholder")} />
          <small className="text-[11px] text-ink-muted">{t("host.rv.public")}</small>
          {reply.error && <p role="alert" className="text-[12px] text-error">{errorMessage(reply.error, "")}</p>}
          <div className="mt-2 flex gap-2"><Button size="sm" disabled={tooShort || reply.isPending} onClick={() => reply.mutate(text, { onSuccess: () => toast.success(t("host.rv.posted")) })}>{t("host.rv.post")}</Button><Button size="sm" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button></div>
        </div> : <Button size="sm" variant="outline" className="mt-4" onClick={() => setOpen(true)}>{t("host.rv.reply")}</Button>}
    </article>
  );
}
