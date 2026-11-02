import { describe, expect, it } from "vitest";
import { computeMatch, DEFAULT_CONFIG, DEFAULT_PROFILE, FACTOR_KEYS, scoreDistribution, weightsTotal } from "@/lib/match-engine";
import { hotelsSeed } from "@/mocks/hotels";

const byId = (id: string) => hotelsSeed.find((h) => h.id === id)!;

describe("Match Engine (§8–12)", () => {
  it("default weights total 100", () => expect(weightsTotal(DEFAULT_CONFIG.weights)).toBe(100));

  it("returns a bounded score, a label and every factor", () => {
    for (const h of hotelsSeed) {
      const m = computeMatch(h, DEFAULT_PROFILE);
      expect(m.score).toBeGreaterThanOrEqual(DEFAULT_CONFIG.minScore);
      expect(m.score).toBeLessThanOrEqual(DEFAULT_CONFIG.maxScore);
      expect(m.factors.map((f) => f.key)).toEqual(FACTOR_KEYS);
      expect(m.label).toBeTruthy();
    }
  });

  it("is separate from guest rating: a lower-rated hotel can match better", () => {
    const quietSeaside = computeMatch(byId("h-rixos-seagate"), DEFAULT_PROFILE).score;
    const noisyCity = computeMatch(byId("h-cecil"), DEFAULT_PROFILE).score;
    expect(quietSeaside).toBeGreaterThan(noisyCity);
  });

  it("penalises noise only for guests who want quiet (Review Insights §12)", () => {
    const cecil = byId("h-cecil");
    const quiet = computeMatch(cecil, { ...DEFAULT_PROFILE, atmosphere: ["Quiet"] });
    const lively = computeMatch(cecil, { ...DEFAULT_PROFILE, atmosphere: ["Lively"] });
    const atm = (m: typeof quiet) => m.factors.find((f) => f.key === "atmosphere")!.score;
    expect(atm(quiet)).toBeLessThan(atm(lively));
    expect(quiet.negatives.some((r) => r.code === "neg.noise")).toBe(true);
  });

  it("explains budget overruns as a negative reason", () => {
    const m = computeMatch(byId("h-fs-sharm"), { ...DEFAULT_PROFILE, budget: "MODERATE" });
    expect(m.negatives.some((r) => r.code === "neg.overBudget")).toBe(true);
  });

  it("changing admin weights changes scores", () => {
    const h = byId("h-cecil");
    const a = computeMatch(h, DEFAULT_PROFILE).score;
    const b = computeMatch(h, DEFAULT_PROFILE, { ...DEFAULT_CONFIG, weights: { ...DEFAULT_CONFIG.weights, location: 5, atmosphere: 25 } }).score;
    expect(a).not.toBe(b);
  });

  it("buckets a distribution", () => {
    const d = scoreDistribution([95, 91, 85, 72, 40]);
    expect(d.reduce((n, x) => n + x.count, 0)).toBe(5);
  });
});
