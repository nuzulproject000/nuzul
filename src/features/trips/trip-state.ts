import type { BookingState } from "@/types/models";

export const TRIP_TABS = ["UPCOMING", "ACTIVE", "COMPLETED", "CANCELLED"] as const;
export type TripTab = (typeof TRIP_TABS)[number];
/** Which Trips tab a booking state belongs to (§32). */
export const tabOf = (s: BookingState): TripTab => (s === "PENDING" || s === "CONFIRMED" ? "UPCOMING" : s === "CHECKED_IN" ? "ACTIVE" : s === "COMPLETED" ? "COMPLETED" : "CANCELLED");
