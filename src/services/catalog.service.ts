import type { Category } from "@/types/models";
import type { FlexibleDateOption, HotelSearchParams, HotelWithMatch, Paginated, ReviewSort, SearchResponse, Suggestion } from "@/types/api";
import type { Review } from "@/types/models";
import { api, unwrap } from "./api-client";

export type CollectionKind = "recommended" | "high-match" | "guest-favorites" | "popular" | "nearby" | "long-stays";

export const catalogService = {
  categories: () => unwrap<Category[]>(api.get("/catalog/categories")),
  destinations: () => unwrap<{ city: string; detail: string; image: string }[]>(api.get("/catalog/destinations")),
  suggestions: (q: string) => unwrap<Suggestion[]>(api.get("/catalog/suggestions", { params: { q } })),
};

export const hotelsService = {
  search: (params: HotelSearchParams) => unwrap<SearchResponse>(api.get("/hotels/search", { params })),
  collection: (kind: CollectionKind) => unwrap<HotelWithMatch[]>(api.get(`/hotels/collections/${kind}`)),
  get: (id: string) => unwrap<HotelWithMatch>(api.get(`/hotels/${id}`)),
  bySlug: (slug: string) => unwrap<HotelWithMatch>(api.get("/hotels/by-slug", { params: { slug } })),
  compare: (ids: string[]) => unwrap<HotelWithMatch[]>(api.post("/hotels/compare", { ids })),
  flexibleDates: (id: string, checkIn: string, nights: number) => unwrap<FlexibleDateOption[]>(api.get(`/hotels/${id}/flexible-dates`, { params: { checkIn, nights } })),
  reviews: (id: string, sort: ReviewSort, page = 1) => unwrap<Paginated<Review>>(api.get(`/hotels/${id}/reviews`, { params: { sort, page } })),
};
