import { useMemo } from "react";
import { track } from "@/lib/analytics";
import { useSearchParams } from "react-router-dom";
import type { HotelSearchParams, SortKey } from "@/types/api";
import type { PropertyType, RoomType } from "@/types/models";

/** Filter state lives in the URL so results are shareable and back/forward works. */
export type ResultFilters = {
  minPrice?: number; maxPrice?: number; minRating?: number; propertyTypes: PropertyType[]; roomType?: RoomType; minCapacity?: number; minBathrooms?: number;
  amenities: string[]; accessibility: string[]; instantBook: boolean; freeCancellation: boolean; flexibleCancellation: boolean; payLater: boolean;
  guestFavorite: boolean; highlyRated: boolean; highMatch: boolean; recommended: boolean; matchesPrefs: boolean; minMatch?: number; category?: string;
};

const LIST_KEYS = ["propertyTypes", "amenities", "accessibility"] as const;
const BOOL_KEYS = ["instantBook", "freeCancellation", "flexibleCancellation", "payLater", "guestFavorite", "highlyRated", "highMatch", "recommended", "matchesPrefs"] as const;
const NUM_KEYS = ["minPrice", "maxPrice", "minRating", "minCapacity", "minBathrooms", "minMatch"] as const;

export const EMPTY_FILTERS: ResultFilters = { propertyTypes: [], amenities: [], accessibility: [], instantBook: false, freeCancellation: false, flexibleCancellation: false, payLater: false, guestFavorite: false, highlyRated: false, highMatch: false, recommended: false, matchesPrefs: false };

export function useResultFilters() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo<ResultFilters>(() => {
    const f: ResultFilters = { ...EMPTY_FILTERS };
    LIST_KEYS.forEach((k) => { const v = params.get(k); (f as Record<string, unknown>)[k] = v ? v.split(",") : []; });
    BOOL_KEYS.forEach((k) => { (f as Record<string, unknown>)[k] = params.get(k) === "true"; });
    NUM_KEYS.forEach((k) => { const v = params.get(k); if (v) (f as Record<string, unknown>)[k] = Number(v); });
    if (params.get("roomType")) f.roomType = params.get("roomType") as RoomType;
    if (params.get("category")) f.category = params.get("category")!;
    return f;
  }, [params]);

  const sort = (params.get("sort") as SortKey) || "RECOMMENDED";
  const page = Number(params.get("page") ?? 1);
  const view = (params.get("view") as "split" | "list" | "map") || "split";
  const monthly = params.get("mode") === "monthly";

  const write = (patch: Record<string, string | number | boolean | string[] | undefined>, resetPage = true) => {
    setParams((p) => {
      const n = new URLSearchParams(p);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === false || v === "" || (Array.isArray(v) && v.length === 0)) n.delete(k);
        else n.set(k, Array.isArray(v) ? v.join(",") : String(v));
      });
      if (resetPage && !("page" in patch)) n.delete("page");
      return n;
    }, { replace: true });
  };
  const setFilters = (f: ResultFilters) => { track("filters_applied"); write({ ...Object.fromEntries([...LIST_KEYS, ...BOOL_KEYS, ...NUM_KEYS, "roomType", "category"].map((k) => [k, undefined])), ...(f as unknown as Record<string, string | number | boolean | string[] | undefined>) }); };

  const activeCount = LIST_KEYS.reduce((n, k) => n + filters[k].length, 0) + BOOL_KEYS.filter((k) => filters[k]).length + NUM_KEYS.filter((k) => filters[k] !== undefined).length + (filters.roomType ? 1 : 0) + (filters.category ? 1 : 0);

  return { filters, setFilters, sort, page, view, monthly, destination: params.get("destination"), write, activeCount };
}

/** Map UI filters onto the API search contract. */
export function toSearchParams(f: ResultFilters, extra: Partial<HotelSearchParams>): HotelSearchParams {
  const minMatch = Math.max(f.minMatch ?? 0, f.highMatch ? 85 : 0, f.recommended ? 82 : 0, f.matchesPrefs ? 80 : 0) || undefined;
  return {
    ...extra, minPrice: f.minPrice, maxPrice: f.maxPrice, minRating: f.minRating, propertyTypes: f.propertyTypes, roomType: f.roomType, minCapacity: f.minCapacity, minBathrooms: f.minBathrooms,
    amenities: f.amenities, accessibility: f.accessibility, instantBook: f.instantBook || undefined, freeCancellation: f.freeCancellation || undefined, flexibleCancellation: f.flexibleCancellation || undefined,
    payLater: f.payLater || undefined, guestFavorite: f.guestFavorite || undefined, highlyRated: f.highlyRated || undefined, minMatch, category: f.category,
  };
}
