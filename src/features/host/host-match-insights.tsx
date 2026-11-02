/* Host Match insights (§50): which guest types the property suits, score distribution, and what holds it back. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Lightbulb } from "lucide-react";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/common";
import { MatchPill, useReasonText } from "@/components/match";
import { BarSeries, Panel, SampleBanner, Toolbar } from "@/components/dashboard";
import { useHostHotels, useHostMatchInsights } from "@/hooks/queries";

export default function HostMatchInsights() {
  const { t } = useTranslation();
  const reason = useReasonText();
  const { data: hotels } = useHostHotels();
  const [hid, setHid] = useState<string>();
  const { data, error, refetch } = useHostMatchInsights(hid);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const issues = [...new Map((data?.segments ?? []).filter((s) => s.topIssue).map((s) => [s.topIssue!.code, s])).values()];
  return (
    <>
      <SampleBanner text={t("host.mi.note")} />
      <Toolbar title={t("host.nav.insights")} sub={t("host.mi.sub")}>
        {hotels && <Select ariaLabel={t("host.col.property")} value={hid ?? data?.hotelId ?? hotels[0]?.id} onValueChange={setHid} options={hotels.map((h) => ({ value: h.id, label: h.name }))} className="min-h-10 w-64" />}
        {data && <MatchPill score={data.average} />}
      </Toolbar>
      {!data ? <div className="skeleton h-96" /> : (
        <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
          <Panel title={t("host.mi.segments")} sub={t("host.mi.segmentsSub")}>
            <ul className="flex flex-col">
              {data.segments.map((s) => (
                <li key={s.label} className="grid grid-cols-[120px_1fr_auto] items-center gap-3 border-b border-line py-3 text-[12px] last:border-0 max-sm:grid-cols-[1fr_auto]">
                  <b className="text-navy">{t(`host.segment.${s.label}`, { defaultValue: s.label })}</b>
                  <small className="text-ink-muted first-letter:uppercase max-sm:hidden">{s.topIssue ? reason(s.topIssue) : t("match.nothingConflicts")}</small>
                  <MatchPill score={s.score} />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title={t("host.mi.distribution")} sub={t("host.mi.distributionSub")}><BarSeries label={t("host.mi.distribution")} data={data.distribution} x="label" y="count" /></Panel>
          <Panel title={t("host.mi.improve")} className="col-span-2 max-lg:col-span-1">
            {issues.length ? <ul className="flex flex-col gap-2.5">{issues.map((s) => <li key={s.topIssue!.code} className="flex items-start gap-2.5 text-[13px] text-charcoal"><Lightbulb className="mt-0.5 size-4 shrink-0 text-gold" /><span><b className="text-navy first-letter:uppercase">{reason(s.topIssue!)}</b> — {t("host.mi.affects", { segment: t(`host.segment.${s.label}`, { defaultValue: s.label }) })}</span></li>)}</ul> : <p className="m-0 text-[13px] text-ink-muted">{t("match.nothingConflicts")}</p>}
            <p className="mt-4 mb-0 text-[11px] text-ink-muted">{t("host.mi.fair")}</p>
          </Panel>
        </div>
      )}
    </>
  );
}
