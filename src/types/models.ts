/* Domain models — mirror the entities in Nuzul spec §64. These are the shapes
 * the REST API is expected to return; the mock backend produces the same. */

export type Currency = "EGP" | "USD" | "EUR" | "GBP" | "AED";
export type DisplayCurrency = "EGP" | "USD";
export type Locale = "en" | "ar";
export type CancellationPolicy = "NON_REFUNDABLE" | "FLEXIBLE" | "MODERATE" | "STRICT";
export type PropertyType = "HOTEL" | "RESORT" | "APARTMENT" | "VILLA" | "ENTIRE_PROPERTY";
export type RoomType = "SINGLE" | "DOUBLE" | "TRIPLE" | "SUITE" | "FAMILY" | "APARTMENT";
export type VerificationLevel = "BASIC" | "VERIFIED" | "PREMIUM_VERIFIED";
export type Role = "GUEST" | "HOST" | "ADMIN";

/** §63 booking state machine */
export type BookingState = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "REFUNDED" | "FAILED" | "EXPIRED" | "NO_SHOW";

export type Money = { amount: number; currency: Currency };

export type ReviewCategories = { cleanliness: number; location: number; staff: number; comfort: number; facilities: number; value: number };
export type ReviewCategoryKey = keyof ReviewCategories;

export type InsightTopic = { topic: string; pct: number; sentiment: "positive" | "negative" };

export type Room = {
  id: string;
  hotelId: string;
  name: string;
  type: RoomType;
  capacity: number;
  beds: string;
  bathrooms: number;
  sizeM2: number;
  nightlyPrice: number;
  available: number;
  totalUnits: number;
  cancellationPolicy: CancellationPolicy;
  minStay: number;
  maxStay: number;
  amenities: string[];
  images: string[];
};

export type NearbyPlace = { name: string; kind: "AIRPORT" | "ATTRACTION" | "RESTAURANTS" | "BEACH" | "SHOPPING" | "TRANSPORT" | "LANDMARK"; distanceKm: number; travelTime: string };

export type HostSummary = { id: string; name: string; responseRate: number; responseTime: string; badge?: "TOP_HOST" | "HIGHLY_RATED_HOST" };

export type Hotel = {
  id: string;
  slug: string; // "egypt/cairo/four-seasons-nile-plaza" (§68)
  name: string;
  city: string;
  country: string;
  area: string;
  description: string;
  category: string;
  propertyType: PropertyType;
  categories: string[];
  rating: number;
  reviewCount: number;
  currency: Currency;
  fromPrice: number;
  images: string[];
  tags: string[];
  amenities: string[];
  accessibility: string[];
  atmosphere: string[];
  guestFavorite: boolean;
  verification: VerificationLevel;
  instantBook: boolean;
  payLater: boolean;
  petsAllowed: boolean;
  cancellationPolicy: CancellationPolicy;
  available: boolean;
  monthlyDiscountPct: number;
  locationScore: number;
  distanceKm: number;
  coordinates: { lat: number; lng: number };
  reviewCategories: ReviewCategories;
  insights: InsightTopic[];
  noiseMentionPct: number;
  rooms: Room[];
  nearby: NearbyPlace[];
  host: HostSummary;
  checkIn: string;
  checkOut: string;
  status: "LIVE" | "PENDING" | "IN_REVIEW" | "SUSPENDED" | "REJECTED" | "DRAFT";
};

export type Review = {
  id: string;
  hotelId: string;
  bookingId?: string;
  author: string;
  country: string;
  tripType: string;
  createdAt: string; // ISO
  overall: number;
  categories: ReviewCategories;
  text: string;
  verifiedStay: boolean;
  relevance: number;
  hostReply?: string;
  moderation: "PUBLISHED" | "FLAGGED" | "REMOVED";
  flagReason?: string;
};

export type Guests = { adults: number; children: number; infants: number; pets: number; rooms: number };

export type Booking = {
  id: string; // NZL-YYMMDD-####
  hotelId: string;
  roomId: string;
  guestId: string;
  guestName: string;
  checkIn: string; // yyyy-MM-dd
  checkOut: string;
  nights: number;
  guests: Guests;
  state: BookingState;
  price: PriceBreakdown;
  currency: Currency;
  payment: { method: "CARD_ON_FILE" | "NEW_CARD" | "WALLET" | "PAY_AT_HOTEL"; status: "AUTHORISED" | "CAPTURED" | "REFUNDED" | "PARTIALLY_REFUNDED" | "FAILED"; last4?: string };
  refundAmount?: number;
  specialRequests?: string;
  reviewed?: boolean;
  createdAt: string;
  dispute?: string;
};

export type PriceBreakdown = { room: number; cleaning: number; service: number; taxes: number; discount: number; total: number };

export type Wishlist = { id: string; name: string; hotelIds: string[]; dates?: { checkIn: string; checkOut: string; guests: number }; privacy: "PRIVATE" | "SHARED"; collaborators: string[]; updatedAt: string };

export type Message = { id: string; conversationId: string; from: "GUEST" | "HOST" | "SYSTEM"; text?: string; imageUrl?: string; sentAt: string; read: boolean; unsent?: boolean };
export type Conversation = { id: string; title: string; hotelId?: string; bookingId?: string; kind: "HOTEL" | "SUPPORT"; responseTime: string; lastMessage: string; lastAt: string; unread: number };

export type NotificationType = "BOOKING_CONFIRMATION" | "PAYMENT" | "CANCELLATION" | "RESERVATION_CHANGE" | "MESSAGE" | "AVAILABILITY" | "REVIEW_REMINDER" | "MATCH_RECOMMENDATION" | "PROMOTION";
export type NotificationChannel = "IN_APP" | "EMAIL" | "PUSH";
export type AppNotification = { id: string; type: NotificationType; title: string; body: string; createdAt: string; read: boolean; channels: NotificationChannel[]; link?: string };

export type Category = { id: string; name: string; icon: string; active: boolean; order: number };

export type User = { id: string; name: string; email: string; phone: string; role: Role; status: "ACTIVE" | "SUSPENDED"; verification: "VERIFIED" | "PENDING"; joinedAt: string; city: string; bookings: number };

export type Report = { id: string; type: "USER" | "HOTEL" | "FRAUD" | "ABUSE" | "PAYMENT"; subject: string; summary: string; status: "OPEN" | "IN_REVIEW" | "HIGH_PRIORITY" | "RESOLVED"; createdAt: string };

export type Transaction = { id: string; at: string; type: "AUTHORISATION" | "CAPTURE" | "REFUND" | "PARTIAL_REFUND" | "PAYOUT" | "FAILED"; reference: string; amount: number; currency: Currency; provider: "STRIPE" | "PAYMOB" | "BANK"; status: "AUTHORISED" | "CAPTURED" | "PAID" | "FAILED" };

export type CalendarDay = { date: string; price: number; available: number; closed: boolean; special: boolean; minStay: number; maxStay: number };

export type PricingRules = { weekendPct: number; longStayPct: number; monthlyPct: number; earlyBookingPct: number };

export type HostQuality = { hostId: string; name: string; responseRate: number; responseTime: string; cancellationRate: number; rating: number; accuracy: number; cleanliness: number; complaintsPct: number; reliability: number; badge?: HostSummary["badge"] };

export type NotificationPrefs = Record<string, NotificationChannel[]>;
