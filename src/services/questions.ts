import type { MatchProfile } from "@/lib/match-engine";

/** Questionnaire definition — data, editable from Admin → Match Engine (§6, §49). */
export type QuestionOption = { value: string; label: string };
export type Question = {
  id: string;
  field: keyof Pick<MatchProfile, "destination" | "purpose" | "priorities" | "budget" | "room" | "atmosphere" | "facilities">;
  title: string;
  helper: string;
  type: "SINGLE" | "MULTI";
  maxPicks?: number;
  category: string;
  weight: number;
  options: QuestionOption[];
};

const o = (value: string, label = value): QuestionOption => ({ value, label });

export const DEFAULT_QUESTIONS: Question[] = [
  { id: "q-destination", field: "destination", title: "Where would you like to stay?", helper: "Pick a destination, or choose Other to keep it open.", type: "SINGLE", category: "Destination", weight: 20, options: [o("Amsterdam"), o("Paris"), o("London"), o("Milan"), o("Barcelona"), o("OTHER", "Other")] },
  { id: "q-purpose", field: "purpose", title: "Why are you travelling?", helper: "This helps us understand the atmosphere you’ll enjoy.", type: "SINGLE", category: "Trip purpose", weight: 10, options: [o("HONEYMOON", "Honeymoon"), o("COUPLE", "Couple"), o("FAMILY", "Family"), o("BUSINESS", "Business"), o("SOLO", "Solo"), o("GROUP", "Group")] },
  { id: "q-priorities", field: "priorities", title: "What matters most?", helper: "Choose up to three — they carry extra weight in your score.", type: "MULTI", maxPicks: 3, category: "Priorities", weight: 25, options: [o("PRICE", "Price"), o("LOCATION", "Location"), o("CLEANLINESS", "Cleanliness"), o("ROOM_QUALITY", "Room quality"), o("FACILITIES", "Facilities"), o("VALUE", "Value for money"), o("OVERALL_RATING", "Overall rating"), o("GUEST_EXPERIENCE", "Guest experience")] },
  { id: "q-budget", field: "budget", title: "What budget feels comfortable?", helper: "We keep price and comfort in balance.", type: "SINGLE", category: "Budget", weight: 15, options: [o("BUDGET", "Budget"), o("MODERATE", "Moderate"), o("PREMIUM", "Premium"), o("LUXURY", "Luxury")] },
  { id: "q-room", field: "room", title: "Which room suits you?", helper: "We’ll favour hotels that actually offer it.", type: "SINGLE", category: "Room", weight: 10, options: [o("SINGLE", "Single"), o("DOUBLE", "Double"), o("TRIPLE", "Triple"), o("SUITE", "Suite"), o("FAMILY", "Family room"), o("APARTMENT", "Apartment-style")] },
];
