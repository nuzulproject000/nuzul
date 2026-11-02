import type { CancellationPolicy, PriceBreakdown } from "@/types/models";

/** Transparent price breakdown (§30). Fee and tax rates are platform config (illustrative). */
export const FEES = { cleaningPctOfNightly: 0.04, servicePct: 0.056, taxPct: 0.1, longStayThresholdNights: 7 } as const;

export function computePrice(nightly: number, nights: number, opts: { rooms?: number; longStayPct?: number } = {}): PriceBreakdown {
  const rooms = opts.rooms ?? 1;
  const n = Math.max(nights, 0);
  const room = nightly * n * rooms;
  const cleaning = n > 0 ? Math.round(nightly * FEES.cleaningPctOfNightly) * rooms : 0;
  const service = Math.round(room * FEES.servicePct);
  const discount = n >= FEES.longStayThresholdNights ? Math.round(room * ((opts.longStayPct ?? 10) / 100)) : 0;
  const taxes = Math.round((room - discount + cleaning + service) * FEES.taxPct);
  return { room, cleaning, service, taxes, discount, total: room + cleaning + service + taxes - discount };
}

/** Refund % for a cancellation `daysBefore` check-in (negative = after check-in) — §31. */
export function refundPct(policy: CancellationPolicy, daysBefore: number): number {
  switch (policy) {
    case "NON_REFUNDABLE": return 0;
    case "FLEXIBLE": return daysBefore >= 1 ? 100 : daysBefore >= 0 ? 70 : 0;
    case "MODERATE": return daysBefore >= 5 ? 100 : daysBefore >= 0 ? 50 : 0;
    case "STRICT": return daysBefore >= 14 ? 50 : 0;
  }
}

export const POLICY_CHECKPOINTS = [14, 5, 1, -1] as const;
