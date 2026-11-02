/* Host & admin mock endpoints, plus Match Engine configuration. */
import type { Booking, BookingState, CalendarDay, Category, Hotel, PricingRules } from "@/types/models";
import { computeMatch, DEFAULT_PROFILE, scoreDistribution, weightsTotal, type MatchConfig, type MatchProfile, type TripPurpose } from "@/lib/match-engine";
import type { Question } from "@/services/questions";
import { getDb, persist } from "./db";
import { HttpError, invalid, notFound, paginate, route } from "./router";

const HOST_ID = "host-rixos";
const now = () => new Date().toISOString();
const id = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const audit = (action: string, actor = "Admin User") => getDb().audit.unshift({ at: now(), actor, action });
const myHotels = () => getDb().hotels.filter((h) => h.host.id === HOST_ID);
const hotel = (hid: string) => getDb().hotels.find((h) => h.id === hid) ?? (() => { throw notFound("Hotel"); })();
const booking = (bid: string) => getDb().bookings.find((b) => b.id === bid) ?? (() => { throw notFound("Booking"); })();

/* Allowed transitions of the §63 booking state machine. */
const TRANSITIONS: Record<BookingState, BookingState[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED", "FAILED"], CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"], CHECKED_IN: ["COMPLETED"],
  COMPLETED: [], CANCELLED: ["REFUNDED"], REFUNDED: [], FAILED: [], EXPIRED: [], NO_SHOW: [],
};
export function transition(b: Booking, to: BookingState) {
  if (!TRANSITIONS[b.state].includes(to)) throw new HttpError(409, "INVALID_TRANSITION", `Cannot move a ${b.state} booking to ${to}`);
  b.state = to;
  if (to === "CHECKED_IN") b.payment.status = "CAPTURED";
}

/* ------------------------------------------------------- Match Engine */
route("GET", "/match/questions", () => getDb().questions);
route("GET", "/match/config", () => getDb().matchConfig);
route("PUT", "/admin/match-engine/config", ({ body }) => {
  const cfg = body as MatchConfig;
  const e: Record<string, string> = {};
  if (weightsTotal(cfg.weights) !== 100) e.weights = "Factor weights must total 100%";
  if (cfg.minScore >= cfg.maxScore) e.minScore = "Minimum score must be lower than maximum";
  if (cfg.strongFactor <= cfg.weakFactor) e.strongFactor = "Strength threshold must be above the mismatch threshold";
  if (Object.keys(e).length) throw invalid(e);
  const before = getDb().matchConfig;
  const changed = (Object.keys(cfg.weights) as (keyof MatchConfig["weights"])[]).filter((k) => before.weights[k] !== cfg.weights[k]).map((k) => `${k} ${before.weights[k]} → ${cfg.weights[k]}`);
  getDb().matchConfig = cfg;
  audit(changed.length ? `Weights: ${changed.join(", ")}` : "Updated scoring & explanation rules");
  persist();
  return cfg;
});
route("PUT", "/admin/match-engine/questions", ({ body }) => {
  const qs = body as Question[];
  const bad = qs.find((q) => !q.title.trim() || q.options.length < 2);
  if (bad) throw invalid({ [bad.id]: "Each question needs a title and at least two options" });
  getDb().questions = qs; audit(`Questionnaire updated · ${qs.length} questions`); persist(); return qs;
});
route("GET", "/admin/audit", () => getDb().audit.slice(0, 20));

