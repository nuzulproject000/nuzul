import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Guests } from "@/types/models";
import { defaultStay } from "@/lib/dates";

export type DateMode = "DATES" | "FLEXIBLE" | "MONTHLY";
export type Flexibility = 0 | 1 | 3 | 7 | 14;
export type FlexPeriod = "WEEKEND" | "WEEK" | "MONTH";

export type SearchState = {
  destination: string;
  checkIn: string;
  checkOut: string;
  mode: DateMode;
  flexibility: Flexibility;
  flexPeriod: FlexPeriod;
  flexMonths: string[]; // yyyy-MM
  months: number;
  guests: Guests;
  recent: string[];
  set: (patch: Partial<Omit<SearchState, "set" | "commit">>) => void;
  commit: () => void; // records a recent search (recommendation signal §38)
};

const stay = defaultStay();

export const useSearch = create<SearchState>()(
  persist(
    (set, get) => ({
      destination: "Sharm El Sheikh",
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      mode: "DATES",
      flexibility: 0,
      flexPeriod: "WEEK",
      flexMonths: [],
      months: 1,
      guests: { adults: 2, children: 0, infants: 0, pets: 0, rooms: 1 },
      recent: [],
      set: (patch) => set(patch),
      commit: () => { const d = get().destination; if (d) set({ recent: [d, ...get().recent.filter((x) => x !== d)].slice(0, 5) }); },
    }),
    { name: "nuzul.search", partialize: ({ set: _s, commit: _c, ...rest }) => rest },
  ),
);

export const totalGuests = (g: Guests) => g.adults + g.children;
