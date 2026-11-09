/* Seed records for the mock backend (sample data only). */
import type { AppNotification, Booking, Category, ConversationRecord, HostQuality, Message, Report, Review, Transaction, User, Wishlist } from "@/types/models";
import { hotelsSeed } from "./hotels";
import { computePrice } from "@/lib/pricing";

/* Demo accounts (§60). One guest, one host and one admin are surfaced on the sign-in page. */
export const DEMO_GUEST_ID = "u-nadia";
export const DEMO_HOST_ID = "host-rixos";
export const DEMO_ADMIN_ID = "u-admin";
const CURRENT_GUEST_ID = DEMO_GUEST_ID;

export const categoriesSeed: Category[] = [
  "Beach", "Luxury", "Resorts", "Pools", "City", "Romantic", "Family", "Business", "Boutique", "Budget", "Spa", "Nature", "Apartments", "Villas", "Hotels with views", "Hotels near landmarks",
].map((name, i) => ({ id: `cat-${i + 1}`, name, icon: name, active: true, order: i }));

const r = (id: string, hotelId: string, author: string, country: string, tripType: string, createdAt: string, overall: number, c: number[], text: string, verifiedStay = true, relevance = 80, extra: Partial<Review> = {}): Review => ({
  id, hotelId, author, country, tripType, createdAt, overall, verifiedStay, relevance, text, moderation: "PUBLISHED",
  categories: { cleanliness: c[0], location: c[1], staff: c[2], comfort: c[3], facilities: c[4], value: c[5] }, ...extra,
});

export const reviewsSeed: Review[] = [
  r("rv-1", "h-rixos-seagate", "Mariam S.", "Egypt", "Honeymoon", "2026-10-12", 5, [5, 4.5, 5, 5, 5, 4.5], "Our sea-view room was spotless and genuinely quiet. The spa team arranged a couples treatment on our first evening — a perfect start.", true, 98, { hostReply: "Thank you, Mariam — congratulations again from all of us at Rixos." }),
  r("rv-2", "h-rixos-seagate", "James T.", "United Kingdom", "Family", "2026-09-21", 4.6, [5, 4, 5, 4.5, 5, 4.5], "Kids loved the pools and the club. It’s a drive to Naama Bay, so plan taxis. Staff remembered our names by day two.", true, 91),
  r("rv-3", "h-rixos-seagate", "Layla A.", "UAE", "Couple", "2026-08-18", 4.0, [4.5, 4, 4.5, 3.5, 4.5, 3.5], "Beautiful property, but our garden room picked up music from the evening shows until late. Ask for the quieter wing.", true, 85),
  r("rv-4", "h-rixos-seagate", "Omar K.", "Egypt", "Business", "2026-07-03", 4.4, [5, 4, 4.5, 4.5, 4.5, 4], "Wi-Fi held up for video calls and the business corner was useful. Breakfast was excellent.", true, 74),
  r("rv-5", "h-rixos-seagate", "Sofia R.", "Italy", "Solo", "2026-06-14", 3.4, [4, 3, 3.5, 3.5, 4, 2.5], "Nice pools, but expensive for what you get if you don’t use the facilities much.", false, 40, { moderation: "FLAGGED", flagReason: "Unverified · posted from a new account" }),
  r("rv-6", "h-casa-cook", "Lina F.", "Egypt", "Couple", "2026-09-07", 4.8, [5, 4.5, 5, 4.5, 4.5, 5], "Beautiful design and a genuinely calm atmosphere. Rooms are compact but thoughtfully done.", true, 90),
  r("rv-7", "h-casa-cook", "Daniel M.", "Germany", "Couple", "2026-08-02", 4.5, [5, 4.5, 4.5, 4, 4.5, 4.5], "Loved the pool and breakfast. Wi-Fi was slow in the evenings.", true, 82),
  r("rv-8", "h-fs-cairo", "Hana B.", "Egypt", "Business", "2026-10-01", 4.7, [5, 5, 5, 4.5, 4.5, 4], "Perfect for meetings downtown, fast Wi-Fi and the Nile view from the desk. Some traffic noise on lower floors.", true, 88),
  r("rv-9", "h-kempinski", "Karim A.", "Egypt", "Business", "2026-09-19", 4.8, [5, 5, 4.5, 5, 4.5, 5], "Quietest hotel I’ve stayed at in Cairo. Proper desk, great Wi-Fi, small but fine gym.", true, 92),
  r("rv-10", "h-cecil", "Nadia A.", "Egypt", "Couple", "2026-06-13", 4.3, [4, 5, 5, 4, 3.5, 4.5], "Unbeatable location on the Corniche and lovely staff. Street noise at night — ask for a courtyard room.", true, 86, { bookingId: "NZL-260611-3019", authorId: "u-nadia" }),
  r("rv-11", "h-chedi", "Youssef H.", "Egypt", "Honeymoon", "2026-09-28", 5, [5, 4.5, 5, 5, 5, 4.5], "Felt like we had the lagoon to ourselves. The spa is exceptional.", true, 89),
  r("rv-12", "h-alcazar", "h0tel_fan22", "—", "Group", "2026-10-20", 5, [5, 5, 5, 5, 5, 5], "BEST HOTEL EVER!!! book now at cheap-deals-link…", false, 5, { moderation: "FLAGGED", flagReason: "Spam link · 6 similar reviews in 1 hour" }),
];

