import type { Hotel } from "@/types/models";

export const STATUS_TONE: Record<Hotel["status"], "success" | "warn" | "danger" | "neutral"> = { LIVE: "success", PENDING: "warn", IN_REVIEW: "warn", DRAFT: "neutral", SUSPENDED: "danger", REJECTED: "danger" };

/** Listing completeness used to nudge hosts (§41). */
export function completion(h: Hotel) {
  const checks = [h.name, h.description.length >= 80, h.images.length >= 5, h.amenities.length >= 5, h.accessibility.length >= 1, h.nearby.length >= 3, h.rooms.length >= 1, h.categories.length >= 1, h.verification !== "BASIC"];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

