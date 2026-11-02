/* Pricing rules (§46): weekend, long-stay, monthly, early-booking adjustments with a worked example. */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { PricingRules } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/controls";
import { Select } from "@/components/ui/select";
import { ErrorState } from "@/components/common";
import { Panel, Toolbar } from "@/components/dashboard";
import { useHostHotels, useHostMutation, usePricingRules } from "@/hooks/queries";
import { hostService } from "@/services/ops.service";
import { useMoney } from "@/hooks/use-format";

const RULES: { k: keyof PricingRules; max: number; sign: 1 | -1 }[] = [{ k: "weekendPct", max: 50, sign: 1 }, { k: "longStayPct", max: 40, sign: -1 }, { k: "monthlyPct", max: 50, sign: -1 }, { k: "earlyBookingPct", max: 30, sign: -1 }];

export default function HostPricing() {
  const { t } = useTranslation();
  const money = useMoney();
  const { data: hotels } = useHostHotels();
  const [hid, setHid] = useState<string>();
  const hotel = hotels?.find((h) => h.id === hid) ?? hotels?.[0];
  const { data, error, refetch } = usePricingRules(hotel?.id ?? "");
  const [r, setR] = useState<PricingRules>();
  useEffect(() => { if (data) setR(data); }, [data]);
  const save = useHostMutation((rules: PricingRules) => hostService.savePricing(hotel!.id, rules));
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!hotel || !r) return <div className="skeleton h-96" />;
  const base = hotel.fromPrice;
  const examples = [
    { label: t("host.pricing.exWeekday"), v: base },
    { label: t("host.pricing.exWeekend"), v: Math.round(base * (1 + r.weekendPct / 100)) },
    { label: t("host.pricing.exWeek"), v: Math.round(base * (1 - r.longStayPct / 100)) },
    { label: t("host.pricing.exMonth"), v: Math.round(base * (1 - r.monthlyPct / 100)) },
  ];
  return (
    <>
      <Toolbar title={t("host.nav.pricing")} sub={t("host.pricing.sub")}>{hotels && hotels.length > 1 && <Select ariaLabel={t("host.col.property")} value={hotel.id} onValueChange={setHid} options={hotels.map((h) => ({ value: h.id, label: h.name }))} className="min-h-10 w-64" />}</Toolbar>
      <div className="grid grid-cols-[1fr_340px] gap-4 max-lg:grid-cols-1">
        <Panel title={t("host.pricing.rules")}>
          <div className="flex flex-col gap-6">
            {RULES.map(({ k, max, sign }) => (
              <div key={k}>
                <div className="mb-2 flex justify-between text-[13px] text-navy"><label htmlFor={`pr-${k}`}>{t(`host.pricing.${k.replace("Pct", "")}`)}</label><b>{sign > 0 ? "+" : "−"}{r[k]}%</b></div>
                <Slider id={`pr-${k}`} min={0} max={max} step={1} value={[r[k]]} onValueChange={([v]) => setR({ ...r, [k]: v })} thumbLabels={[t(`host.pricing.${k.replace("Pct", "")}`)]} />
                <small className="text-[11px] text-ink-muted">{t(`host.pricing.${k.replace("Pct", "")}Help`)}</small>
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-2 border-t border-line pt-5"><Button variant="gold" disabled={save.isPending || JSON.stringify(r) === JSON.stringify(data)} onClick={() => save.mutate(r, { onSuccess: () => toast.success(t("host.saved")) })}>{t("common.saveChanges")}</Button><Button variant="outline" onClick={() => data && setR(data)}>{t("common.reset")}</Button></div>
        </Panel>
        <Panel title={t("host.pricing.example")} sub={t("host.pricing.exampleSub", { price: money(base, hotel.currency) })}>
          <dl className="m-0">{examples.map((e) => <div key={e.label} className="flex justify-between border-b border-line py-2.5 text-[13px] last:border-0"><dt className="text-ink-muted">{e.label}</dt><dd className="m-0 font-bold text-navy">{money(e.v, hotel.currency)}</dd></div>)}</dl>
        </Panel>
      </div>
    </>
  );
}