const mkBooking = (id: string, hotelId: string, roomSuffix: string, checkIn: string, checkOut: string, nights: number, state: Booking["state"], adults: number, payment: Booking["payment"], extra: Partial<Booking> = {}, guestName = "Nadia Amin", guestId = CURRENT_GUEST_ID): Booking => {
  const h = hotelsSeed.find((x) => x.id === hotelId)!;
  const room = h.rooms.find((x) => x.id.endsWith(roomSuffix))!;
  return { id, hotelId, roomId: room.id, guestId, hostId: h.host.id, guestName, checkIn, checkOut, nights, guests: { adults, children: 0, infants: 0, pets: 0, rooms: 1 }, state, price: computePrice(room.nightlyPrice, nights, { longStayPct: h.monthlyDiscountPct }), currency: h.currency, payment, createdAt: "2026-04-10T10:00:00Z", ...extra };
};

export const bookingsSeed: Booking[] = [
  mkBooking("NZL-260519-8472", "h-rixos-seagate", "dbl", "2027-05-16", "2027-05-19", 3, "CONFIRMED", 2, { method: "CARD_ON_FILE", status: "AUTHORISED", last4: "4242" }),
  mkBooking("NZL-261102-1180", "h-kempinski", "dbl", "2026-11-01", "2026-11-04", 3, "CHECKED_IN", 1, { method: "CARD_ON_FILE", status: "AUTHORISED", last4: "4242" }),
  mkBooking("NZL-260902-5521", "h-casa-cook", "ste", "2026-09-02", "2026-09-06", 4, "COMPLETED", 2, { method: "CARD_ON_FILE", status: "CAPTURED", last4: "4242" }),
  mkBooking("NZL-260611-3019", "h-cecil", "dbl", "2026-06-11", "2026-06-13", 2, "COMPLETED", 2, { method: "CARD_ON_FILE", status: "CAPTURED", last4: "4242" }, { reviewed: true }),
  mkBooking("NZL-260420-7740", "h-kempinski", "dbl", "2026-04-20", "2026-04-23", 3, "REFUNDED", 1, { method: "CARD_ON_FILE", status: "REFUNDED", last4: "4242" }, { refundAmount: 23700 }),
  // Host-side reservations for Rixos (other guests)
  mkBooking("NZL-261104-2232", "h-rixos-seagate", "ste", "2026-11-04", "2026-11-08", 4, "PENDING", 3, { method: "NEW_CARD", status: "AUTHORISED", last4: "1881" }, {}, "Omar Selim", "u-omar"),
  mkBooking("NZL-261102-2210", "h-rixos-seagate", "dbl", "2026-11-01", "2026-11-04", 3, "CHECKED_IN", 1, { method: "WALLET", status: "AUTHORISED" }, {}, "James Taylor", "u-james"),
  mkBooking("NZL-261028-0921", "h-rixos-seagate", "fam", "2026-10-28", "2026-10-31", 3, "COMPLETED", 4, { method: "CARD_ON_FILE", status: "CAPTURED", last4: "7710" }, {}, "Lina Farouk", "u-lina"),
  mkBooking("NZL-261020-0710", "h-rixos-seagate", "dbl", "2026-10-20", "2026-10-22", 2, "CANCELLED", 2, { method: "CARD_ON_FILE", status: "PARTIALLY_REFUNDED", last4: "3301" }, { dispute: "Charged after cancellation", refundAmount: 13900 }, "M. Hassan", "u-hassan"),
  mkBooking("NZL-261015-0503", "h-rixos-seagate", "dbl", "2026-10-15", "2026-10-16", 1, "NO_SHOW", 2, { method: "CARD_ON_FILE", status: "CAPTURED", last4: "9090" }, {}, "Sara Ibrahim", "u-sara"),
  mkBooking("NZL-261025-0811", "h-the-ned", "dbl", "2026-10-25", "2026-10-27", 2, "FAILED", 2, { method: "NEW_CARD", status: "FAILED" }, { dispute: "Suspicious payment pattern" }, "user_88213", "u-88213"),
];

