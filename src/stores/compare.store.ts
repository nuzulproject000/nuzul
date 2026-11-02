import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MAX_COMPARE = 4;

type CompareState = { ids: string[]; toggle: (id: string) => boolean; set: (ids: string[]) => void; clear: () => void };

/** Hotels selected for comparison (§20). `toggle` returns false when the limit is reached. */
export const useCompare = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const ids = get().ids;
        if (ids.includes(id)) { set({ ids: ids.filter((x) => x !== id) }); return true; }
        if (ids.length >= MAX_COMPARE) return false;
        set({ ids: [...ids, id] });
        return true;
      },
      set: (ids) => set({ ids: ids.slice(0, MAX_COMPARE) }),
      clear: () => set({ ids: [] }),
    }),
    { name: "nuzul.compare" },
  ),
);
