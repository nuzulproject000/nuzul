/* ------------------------------------------------------------------------
 * Nuzul Match Engine (spec §8–10, §19, §28, §49, §65–66, §79).
 * Pure functions, no UI or network imports → independently testable.
 * Weights, thresholds and explanation rules are injected as config so the
 * Admin Match Engine can change them at runtime (nothing is hardcoded).
 * In production this runs server-side; the client version powers the
 * prototype and the admin "live preview".
 * ---------------------------------------------------------------------- */
import type { Hotel, RoomType } from "@/types/models";
import { toEGP } from "./currency";

export type FactorKey = "location" | "price" | "cleanliness" | "comfort" | "facilities" | "atmosphere" | "room" | "rating";
export const FACTOR_KEYS: FactorKey[] = ["location", "price", "cleanliness", "comfort", "facilities", "atmosphere", "room", "rating"];

/** §9 example weighting — defaults only. */
export const DEFAULT_WEIGHTS: Record<FactorKey, number> = { location: 20, price: 15, cleanliness: 15, comfort: 15, facilities: 10, atmosphere: 10, room: 10, rating: 5 };

export type Threshold = { label: string; min: number };
export type MatchConfig = {
  weights: Record<FactorKey, number>;
  priorityBoost: number;
  minScore: number;
  maxScore: number;
  thresholds: Threshold[]; // high → low
  strongFactor: number;
  weakFactor: number;
  noisePenaltyPerPct: number;
  noiseMentionAlertPct: number;
};

export const DEFAULT_CONFIG: MatchConfig = {
  weights: DEFAULT_WEIGHTS,
  priorityBoost: 1.5,
  minScore: 40,
  maxScore: 99,
  thresholds: [{ label: "Exceptional match", min: 90 }, { label: "Strong match", min: 80 }, { label: "Good match", min: 70 }, { label: "Partial match", min: 0 }],
  strongFactor: 88,
  weakFactor: 76,
  noisePenaltyPerPct: 1.2,
  noiseMentionAlertPct: 15,
};

export type Budget = "BUDGET" | "MODERATE" | "PREMIUM" | "LUXURY";
export type TripPurpose = "HONEYMOON" | "COUPLE" | "FAMILY" | "BUSINESS" | "SOLO" | "GROUP";
export type Priority = "PRICE" | "LOCATION" | "CLEANLINESS" | "ROOM_QUALITY" | "FACILITIES" | "VALUE" | "OVERALL_RATING" | "GUEST_EXPERIENCE";

/** §7 Guest Match Profile */
export type MatchProfile = {
  destination: string; // city / country / "OTHER"
  purpose: TripPurpose;
  priorities: Priority[];
  budget: Budget;
  room: RoomType;
  atmosphere: string[];
  facilities: string[];
  saved: boolean;
};

export const DEFAULT_PROFILE: MatchProfile = {
  destination: "Sharm El Sheikh",
  purpose: "HONEYMOON",
  priorities: ["CLEANLINESS", "LOCATION", "ROOM_QUALITY"],
  budget: "PREMIUM",
  room: "DOUBLE",
  atmosphere: ["Quiet", "Romantic", "Luxury"],
  facilities: ["Pool", "Spa", "Room service"],
  saved: true,
};

/** Comfortable nightly band per budget, in EGP (illustrative; admin-configurable in production). */
export const BUDGET_BANDS: Record<Budget, [number, number]> = { BUDGET: [1500, 4000], MODERATE: [4000, 8000], PREMIUM: [8000, 14000], LUXURY: [14000, 60000] };

const PRIORITY_FACTOR: Record<Priority, FactorKey> = {
  PRICE: "price", VALUE: "price", LOCATION: "location", CLEANLINESS: "cleanliness", ROOM_QUALITY: "comfort",
  FACILITIES: "facilities", OVERALL_RATING: "rating", GUEST_EXPERIENCE: "rating",
};