/* --------------------------------------------------------------- Host */
route("GET", "/host/hotels", () => [...myHotels(), ...getDb().hotels.filter((h) => h.host.id === HOST_ID + "-draft")]);
route("POST", "/host/hotels", ({ body }) => {
  const b = body as Partial<Hotel>;
  const e: Record<string, string> = {};
  if (!b.name?.trim()) e.name = "Hotel name is required";
  if (!b.city?.trim()) e.city = "City is required";
  if ((b.description ?? "").length < 40) e.description = "Describe your property in at least 40 characters";
  if (Object.keys(e).length) throw invalid(e);
  const template = myHotels()[0];
  const h: Hotel = { ...structuredClone(template), ...b, id: id("h"), slug: `egypt/${(b.city ?? "").toLowerCase().replace(/\s+/g, "-")}/${(b.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`, status: "IN_REVIEW", verification: "BASIC", rating: 0, reviewCount: 0, guestFavorite: false, insights: [] } as Hotel;
  h.rooms = h.rooms.map((r) => ({ ...r, id: `${h.id}-${r.type.toLowerCase()}`, hotelId: h.id }));
  getDb().hotels.push(h);
  persist();
  return h;
});
route("PATCH", "/host/hotels/:id", ({ params, body }) => { const h = hotel(params.id); Object.assign(h, body); persist(); return h; });
route("PATCH", "/host/rooms/:id", ({ params, body }) => {
  const h = getDb().hotels.find((x) => x.rooms.some((r) => r.id === params.id));
  const room = h?.rooms.find((r) => r.id === params.id);
  if (!room || !h) throw notFound("Room");
  const b = body as Partial<typeof room>;
  if (b.nightlyPrice !== undefined && b.nightlyPrice <= 0) throw invalid({ nightlyPrice: "Price must be greater than zero" });
  if (b.minStay !== undefined && b.maxStay !== undefined && b.minStay > b.maxStay) throw invalid({ minStay: "Minimum stay can’t exceed maximum stay" });
  Object.assign(room, b);
  h.fromPrice = Math.min(...h.rooms.map((r) => r.nightlyPrice));
  persist();
  return room;
});
route("GET", "/host/rooms/:id/calendar", ({ params }) => getDb().calendars[params.id] ?? []);
route("PUT", "/host/rooms/:id/calendar", ({ params, body }) => {
  const { dates, patch } = body as { dates: string[]; patch: Partial<CalendarDay> };
  if (patch.price !== undefined && patch.price <= 0) throw invalid({ price: "Price must be greater than zero" });
  const cal = getDb().calendars[params.id] ?? [];
  cal.forEach((d) => { if (dates.includes(d.date)) Object.assign(d, patch); });
  persist();
  return cal;
});
route("GET", "/host/hotels/:id/pricing", ({ params }) => getDb().pricing[params.id]);
route("PUT", "/host/hotels/:id/pricing", ({ params, body }) => { getDb().pricing[params.id] = body as PricingRules; persist(); return body; });

route("GET", "/host/reservations", ({ query }) => {
  const states = query.get("state")?.split(",").filter(Boolean) ?? [];
  const mine = new Set(myHotels().map((h) => h.id));
  const rows = getDb().bookings.filter((b) => mine.has(b.hotelId) && (!states.length || states.includes(b.state))).sort((a, b) => b.checkIn.localeCompare(a.checkIn));
  return paginate(rows, query, 20);
});
route("POST", "/host/reservations/:id/transition", ({ params, body }) => { const b = booking(params.id); transition(b, (body as { to: BookingState }).to); persist(); return b; });

route("GET", "/host/reviews", () => { const mine = new Set(myHotels().map((h) => h.id)); return getDb().reviews.filter((r) => mine.has(r.hotelId)); });
route("POST", "/host/reviews/:id/reply", ({ params, body }) => {
  const { text } = body as { text: string };
  if ((text ?? "").trim().length < 10) throw invalid({ text: "Replies need at least 10 characters" });
  const r = getDb().reviews.find((x) => x.id === params.id); if (!r) throw notFound("Review");
  r.hostReply = text.trim(); persist(); return r;
});

/* Host inbox: the same conversations seen from the property side (§34, §42). */
route("GET", "/host/conversations", () => {
  const db = getDb();
  const mine = new Set(myHotels().map((h) => h.id));
  return db.conversations.filter((c) => c.hotelId && mine.has(c.hotelId)).map((c) => {
    const b = db.bookings.find((x) => x.id === c.bookingId);
    const unread = db.messages.filter((m) => m.conversationId === c.id && m.from === "GUEST" && !m.read).length;
    return { ...c, title: b?.guestName ?? "Guest", responseTime: b ? `${b.id} · ${b.checkIn}` : "Enquiry", unread };
  });
});
route("POST", "/host/conversations/:id/messages", ({ params, body }) => {
  const { text } = body as { text: string };
  if (!text?.trim()) throw invalid({ text: "Message can’t be empty" });
  const db = getDb();
  const c = db.conversations.find((x) => x.id === params.id); if (!c) throw notFound("Conversation");
  const m = { id: id("m"), conversationId: c.id, from: "HOST" as const, text: text.trim(), sentAt: now(), read: false };
  db.messages.push(m); c.lastMessage = m.text; c.lastAt = m.sentAt; c.unread += 1; persist(); return m;
});
route("POST", "/host/messages/:id/unsend", ({ params }) => { const m = getDb().messages.find((x) => x.id === params.id); if (!m) throw notFound("Message"); if (m.from !== "HOST") throw new HttpError(403, "FORBIDDEN", "You can only unsend your own messages"); m.unsent = true; persist(); return m; });
route("POST", "/host/conversations/:id/read", ({ params }) => { getDb().messages.filter((m) => m.conversationId === params.id && m.from === "GUEST").forEach((m) => (m.read = true)); persist(); return { ok: true }; });

