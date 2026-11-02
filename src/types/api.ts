/* REST API contracts. The mock backend implements exactly these, so swapping
 * to a real server means pointing VITE_API_BASE_URL at it — UI code only
 * ever talks to the typed services in src/services. */
import type { Booking, BookingState, CancellationPolicy, Guests, Hotel, PropertyType, RoomType, User } from "./models";
import type { MatchResult } from "@/lib/match-engine";

export type Paginated<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number };

export type ApiError = { status: number; code: string; message: string; fieldErrors?: Record<string, string> };

export type SortKey = "RECOMMENDED" | "MATCH" | "PRICE_ASC" | "PRICE_DESC" | "RATING" | "DISTANCE" | "REVIEWS" | "POPULARITY";

/** GET /hotels/search */
export type HotelSearchParams = {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  pets?: boolean;
  minPrice?: number; // EGP
  maxPrice?: number; // EGP
  minRating?: number;
  propertyTypes?: PropertyType[];
  roomType?: RoomType;
  minCapacity?: number;
  minBathrooms?: number;
  amenities?: string[];
  instantBook?: boolean;
  freeCancellation?: boolean;
  flexibleCancellation?: boolean;
  payLater?: boolean;
  accessibility?: string[];
  guestFavorite?: boolean;
  highlyRated?: boolean;
  minMatch?: number;
  category?: string;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
};

/** POST /bookings */
export type CreateBookingRequest = {
  hotelId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: Guests;
  guest: { firstName: string; lastName: string; email: string; phone: string };
  specialRequests?: string;
  paymentMethod: Booking["payment"]["method"];
  /** Token from the payment provider's hosted field — never raw card data (§61). */
  paymentToken?: string;
  acceptedPolicy: CancellationPolicy;
};

export type CancelBookingResponse = { booking: Booking; refundAmount: number; refundPct: number };
export type ChangeRequest = { kind: "DATES" | "GUESTS"; checkIn?: string; checkOut?: string; guests?: Partial<Guests>; message?: string };

export type BookingListParams = { state?: BookingState[]; hotelId?: string; q?: string; page?: number; pageSize?: number };

export type ReviewSort = "RELEVANT" | "RECENT" | "HIGHEST" | "LOWEST";

/** Hotels are always returned with the requesting guest's Match Score (§8). */
export type HotelWithMatch = Hotel & { match: MatchResult };
export type SearchResponse = Paginated<HotelWithMatch> & { inDestination: number };
export type Suggestion = { label: string; kind: "CITY" | "COUNTRY" | "HOTEL" | "LANDMARK" | "NEARBY"; sub: string; value: string };
export type FlexibleDateOption = { checkIn: string; nights: number; total: number; currency: Hotel["currency"]; matchScore: number };
export type Session = { token: string; user: User };

/** GET /hotels/split-stays — one trip split across two hotels (§81). */
export type SplitStay = { legs: { hotel: HotelWithMatch; checkIn: string; checkOut: string; nights: number; total: number; currency: Hotel["currency"] }[]; averageMatch: number; totalEGP: number };