/** Explanations are structured (code + params) so the UI can localise them. */
export type Reason = { code: string; params?: Record<string, string | number> };
export type FactorResult = { key: FactorKey; score: number; weight: number; note: Reason };
export type MatchResult = { score: number; label: string; factors: FactorResult[]; positives: Reason[]; negatives: Reason[] };

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function computeMatch(h: Hotel, p: MatchProfile, cfg: MatchConfig = DEFAULT_CONFIG): MatchResult {
  const wantsQuiet = p.atmosphere.includes("Quiet");
  const egp = toEGP(h.fromPrice, h.currency);
  const [lo, hi] = BUDGET_BANDS[p.budget];

  const destMatch = !p.destination || p.destination === "OTHER" || h.city === p.destination || h.country === p.destination;
  const location = clamp(h.locationScore * 0.85 + (destMatch ? 15 : -20));

  let price: number;
  let priceNote: Reason;
  let overBudgetPct = 0;
  if (egp >= lo && egp <= hi) { price = 96 - (Math.abs(egp - (lo + hi) / 2) / ((hi - lo) / 2)) * 6; priceNote = { code: "price.within" }; }
  else if (egp > hi) { overBudgetPct = Math.round(((egp - hi) / hi) * 100); price = clamp(90 - overBudgetPct * 1.2); priceNote = { code: "price.over", params: { pct: overBudgetPct } }; }
  else { price = 84; priceNote = { code: "price.under" }; }

  const cleanliness = clamp(h.reviewCategories.cleanliness * 20 - 2);
  const comfort = clamp(h.reviewCategories.comfort * 20 - 3);

  const wanted = p.facilities.length ? p.facilities : ["Wi-Fi"];
  const has = wanted.filter((f) => h.amenities.includes(f));
  const missing = wanted.filter((f) => !has.includes(f));
  const facilities = clamp(60 + (has.length / wanted.length) * 38 + (h.amenities.length > 9 ? 2 : 0));

  const wantedAtm = p.atmosphere.length ? p.atmosphere : ["Relaxation"];
  const hasAtm = wantedAtm.filter((a) => h.atmosphere.includes(a));
  // §28: Review Insights feed the engine — noise mentions lower Atmosphere for quiet-seekers.
  const atmosphere = clamp(58 + (hasAtm.length / wantedAtm.length) * 40 - (wantsQuiet ? h.noiseMentionPct * cfg.noisePenaltyPerPct : 0));

  const roomTypes = h.rooms.map((r) => r.type);
  const room = roomTypes.includes(p.room) ? 97 : p.room === "SINGLE" && roomTypes.includes("DOUBLE") ? 86 : 64;
  const rating = clamp((h.rating / 5) * 100);

  const raw: Record<FactorKey, [number, Reason]> = {
    location: [location, destMatch ? { code: "location.near", params: { area: h.area, km: h.distanceKm } } : { code: "location.elsewhere", params: { city: h.city, dest: p.destination } }],
    price: [price, priceNote],
    cleanliness: [cleanliness, { code: "cat.rated", params: { value: h.reviewCategories.cleanliness } }],
    comfort: [comfort, { code: "cat.rated", params: { value: h.reviewCategories.comfort } }],
    facilities: [facilities, missing.length ? { code: "facilities.missing", params: { list: missing.join(", ") } } : { code: "facilities.all", params: { list: wanted.join(", ") } }],
    atmosphere: [atmosphere, wantsQuiet && h.noiseMentionPct >= cfg.noiseMentionAlertPct ? { code: "atmosphere.noise", params: { pct: h.noiseMentionPct } } : hasAtm.length ? { code: "atmosphere.has", params: { list: hasAtm.join(", ") } } : { code: "atmosphere.different" }],
    room: [room, roomTypes.includes(p.room) ? { code: "room.available", params: { room: p.room } } : { code: "room.missing", params: { room: p.room } }],
    rating: [rating, { code: "rating.value", params: { rating: h.rating, count: h.reviewCount } }],
  };

  const boosted = new Set(p.priorities.map((x) => PRIORITY_FACTOR[x]));
  const factors: FactorResult[] = FACTOR_KEYS.map((key) => ({ key, score: Math.round(raw[key][0]), note: raw[key][1], weight: (cfg.weights[key] ?? 0) * (boosted.has(key) ? cfg.priorityBoost : 1) }));
  const totalW = factors.reduce((s, f) => s + f.weight, 0) || 1;
  const score = Math.round(clamp(factors.reduce((s, f) => s + f.score * f.weight, 0) / totalW, cfg.minScore, cfg.maxScore));
  const label = cfg.thresholds.find((t) => score >= t.min)?.label ?? "Match";

  const positives: Reason[] = [];
  const negatives: Reason[] = [];
  if (hasAtm.length) positives.push({ code: "pos.atmosphere", params: { list: hasAtm.join(" & ") } });
  if (wantsQuiet && h.noiseMentionPct < 10) positives.push({ code: "pos.quiet" });
  has.forEach((f) => positives.push({ code: "pos.facility", params: { name: f } }));
  if (price >= 85 && egp <= hi) positives.push({ code: "pos.budget" });
  if (roomTypes.includes(p.room)) positives.push({ code: "pos.room", params: { room: p.room } });
  factors.filter((f) => f.score >= cfg.strongFactor && ["location", "cleanliness", "comfort", "rating"].includes(f.key)).forEach((f) => positives.push({ code: "pos.strong", params: { factor: f.key, score: f.score } }));

  if (overBudgetPct > 0) negatives.push({ code: "neg.overBudget", params: { pct: overBudgetPct } });
  if (wantsQuiet && h.noiseMentionPct >= cfg.noiseMentionAlertPct) negatives.push({ code: "neg.noise", params: { pct: h.noiseMentionPct } });
  missing.forEach((f) => negatives.push({ code: "neg.facility", params: { name: f } }));
  if (!roomTypes.includes(p.room)) negatives.push({ code: "neg.room", params: { room: p.room } });
  if (!destMatch) negatives.push({ code: "neg.location", params: { city: h.city, dest: p.destination } });
  factors.filter((f) => f.score < cfg.weakFactor && ["cleanliness", "comfort", "rating"].includes(f.key)).forEach((f) => negatives.push({ code: "neg.weak", params: { factor: f.key, score: f.score } }));

  return { score, label, factors, positives: positives.slice(0, 8), negatives };
}

export function scoreDistribution(scores: number[]) {
  const buckets = [{ label: "95%+", min: 95, count: 0 }, { label: "90–94%", min: 90, count: 0 }, { label: "80–89%", min: 80, count: 0 }, { label: "70–79%", min: 70, count: 0 }, { label: "<70%", min: 0, count: 0 }];
  scores.forEach((s) => { const b = buckets.find((x) => s >= x.min); if (b) b.count++; });
  return buckets;
}

export const weightsTotal = (w: Record<FactorKey, number>) => FACTOR_KEYS.reduce((s, k) => s + (w[k] ?? 0), 0);