const purposeProfiles: [string, TripPurpose, string[], string[]][] = [
  ["Couples", "COUPLE", ["Romantic", "Quiet"], ["Pool", "Spa"]], ["Honeymoon", "HONEYMOON", ["Romantic", "Luxury"], ["Spa", "Room service"]],
  ["Families", "FAMILY", ["Family"], ["Pool", "Restaurant"]], ["Business", "BUSINESS", ["Business", "Quiet"], ["Wi-Fi", "Workspace"]],
  ["Solo", "SOLO", ["Quiet"], ["Gym", "Wi-Fi"]], ["Groups", "GROUP", ["Lively"], ["Restaurant", "Pool"]],
];
route("GET", "/host/match-insights", ({ query }) => {
  const h = hotel(query.get("hotelId") ?? myHotels()[0].id);
  const cfg = getDb().matchConfig;
  const segments = purposeProfiles.map(([label, purpose, atmosphere, facilities]) => {
    const m = computeMatch(h, { ...DEFAULT_PROFILE, destination: h.city, purpose, atmosphere, facilities, priorities: [] }, cfg);
    return { label, score: m.score, topIssue: m.negatives[0] ?? null };
  }).sort((a, b) => b.score - a.score);
  const sample: MatchProfile[] = purposeProfiles.flatMap(([, purpose, atmosphere, facilities]) => (["BUDGET", "MODERATE", "PREMIUM", "LUXURY"] as const).map((budget) => ({ ...DEFAULT_PROFILE, destination: h.city, purpose, budget, atmosphere, facilities })));
  return { hotelId: h.id, average: Math.round(segments.reduce((s, x) => s + x.score, 0) / segments.length), segments, distribution: scoreDistribution(sample.map((p) => computeMatch(h, p, cfg).score)) };
});

route("GET", "/host/stats", () => {
  const mine = new Set(myHotels().map((h) => h.id));
  const bk = getDb().bookings.filter((b) => mine.has(b.hotelId));
  return {
    revenue: 1_240_000, revenueDelta: 12.4, occupancy: 78, occupancyDelta: 4.2, bookings: 146, bookingsDelta: 9, adr: 11860, cancellationRate: 4.1, wishlistSaves: 1284,
    checkInsNext7: 24, checkOutsNext7: 19, averageRating: 4.8, reviewCount: 892,
    revenueSeries: [38, 52, 44, 69, 58, 75, 62, 80, 74, 88, 78, 94, 83, 72, 90, 86, 96, 84, 76, 92].map((v, i) => ({ day: i + 1, revenue: v * 1000, occupancy: Math.min(98, 50 + v / 2) })),
    occupancyByMonth: [61, 64, 70, 73, 69, 82, 88, 91, 80, 78].map((v, i) => ({ month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][i], occupancy: v })),
    funnel: [{ step: "Listing views", value: 48210 }, { step: "Match Score clicks", value: 9120 }, { step: "Booking attempts", value: 1920 }, { step: "Completed bookings", value: 146 }],
    pendingRequests: bk.filter((b) => b.state === "PENDING").length,
    today: bk.filter((b) => ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.state)).slice(0, 5),
  };
});
route("GET", "/host/earnings", () => ({ gross: 1_240_000, commissionPct: 15, commission: 186_000, net: 1_054_000, refunds: 31_000, nextPayout: "2026-11-05", transactions: getDb().transactions }));

/* -------------------------------------------------------------- Admin */
route("GET", "/admin/stats", () => ({ users: 128420, usersDelta: 8.1, hotels: 3842, hotelsDelta: 2.4, bookings30d: 21906, gmv30d: 214_000_000, pendingVerification: getDb().hotels.filter((h) => ["PENDING", "IN_REVIEW"].includes(h.status)).length + 45, openReports: getDb().reports.filter((r) => r.status !== "RESOLVED").length,
  bookingsSeries: [620, 700, 680, 760, 810, 900, 870, 720, 760, 830, 880, 940, 990, 910].map((v, i) => ({ day: i + 1, bookings: v })),
  match: { questionnaireCompletion: 64, scoreClickRate: 38, bookedHighMatch: 57, matchToBooking: 7.4, selectedBecauseOfMatch: 41 },
  conversionByBand: [{ band: "<70", rate: 1.8 }, { band: "70s", rate: 3.1 }, { band: "80s", rate: 5.2 }, { band: "90–94", rate: 8.9 }, { band: "95+", rate: 12.4 }],
  fraud: { fakeAccounts: 18, heldPayments: 6, reviewFlags: getDb().reviews.filter((r) => r.moderation === "FLAGGED").length, spam: 31 } }));