export const wishlistsSeed: Wishlist[] = [
  { id: "wl-1", ownerId: "u-nadia", name: "Red Sea escape", hotelIds: ["h-rixos-seagate", "h-casa-cook", "h-chedi"], dates: { checkIn: "2027-05-16", checkOut: "2027-05-19", guests: 2 }, privacy: "SHARED", collaborators: ["Karim A.", "Salma N."], updatedAt: "2026-11-01" },
  { id: "wl-2", ownerId: "u-nadia", name: "Cairo work trips", hotelIds: ["h-fs-cairo", "h-kempinski"], privacy: "PRIVATE", collaborators: [], updatedAt: "2026-10-20" },
  { id: "wl-3", ownerId: "u-nadia", name: "Someday · Europe", hotelIds: ["h-pavillon", "h-the-ned"], privacy: "PRIVATE", collaborators: [], updatedAt: "2026-09-02" },
];

export const conversationsSeed: ConversationRecord[] = [
  { id: "c-1", kind: "HOTEL", guestId: "u-nadia", hostId: "host-rixos", hotelId: "h-rixos-seagate", bookingId: "NZL-260519-8472", createdAt: "2026-11-01T09:00:00Z", lastMessage: "Of course. We’ve added that preference to your reservation — here is the sea-view wing we’ve allocated.", lastAt: "2026-11-02T10:42:00Z" },
  { id: "c-2", kind: "SUPPORT", guestId: "u-nadia", hostId: "u-admin", createdAt: "2026-10-26T09:00:00Z", lastMessage: "Hi Nadia, this is Nuzul Support. How can we help with your trip?", lastAt: "2026-10-26T09:00:00Z" },
  { id: "c-3", kind: "HOTEL", guestId: "u-nadia", hostId: "host-casacook", hotelId: "h-casa-cook", bookingId: "NZL-260902-5521", createdAt: "2026-09-02T09:00:00Z", lastMessage: "Thank you for staying with us!", lastAt: "2026-09-06T12:00:00Z" },
  { id: "c-4", kind: "HOTEL", guestId: "u-nadia", hostId: "host-kemp", hotelId: "h-kempinski", bookingId: "NZL-261102-1180", createdAt: "2026-11-01T17:40:00Z", lastMessage: "Your late check-out is confirmed.", lastAt: "2026-11-01T18:00:00Z" },
  { id: "c-5", kind: "HOTEL", guestId: "u-omar", hostId: "host-rixos", hotelId: "h-rixos-seagate", bookingId: "NZL-261104-2232", createdAt: "2026-11-01T20:00:00Z", lastMessage: "We’re arriving late on the 4th — around midnight. Is that okay?", lastAt: "2026-11-01T20:05:00Z" },
];

