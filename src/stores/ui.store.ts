import { create } from "zustand";
import { track } from "@/lib/analytics";

/** Ephemeral UI state shared across the tree (not persisted). */
type UiState = { whyMatchHotelId: string | null; openWhy: (id: string | null) => void };
export const useUi = create<UiState>((set) => ({ whyMatchHotelId: null, openWhy: (whyMatchHotelId) => { if (whyMatchHotelId) track("match_why_click", { hotelId: whyMatchHotelId }); set({ whyMatchHotelId }); } }));
