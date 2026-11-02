import { describe, expect, it } from "vitest";
import { computePrice, refundPct } from "@/lib/pricing";
import { convert, toEGP } from "@/lib/currency";
import { nightsBetween } from "@/lib/dates";

describe("price breakdown (§30)", () => {
  it("adds fees and taxes transparently", () => {
    const p = computePrice(10000, 3);
    expect(p.room).toBe(30000);
    expect(p.total).toBe(p.room + p.cleaning + p.service + p.taxes - p.discount);
    expect(p.discount).toBe(0);
  });
  it("applies the long-stay discount from 7 nights", () => {
    expect(computePrice(10000, 6, { longStayPct: 10 }).discount).toBe(0);
    expect(computePrice(10000, 7, { longStayPct: 10 }).discount).toBe(7000);
  });
  it("multiplies by rooms", () => expect(computePrice(1000, 2, { rooms: 3 }).room).toBe(6000));
});

describe("refund rules (§31)", () => {
  it.each([
    ["NON_REFUNDABLE", 30, 0], ["FLEXIBLE", 2, 100], ["FLEXIBLE", 0, 70], ["FLEXIBLE", -1, 0],
    ["MODERATE", 5, 100], ["MODERATE", 4, 50], ["STRICT", 14, 50], ["STRICT", 13, 0],
  ] as const)("%s %i days before → %i%%", (policy, days, pct) => expect(refundPct(policy, days)).toBe(pct));
});

describe("currency & dates", () => {
  it("converts via EGP", () => { expect(toEGP(100, "USD")).toBeGreaterThan(100); expect(convert(100, "EGP", "EGP")).toBe(100); });
  it("counts nights", () => { expect(nightsBetween("2026-12-01", "2026-12-04")).toBe(3); expect(nightsBetween("2026-12-04", "2026-12-01")).toBe(0); });
});