export const messagesSeed: Message[] = [
  { id: "m-1", conversationId: "c-1", senderId: "system", text: "Booking confirmed · NZL-260519-8472. Check-in Sat 16 May from 3:00 PM. Reply here to reach the hotel directly.", sentAt: "2026-11-01T09:00:00Z", read: true },
  { id: "m-2", conversationId: "c-1", senderId: "host-rixos", text: "Hello Nadia, we look forward to welcoming you to Sharm El Sheikh. Is there anything we can prepare for your arrival?", sentAt: "2026-11-02T10:38:00Z", read: true },
  { id: "m-3", conversationId: "c-1", senderId: "u-nadia", text: "A quiet room away from the evening entertainment would be wonderful, thank you.", sentAt: "2026-11-02T10:40:00Z", read: true },
  { id: "m-4", conversationId: "c-1", senderId: "host-rixos", imageUrl: "/images/room.webp", text: "Of course. We’ve added that preference to your reservation — here is the sea-view wing we’ve allocated.", sentAt: "2026-11-02T10:42:00Z", read: false },
  { id: "m-5", conversationId: "c-2", senderId: "u-admin", text: "Hi Nadia, this is Nuzul Support. How can we help with your trip?", sentAt: "2026-10-26T09:00:00Z", read: true },
  { id: "m-6", conversationId: "c-3", senderId: "system", text: "Your stay is complete. Share a verified review within 14 days.", sentAt: "2026-09-06T11:00:00Z", read: true },
  { id: "m-7", conversationId: "c-3", senderId: "host-casacook", text: "Thank you for staying with us!", sentAt: "2026-09-06T12:00:00Z", read: true },
  { id: "m-8", conversationId: "c-4", senderId: "u-nadia", text: "Could I check out at 2 PM on Wednesday?", sentAt: "2026-11-01T17:40:00Z", read: true },
  { id: "m-9", conversationId: "c-4", senderId: "host-kemp", text: "Your late check-out is confirmed.", sentAt: "2026-11-01T18:00:00Z", read: true },
  { id: "m-10", conversationId: "c-5", senderId: "system", text: "Booking request · NZL-261104-2232. The hotel confirms within 24 hours.", sentAt: "2026-11-01T20:00:00Z", read: true },
  { id: "m-11", conversationId: "c-5", senderId: "u-omar", text: "We’re arriving late on the 4th — around midnight. Is that okay?", sentAt: "2026-11-01T20:05:00Z", read: false },
];

export const notificationsSeed: AppNotification[] = [
  { recipientId: "u-nadia", id: "n-1", type: "BOOKING_CONFIRMATION", title: "Booking confirmed · NZL-260519-8472", body: "Rixos Premium Seagate · 16–19 May · 2 guests", createdAt: "2026-11-02T08:00:00Z", read: false, channels: ["IN_APP", "EMAIL"], link: "/trips/NZL-260519-8472" },
  { recipientId: "u-nadia", id: "n-2", type: "MESSAGE", title: "New message from Rixos Premium Seagate", body: "“We’ve added your quiet-room preference.”", createdAt: "2026-11-02T10:42:00Z", read: false, channels: ["IN_APP", "PUSH"], link: "/messages/c-1" },
  { recipientId: "u-nadia", id: "n-3", type: "MATCH_RECOMMENDATION", title: "3 new stays above 90% match", body: "Based on Honeymoon · Premium · Spa & quiet", createdAt: "2026-11-01T09:00:00Z", read: false, channels: ["IN_APP", "EMAIL"], link: "/search?sort=MATCH" },
  { recipientId: "u-nadia", id: "n-4", type: "AVAILABILITY", title: "Casa Cook El Gouna has rooms for your saved dates", body: "From your “Red Sea escape” wishlist", createdAt: "2026-11-01T07:00:00Z", read: true, channels: ["IN_APP", "PUSH"], link: "/wishlists/wl-1" },
  { recipientId: "u-nadia", id: "n-5", type: "PAYMENT", title: "Payment authorised", body: "Visa ending 4242 · captured at check-in", createdAt: "2026-10-31T12:00:00Z", read: true, channels: ["IN_APP", "EMAIL"], link: "/trips/NZL-260519-8472" },
  { recipientId: "u-nadia", id: "n-6", type: "RESERVATION_CHANGE", title: "Late check-out approved", body: "Kempinski Nile Hotel · Wed 4 Nov until 2 PM", createdAt: "2026-11-01T18:00:00Z", read: true, channels: ["IN_APP", "EMAIL"], link: "/trips/NZL-261102-1180" },
  { recipientId: "u-nadia", id: "n-7", type: "REVIEW_REMINDER", title: "How was Casa Cook El Gouna?", body: "Share a verified-stay review to help other guests", createdAt: "2026-09-07T09:00:00Z", read: true, channels: ["EMAIL"], link: "/trips?tab=COMPLETED" },
  { recipientId: "u-nadia", id: "n-8", type: "CANCELLATION", title: "Reservation cancelled · full refund issued", body: "Kempinski Nile Hotel · EGP 23,700 returned to Visa 4242", createdAt: "2026-04-18T09:00:00Z", read: true, channels: ["IN_APP", "EMAIL"], link: "/trips?tab=CANCELLED" },
  { recipientId: "u-nadia", id: "n-9", type: "PROMOTION", title: "Long-stay season: up to 25% off monthly rates", body: "Selected Egyptian hotels · until 30 Nov", createdAt: "2026-10-15T09:00:00Z", read: true, channels: ["EMAIL"], link: "/search?mode=monthly" },
  { recipientId: "host-rixos", id: "n-h1", type: "BOOKING_CONFIRMATION", title: "New booking request · NZL-261104-2232", body: "Omar Selim · Junior Suite · 4–8 Nov · 3 guests", createdAt: "2026-11-01T20:00:00Z", read: false, channels: ["IN_APP", "EMAIL"], link: "/host/reservations?state=PENDING" },
  { recipientId: "host-rixos", id: "n-h2", type: "MESSAGE", title: "New message from Omar Selim", body: "“We’re arriving late on the 4th — around midnight.”", createdAt: "2026-11-01T20:05:00Z", read: false, channels: ["IN_APP", "PUSH"], link: "/host/messages/c-5" },
  { recipientId: "u-admin", id: "n-a1", type: "RESERVATION_CHANGE", title: "2 properties awaiting verification", body: "Azure Bay Resort · Nile House", createdAt: "2026-11-02T07:00:00Z", read: false, channels: ["IN_APP", "EMAIL"], link: "/admin/hotels" },
];

