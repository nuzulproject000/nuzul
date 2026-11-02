/* Host profile & quality (§52): badges, response metrics, verification level. */
import { useTranslation } from "react-i18next";
import { Award, BadgeCheck, Clock3, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Bar, ErrorState } from "@/components/common";
import { Metric, MetricGrid, Panel } from "@/components/dashboard";
import { useHostHotels, useHostStats } from "@/hooks/queries";

export default function HostProfile() {
  const { t } = useTranslation();
  const { data: hotels, error, refetch } = useHostHotels();
  const { data: s } = useHostStats();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const host = hotels?.[0]?.host;
  if (!host) return <div className="skeleton h-96" />;
  const criteria = [
    { label: t("host.q.response"), value: host.responseRate, target: 90, icon: MessageCircle },
    { label: t("host.q.rating"), value: Math.round(((s?.averageRating ?? 0) / 5) * 100), target: 92, icon: Star },
    { label: t("host.q.cancellation"), value: Math.round(100 - (s?.cancellationRate ?? 0)), target: 95, icon: ShieldCheck },
  ];
  return (
    <>
      <section className="flex items-center gap-5 border border-line bg-paper p-6 max-sm:flex-wrap">
        <span className="grid size-16 place-items-center rounded-full bg-sand text-xl font-bold text-navy">RH</span>
        <div className="flex-1"><h2 className="m-0 text-[24px]">{host.name}</h2><p className="m-0 mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted"><Clock3 className="size-3.5" /> {host.responseTime} · {t("host.q.properties", { count: hotels?.length ?? 0 })}</p></div>
        {host.badge && <Badge tone="navy"><Award className="size-3.5" /> {host.badge === "TOP_HOST" ? "Top Host" : "Highly Rated Host"}</Badge>}
        <Badge tone="success"><BadgeCheck className="size-3.5" /> {t(`host.verification.${hotels![0].verification}`)}</Badge>
      </section>
      <MetricGrid>
        <Metric label={t("host.q.responseRate")} value={`${host.responseRate}%`} />
        <Metric label={t("host.m.rating")} value={s?.averageRating ?? "—"} />
        <Metric label={t("host.m.cancellation")} value={`${s?.cancellationRate ?? "—"}%`} />
        <Metric label={t("host.m.saves")} value={s?.wishlistSaves ?? "—"} />
      </MetricGrid>
      <Panel title={t("host.q.badgeTitle")} sub={t("host.q.badgeSub")}>
        <ul className="flex flex-col gap-4">{criteria.map(({ label, value, target, icon: I }) => (
          <li key={label} className="grid grid-cols-[auto_180px_1fr_90px] items-center gap-3 text-[12px] text-navy max-sm:grid-cols-[auto_1fr_70px]">
            <I className="size-4 text-gold" /><span>{label}</span><Bar value={value} tone={value >= target ? "gold" : "danger"} label={label} className="max-sm:hidden" /><b className="text-end">{value}% / {target}%</b>
          </li>
        ))}</ul>
        <p className="mt-4 mb-0 text-[11px] text-ink-muted">{t("host.q.note")}</p>
      </Panel>
    </>
  );
}
