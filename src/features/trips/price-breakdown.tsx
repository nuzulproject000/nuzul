import { useTranslation } from "react-i18next";
import type { Booking } from "@/types/models";
import { useMoney } from "@/hooks/use-format";

/** Stored price breakdown of an existing booking (amounts are what was charged, not re-computed). */
export function PriceBreakdownTable({ booking: b }: { booking: Booking }) {
  const { t } = useTranslation();
  const money = useMoney();
  const rows: [string, number][] = [[t("booking.steps.room"), b.price.room], [t("booking.cleaning"), b.price.cleaning], [t("booking.service"), b.price.service], [t("booking.taxes"), b.price.taxes]];
  return (
    <dl className="m-0 text-[13px]">
      {rows.map(([k, v]) => <div key={k} className="flex justify-between py-1.5"><dt>{k}</dt><dd className="m-0">{money(v, b.currency)}</dd></div>)}
      {b.price.discount > 0 && <div className="flex justify-between py-1.5 text-success"><dt>{t("booking.discount")}</dt><dd className="m-0">−{money(b.price.discount, b.currency)}</dd></div>}
      <div className="mt-2 flex justify-between border-t border-line pt-3 font-bold text-navy"><dt>{t("booking.total")}</dt><dd className="m-0">{money(b.price.total, b.currency, { original: true })}</dd></div>
      {b.refundAmount ? <div className="flex justify-between py-1.5 text-success"><dt>{t("trips.refund")}</dt><dd className="m-0">{money(b.refundAmount, b.currency)}</dd></div> : null}
    </dl>
  );
}
