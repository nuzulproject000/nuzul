import { create } from "zustand";
import { track } from "@/lib/analytics";

export type AuthReason = "save" | "book" | "review" | "message" | "account";
type AuthPrompt = { reason: AuthReason; next: string } | null;

type UiState = {
  whyMatchHotelId: string | null;
  openWhy: (id: string | null) => void;
  /** Sign-in prompt shown when a visitor (or a non-guest account) tries a guest-only action. */
  authPrompt: AuthPrompt;
  openAuthPrompt: (p: AuthPrompt) => void;
};
export const useUi = create<UiState>((set) => ({
  whyMatchHotelId: null,
  openWhy: (whyMatchHotelId) => { if (whyMatchHotelId) track("match_why_click", { hotelId: whyMatchHotelId }); set({ whyMatchHotelId }); },
  authPrompt: null,
  openAuthPrompt: (authPrompt) => set({ authPrompt }),
}));
