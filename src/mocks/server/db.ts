/* In-browser mock database. Persists to localStorage so demo state survives
 * reloads; `resetDb()` restores the seed. Only the mock adapter touches it. */
import type { AppNotification, Booking, CalendarDay, Category, ConversationRecord, Hotel, HostQuality, Message, NotificationPrefs, PricingRules, Report, Review, Transaction, User, Wishlist } from "@/types/models";
import { DEFAULT_CONFIG, DEFAULT_PROFILE, type MatchConfig, type MatchProfile } from "@/lib/match-engine";
import { DEFAULT_QUESTIONS, type Question } from "@/services/questions";
import { hotelsSeed } from "../hotels";
import { bookingsSeed, categoriesSeed, conversationsSeed, hostQualitySeed, messagesSeed, notificationsSeed, reportsSeed, reviewsSeed, transactionsSeed, usersSeed, wishlistsSeed } from "../seed";
import { addDays, format, getDay } from "date-fns";

export type AuditEntry = { at: string; actor: string; action: string };

export type Db = {
  version: number;
  hotels: Hotel[];
  reviews: Review[];
  bookings: Booking[];
  wishlists: Wishlist[];
  conversations: ConversationRecord[];
  messages: Message[];
  notifications: AppNotification[];
  /** Per-user delivery preferences, keyed by user ID. */
  notificationPrefs: Record<string, NotificationPrefs>;
  categories: Category[];
  users: User[];
  reports: Report[];
  transactions: Transaction[];
  hostQuality: HostQuality[];
  /** Match Profiles keyed by user ID; "anonymous" holds the visitor's questionnaire answers. */
  profiles: Record<string, MatchProfile>;
  analytics: { event: string; props: unknown; at: string; userId?: string }[];
  matchConfig: MatchConfig;
  questions: Question[];
  calendars: Record<string, CalendarDay[]>; // by roomId
  pricing: Record<string, PricingRules>; // by hotelId
  audit: AuditEntry[];
};

export const DB_KEY = "nuzul.mockdb";
const KEY = DB_KEY;
const NOTIFICATION_TYPES = ["BOOKING_CONFIRMATION", "PAYMENT", "CANCELLATION", "RESERVATION_CHANGE", "MESSAGE", "AVAILABILITY", "REVIEW_REMINDER", "MATCH_RECOMMENDATION", "PROMOTION"];
const VERSION = 4;

function seedCalendar(nightly: number): CalendarDay[] {
  const start = new Date();
  start.setDate(1);
  return Array.from({ length: 92 }, (_, i) => {
    const d = addDays(start, i);
    const weekend = [5, 6].includes(getDay(d));
    return { date: format(d, "yyyy-MM-dd"), price: Math.round(nightly * (weekend ? 1.15 : 1)), available: i % 9 === 0 ? 0 : 12 - (i % 5), closed: i === 24 || i === 25, special: false, minStay: 1, maxStay: 30 };
  });
}

function seed(): Db {
  const hotels: Hotel[] = [
      ...structuredClone(hotelsSeed),
      // Two applications awaiting admin verification (§50) — not visible to guests.
      { ...structuredClone(hotelsSeed[3]), id: "h-azure-bay", slug: "egypt/marsa-alam/azure-bay-resort", name: "Azure Bay Resort", city: "Marsa Alam", area: "Port Ghalib", status: "PENDING", verification: "BASIC", rating: 0, reviewCount: 0, guestFavorite: false, host: { id: "host-azure", name: "Azure Bay Hospitality", responseRate: 0, responseTime: "—" }, rooms: structuredClone(hotelsSeed[3].rooms).map((r) => ({ ...r, id: r.id.replace("h-casa-cook", "h-azure-bay"), hotelId: "h-azure-bay" })) },
      { ...structuredClone(hotelsSeed[7]), id: "h-nile-house", slug: "egypt/luxor/nile-house", name: "Nile House", city: "Luxor", area: "West Bank", status: "IN_REVIEW", verification: "BASIC", rating: 0, reviewCount: 0, guestFavorite: false, host: { id: "host-nilehouse", name: "Nile House Ltd.", responseRate: 0, responseTime: "—" }, rooms: structuredClone(hotelsSeed[7].rooms).map((r) => ({ ...r, id: r.id.replace("h-mena-house", "h-nile-house"), hotelId: "h-nile-house" })) },
    ];
  const calendars: Db["calendars"] = {};
  hotels.forEach((h) => h.rooms.forEach((r) => (calendars[r.id] = seedCalendar(r.nightlyPrice))));
  return {
    version: VERSION,
    hotels,
    reviews: structuredClone(reviewsSeed),
    bookings: structuredClone(bookingsSeed),
    wishlists: structuredClone(wishlistsSeed),
    conversations: structuredClone(conversationsSeed),
    messages: structuredClone(messagesSeed),
    notifications: structuredClone(notificationsSeed),
    notificationPrefs: {},
    categories: structuredClone(categoriesSeed),
    users: structuredClone(usersSeed),
    reports: structuredClone(reportsSeed),
    transactions: structuredClone(transactionsSeed),
    hostQuality: structuredClone(hostQualitySeed),
    profiles: { "u-nadia": structuredClone(DEFAULT_PROFILE) },
    analytics: [],
    matchConfig: structuredClone(DEFAULT_CONFIG),
    questions: structuredClone(DEFAULT_QUESTIONS),
    calendars,
    pricing: Object.fromEntries(hotels.map((h) => [h.id, { weekendPct: 15, longStayPct: 10, monthlyPct: h.monthlyDiscountPct, earlyBookingPct: 8 }])),
    audit: [
      { at: "2026-11-02T10:12:00Z", actor: "Admin User", action: "Location weight 18 → 20" },
      { at: "2026-11-01T15:30:00Z", actor: "Admin User", action: "Added question “Which room suits you?”" },
      { at: "2026-10-28T09:00:00Z", actor: "Ops Lead", action: "Noise penalty 1.0 → 1.2" },
    ],
  };
}

let db: Db | null = null;

export function getDb(): Db {
  if (db) return db;
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    const parsed = raw ? (JSON.parse(raw) as Db) : null;
    db = parsed && parsed.version === VERSION ? parsed : seed();
  } catch {
    db = seed();
  }
  return db;
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(getDb())); } catch { /* storage full or unavailable — keep in memory */ }
}

/** Default delivery preferences for a user who hasn't changed them. */
export const defaultPrefs = (): NotificationPrefs => Object.fromEntries(NOTIFICATION_TYPES.map((t) => [t, t === "PROMOTION" ? ["EMAIL"] : t === "MESSAGE" || t === "BOOKING_CONFIRMATION" ? ["IN_APP", "EMAIL", "PUSH"] : ["IN_APP", "EMAIL"]])) as NotificationPrefs;

/** Re-read the shared dataset (another tab changed it). */
export function reloadDb() { db = null; return getDb(); }

export function resetDb() {
  db = seed();
  persist();
}