export const usersSeed: User[] = [
  { id: "u-nadia", name: "Nadia Amin", email: "nadia@example.com", phone: "+20 100 000 0000", role: "GUEST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2024-03-02", city: "Cairo", bookings: 6 },
  { id: "u-omar", name: "Omar Selim", email: "omar@example.com", phone: "+20 101 222 3333", role: "GUEST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2025-01-14", city: "Giza", bookings: 3 },
  { id: "u-lina", name: "Lina Farouk", email: "lina@example.com", phone: "+20 112 555 0101", role: "GUEST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2025-06-01", city: "Alexandria", bookings: 4 },
  { id: "u-88213", name: "user_88213", email: "x8@temp-mail.example", phone: "—", role: "GUEST", status: "SUSPENDED", verification: "PENDING", joinedAt: "2026-10-24", city: "—", bookings: 0 },
  { id: "host-rixos", name: "Rixos Hotels Egypt", email: "partners@rixos.example", phone: "+20 69 360 0000", role: "HOST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2024-02-10", city: "Sharm El Sheikh", bookings: 0 },
  { id: "host-nilehouse", name: "Nile House Ltd.", email: "info@nilehouse.example", phone: "+20 95 237 0000", role: "HOST", status: "ACTIVE", verification: "PENDING", joinedAt: "2026-09-12", city: "Luxor", bookings: 0 },
  { id: "u-james", name: "James Taylor", email: "james@example.com", phone: "+44 20 7946 0000", role: "GUEST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2025-03-08", city: "London", bookings: 2 },
  { id: "u-hassan", name: "M. Hassan", email: "hassan@example.com", phone: "+20 122 000 4444", role: "GUEST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2025-08-19", city: "Cairo", bookings: 1 },
  { id: "u-sara", name: "Sara Ibrahim", email: "sara@example.com", phone: "+20 100 777 8888", role: "GUEST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2026-02-02", city: "Cairo", bookings: 1 },
  { id: "host-azure", name: "Azure Bay Hospitality", email: "hello@azurebay.example", phone: "+20 65 000 1111", role: "HOST", status: "ACTIVE", verification: "PENDING", joinedAt: "2026-10-30", city: "Marsa Alam", bookings: 0 },
  { id: "u-admin", name: "Admin User", email: "ops@nuzul.example", phone: "+20 2 0000 0000", role: "ADMIN", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2024-01-01", city: "Cairo", bookings: 0 },
];

// Every property references a real host account (§64): add an account for each seeded host.
hotelsSeed.forEach((h) => {
  if (usersSeed.some((u) => u.id === h.host.id)) return;
  usersSeed.push({ id: h.host.id, name: h.host.name, email: `partners@${h.host.id.replace("host-", "")}.example`, phone: "+20 2 0000 0000", role: "HOST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2024-05-01", city: h.city, bookings: 0 });
});


export const reportsSeed: Report[] = [
  { id: "R-2041", type: "HOTEL", subject: "Azure Bay Resort", summary: "Photos don’t match the property", status: "OPEN", createdAt: "2026-11-02" },
  { id: "R-2040", type: "FRAUD", subject: "user_88213", summary: "Stolen-card pattern · 3 attempts", status: "HIGH_PRIORITY", createdAt: "2026-11-01" },
  { id: "R-2039", type: "ABUSE", subject: "Guest → host message", summary: "Threatening language", status: "IN_REVIEW", createdAt: "2026-10-31" },
  { id: "R-2038", type: "PAYMENT", subject: "NZL-261020-0710", summary: "Charged after cancellation", status: "OPEN", createdAt: "2026-10-30" },
  { id: "R-2037", type: "USER", subject: "Host: Nile House", summary: "Asked guest to pay off-platform", status: "RESOLVED", createdAt: "2026-10-28" },
];

export const transactionsSeed: Transaction[] = [
  { id: "t-1", at: "2026-11-02T10:42:00Z", type: "AUTHORISATION", reference: "NZL-260519-8472", amount: 43757, currency: "EGP", provider: "STRIPE", status: "AUTHORISED" },
  { id: "t-2", at: "2026-10-31T10:15:00Z", type: "CAPTURE", reference: "NZL-261028-0921", amount: 61200, currency: "EGP", provider: "STRIPE", status: "CAPTURED" },
  { id: "t-3", at: "2026-10-30T09:58:00Z", type: "PARTIAL_REFUND", reference: "NZL-261020-0710", amount: -13900, currency: "EGP", provider: "PAYMOB", status: "PAID" },
  { id: "t-4", at: "2026-11-01T09:30:00Z", type: "PAYOUT", reference: "PO-2611-01 · Rixos Hotels Egypt", amount: 412300, currency: "EGP", provider: "BANK", status: "PAID" },
  { id: "t-5", at: "2026-10-25T08:02:00Z", type: "FAILED", reference: "NZL-261025-0811", amount: 22400, currency: "EGP", provider: "STRIPE", status: "FAILED" },
];

export const hostQualitySeed: HostQuality[] = [
  { hostId: "host-rixos", name: "Rixos Hotels Egypt", responseRate: 99, responseTime: "< 1 h", cancellationRate: 0.6, rating: 4.8, accuracy: 4.9, cleanliness: 4.9, complaintsPct: 0.4, reliability: 99.4, badge: "TOP_HOST" },
  { hostId: "host-casacook", name: "Casa Cook", responseRate: 97, responseTime: "< 1 h", cancellationRate: 1.1, rating: 4.7, accuracy: 4.8, cleanliness: 4.8, complaintsPct: 0.7, reliability: 98.9, badge: "HIGHLY_RATED_HOST" },
  { hostId: "host-ghm", name: "GHM Hotels", responseRate: 94, responseTime: "2 h", cancellationRate: 2.4, rating: 4.9, accuracy: 4.7, cleanliness: 4.9, complaintsPct: 1.2, reliability: 97.6 },
  { hostId: "host-steig", name: "Steigenberger Hotels", responseRate: 91, responseTime: "3 h", cancellationRate: 3.8, rating: 4.5, accuracy: 4.4, cleanliness: 4.4, complaintsPct: 2.1, reliability: 96.2 },
];

/** Autocomplete index — cities, countries, hotels, landmarks, nearby (§5). */
export const searchIndexSeed: { label: string; kind: "CITY" | "COUNTRY" | "HOTEL" | "LANDMARK" | "NEARBY"; sub: string; value: string }[] = [
  ...["Cairo|Egypt", "Sharm El Sheikh|South Sinai, Egypt", "Hurghada|Red Sea, Egypt", "Alexandria|Egypt", "Dubai|United Arab Emirates", "Paris|France", "London|United Kingdom", "New York|United States", "Amsterdam|Netherlands", "Milan|Italy", "Barcelona|Spain"].map((s) => { const [label, sub] = s.split("|"); return { label, sub, kind: "CITY" as const, value: label }; }),
  { label: "Egypt", sub: "Country", kind: "COUNTRY", value: "Egypt" },
  { label: "United Arab Emirates", sub: "Country", kind: "COUNTRY", value: "UAE" },
  { label: "Giza Pyramids", sub: "Giza, Egypt", kind: "LANDMARK", value: "Cairo" },
  { label: "Eiffel Tower", sub: "Paris, France", kind: "LANDMARK", value: "Paris" },
  { label: "Burj Khalifa", sub: "Dubai, UAE", kind: "LANDMARK", value: "Dubai" },
  { label: "Near me", sub: "Use my current location", kind: "NEARBY", value: "NEARBY" },
  ...hotelsSeed.map((h) => ({ label: h.name, sub: `${h.city}, ${h.country}`, kind: "HOTEL" as const, value: h.slug })),
];
