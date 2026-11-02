import { create } from "zustand";

/** Ephemeral UI state shared across the tree (not persisted). */
type UiState = { whyMatchHotelId: string | null; openWhy: (id: string | null) => void };
export const useUi = create<UiState>((set) => ({ whyMatchHotelId: null, openWhy: (whyMatchHotelId) => set({ whyMatchHotelId }) }));