route("GET", "/admin/users", ({ query }) => {
  const role = query.get("role"), status = query.get("status"), verification = query.get("verification"), q = (query.get("q") ?? "").toLowerCase();
  const rows = getDb().users.filter((u) => (!role || u.role === role) && (!status || u.status === status) && (!verification || u.verification === verification) && (!q || (u.name + u.email).toLowerCase().includes(q)));
  return paginate(rows, query, 20);
});
route("PATCH", "/admin/users/:id", ({ params, body }) => { const u = getDb().users.find((x) => x.id === params.id); if (!u) throw notFound("User"); Object.assign(u, body); audit(`User ${u.name}: ${JSON.stringify(body)}`); persist(); return u; });

route("GET", "/admin/hotels", ({ query }) => paginate(getDb().hotels.filter((h) => !query.get("status") || h.status === query.get("status")), query, 50));
route("PATCH", "/admin/hotels/:id", ({ params, body }) => { const h = hotel(params.id); Object.assign(h, body); audit(`Hotel ${h.name}: ${JSON.stringify(body)}`); persist(); return h; });
route("GET", "/admin/host-quality", () => getDb().hostQuality);
route("PATCH", "/admin/host-quality/:id", ({ params, body }) => { const q = getDb().hostQuality.find((x) => x.hostId === params.id); if (!q) throw notFound("Host"); Object.assign(q, body); persist(); return q; });

route("GET", "/admin/bookings", ({ query }) => {
  const q = (query.get("q") ?? "").toLowerCase();
  const rows = getDb().bookings.filter((b) => !q || `${b.id} ${b.guestName} ${hotel(b.hotelId).name}`.toLowerCase().includes(q));
  return paginate(rows, query, 20);
});
route("PATCH", "/admin/bookings/:id", ({ params, body }) => { const b = booking(params.id); Object.assign(b, body); audit(`Booking ${b.id} modified`); persist(); return b; });
route("POST", "/admin/bookings/:id/refund", ({ params, body }) => {
  const b = booking(params.id);
  const { amount } = body as { amount: number };
  if (!(amount > 0) || amount > b.price.total) throw invalid({ amount: `Refund must be between 1 and ${b.price.total}` });
  b.refundAmount = amount; b.payment.status = amount === b.price.total ? "REFUNDED" : "PARTIALLY_REFUNDED";
  if (["CANCELLED"].includes(b.state)) b.state = "REFUNDED";
  getDb().transactions.unshift({ id: id("t"), at: now(), type: amount === b.price.total ? "REFUND" : "PARTIAL_REFUND", reference: b.id, amount: -amount, currency: b.currency, provider: "STRIPE", status: "PAID" });
  audit(`Refund ${b.currency} ${amount} on ${b.id}`); persist(); return b;
});
route("POST", "/admin/bookings/:id/cancel", ({ params }) => { const b = booking(params.id); if (["COMPLETED", "REFUNDED", "CANCELLED"].includes(b.state)) throw new HttpError(409, "INVALID_STATE", "This booking can no longer be cancelled"); b.state = "CANCELLED"; audit(`Cancelled ${b.id}`); persist(); return b; });
route("POST", "/admin/bookings/:id/resolve-dispute", ({ params }) => { const b = booking(params.id); b.dispute = undefined; audit(`Dispute resolved on ${b.id}`); persist(); return b; });

route("GET", "/admin/reviews", ({ query }) => getDb().reviews.filter((r) => !query.get("moderation") || r.moderation === query.get("moderation")));
route("PATCH", "/admin/reviews/:id", ({ params, body }) => { const r = getDb().reviews.find((x) => x.id === params.id); if (!r) throw notFound("Review"); Object.assign(r, body); audit(`Review ${r.id} → ${r.moderation}`); persist(); return r; });
route("GET", "/admin/reports", ({ query }) => getDb().reports.filter((r) => !query.get("type") || r.type === query.get("type")));
route("PATCH", "/admin/reports/:id", ({ params, body }) => { const r = getDb().reports.find((x) => x.id === params.id); if (!r) throw notFound("Report"); Object.assign(r, body); persist(); return r; });
route("GET", "/admin/transactions", ({ query }) => paginate(getDb().transactions, query, 20));
route("PUT", "/admin/categories", ({ body }) => {
  const cats = body as Category[];
  const names = cats.map((c) => c.name.trim().toLowerCase());
  if (names.some((n) => !n)) throw invalid({ name: "Category names can’t be empty" });
  if (new Set(names).size !== names.length) throw invalid({ name: "Category names must be unique" });
  getDb().categories = cats.map((c, i) => ({ ...c, order: i })); audit(`Categories updated (${cats.length})`); persist(); return getDb().categories;
});
