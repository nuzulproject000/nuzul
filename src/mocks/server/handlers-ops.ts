/* Host & admin mock endpoints, plus Match Engine configuration. Every host endpoint is scoped to the
 * signed-in host's own properties; every admin endpoint requires an admin account. */
import type { Booking, BookingState, CalendarDay, Category, Hotel, PricingRules, Review, Room, User } from "@/types/models";
import { computeMatch, DEFAULT_PROFILE, scoreDistribution, weightsTotal, type MatchConfig, type MatchProfile, type TripPurpose } from "@/lib/match-engine";
import { toEGP } from "@/lib/currency";
import type { Question } from "@/services/questions";
import { getDb, persist } from "./db";
import { HttpError, invalid, notFound, paginate, route } from "./router";
import { admins, audit, newId, notify, now, requireUser, userById } from "./context";
import { adjustInventory, systemMessage } from "./handlers-guest";

const hotel = (hid: string) => getDb().hotels.find((h) => h.id === hid) ?? (() => { throw notFound("Hotel"); })();
const booking = (bid: string) => getDb().bookings.find((b) => b.id === bid) ?? (() => { throw notFound("Booking"); })();
const host = (write = false) => requireUser(["HOST"], { write });
const admin = (write = false) => requireUser(["ADMIN"], { write });
const myHotels = (h: User) => getDb().hotels.filter((x) => x.host.id === h.id);
/** A property owned by the signed-in host (404 for anyone else’s — no existence leak). */
function ownHotel(hid: string, write = false) {
  const me = host(write);
  const h = getDb().hotels.find((x) => x.id === hid && x.host.id === me.id);
  if (!h) throw notFound("Hotel");
  return h;
}
function ownRoom(rid: string, write = false) {
  const me = host(write);
  const h = getDb().hotels.find((x) => x.host.id === me.id && x.rooms.some((r) => r.id === rid));
  const room = h?.rooms.find((r) => r.id === rid);
  if (!h || !room) throw notFound("Room");
  return { h, room };
}

/* Allowed transitions of the §63 booking state machine. */
const TRANSITIONS: Record<BookingState, BookingState[]> = {
  PENDING: ["CONFIRMED", "CANCELLED", "EXPIRED", "FAILED"], CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"], CHECKED_IN: ["COMPLETED"],
  COMPLETED: [], CANCELLED: ["REFUNDED"], REFUNDED: [], FAILED: [], EXPIRED: [], NO_SHOW: [],
};
const STATE_TEXT: Partial<Record<BookingState, string>> = { CONFIRMED: "confirmed by the hotel", CANCELLED: "cancelled by the hotel", CHECKED_IN: "checked in", COMPLETED: "completed — you can now leave a verified review", NO_SHOW: "marked as a no-show", EXPIRED: "expired", FAILED: "failed" };
export function transition(b: Booking, to: BookingState) {
  if (!TRANSITIONS[b.state].includes(to)) throw new HttpError(409, "INVALID_TRANSITION", `Cannot move a ${b.state} booking to ${to}`);
  b.state = to;
  if (to === "CHECKED_IN") b.payment.status = "CAPTURED";
  if (to === "CANCELLED") adjustInventory(b, b.guests.rooms);
  const text = STATE_TEXT[to];
  if (text) {
    notify(b.guestId, to === "CANCELLED" ? "CANCELLATION" : to === "COMPLETED" ? "REVIEW_REMINDER" : "RESERVATION_CHANGE", `Reservation ${b.id} ${text.split(" —")[0]}`, `${hotel(b.hotelId).name} · ${b.checkIn} → ${b.checkOut}${to === "COMPLETED" ? " · share a verified review" : ""}`, `/trips/${b.id}`);
    systemMessage(b, `Reservation ${b.id} was ${text}.`);
  }
}

/* ------------------------------------------------------- Match Engine */
route("GET", "/match/questions", () => getDb().questions);
route("GET", "/match/config", () => getDb().matchConfig);
route("PUT", "/admin/match-engine/config", ({ body }) => {
  admin(true);
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
  admin(true);
  const qs = body as Question[];
  const bad = qs.find((q) => !q.title.trim() || q.options.length < 2);
  if (bad) throw invalid({ [bad.id]: "Each question needs a title and at least two options" });
  getDb().questions = qs; audit(`Questionnaire updated · ${qs.length} questions`); persist(); return qs;
});
route("GET", "/admin/audit", () => { admin(); return getDb().audit.slice(0, 30); });

/* --------------------------------------------------------------- Host */
route("GET", "/host/hotels", () => myHotels(host()));
route("POST", "/host/hotels", ({ body }) => {
  const me = host(true);
  const b = body as Partial<Hotel> & { rooms?: Partial<Room>[] };
  const e: Record<string, string> = {};
  if (!b.name?.trim()) e.name = "Hotel name is required";
  if (!b.city?.trim()) e.city = "City is required";
  if ((b.description ?? "").trim().length < 40) e.description = "Describe your property in at least 40 characters";
  if (!b.rooms?.length || b.rooms.some((r) => !r.name?.trim() || !(Number(r.nightlyPrice) > 0))) e.rooms = "Add at least one room with a name and price";
  if (Object.keys(e).length) throw invalid(e);
  const template = getDb().hotels[0];
  const hid = newId("h");
  const slugify = (x: string) => x.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const rooms: Room[] = b.rooms!.map((r, i) => ({
    id: `${hid}-r${i + 1}`, hotelId: hid, name: r.name!.trim(), type: r.type ?? "DOUBLE", capacity: Number(r.capacity) || 2, beds: r.beds ?? "1 king bed", bathrooms: 1, sizeM2: 30,
    nightlyPrice: Number(r.nightlyPrice), available: Number(r.totalUnits) || 1, totalUnits: Number(r.totalUnits) || 1, cancellationPolicy: b.cancellationPolicy ?? "FLEXIBLE",
    minStay: Number(r.minStay) || 1, maxStay: Number(r.maxStay) || 30, amenities: [], images: template.rooms[0].images,
  }));
  const h: Hotel = {
    ...structuredClone(template), id: hid, slug: `${slugify(b.country ?? "egypt")}/${slugify(b.city!)}/${slugify(b.name!)}`, name: b.name!.trim(), city: b.city!.trim(), country: b.country ?? "Egypt", area: b.area?.trim() || b.city!.trim(),
    description: b.description!.trim(), category: b.propertyType === "RESORT" ? "Resort" : "Hotel", propertyType: b.propertyType ?? "HOTEL", categories: [], rating: 0, reviewCount: 0,
    fromPrice: Math.min(...rooms.map((r) => r.nightlyPrice)), currency: "EGP", amenities: b.amenities ?? [], accessibility: b.accessibility ?? [], tags: [], atmosphere: [], insights: [], noiseMentionPct: 0,
    guestFavorite: false, verification: "BASIC", status: "PENDING", moderationNote: undefined, cancellationPolicy: b.cancellationPolicy ?? "FLEXIBLE", monthlyDiscountPct: b.monthlyDiscountPct ?? 10,
    nearby: [], rooms, host: { id: me.id, name: me.name, responseRate: 0, responseTime: "within a day" }, instantBook: false, payLater: true, available: true,
  };
  const db = getDb();
  db.hotels.push(h);
  rooms.forEach((r) => (db.calendars[r.id] = (db.calendars[template.rooms[0].id] ?? []).map((d) => ({ ...d, price: r.nightlyPrice, available: r.totalUnits, closed: false, special: false }))));
  db.pricing[hid] = { weekendPct: 15, longStayPct: 10, monthlyPct: h.monthlyDiscountPct, earlyBookingPct: 0 };
  admins().forEach((a) => notify(a.id, "RESERVATION_CHANGE", `New property awaiting verification`, `${h.name} · ${h.city} · ${me.name}`, "/admin/hotels"));
  notify(me.id, "RESERVATION_CHANGE", `${h.name} submitted for verification`, "Nuzul reviews new listings within 2 business days.", "/host/listings");
  persist();
  return h;
});
const HOST_EDITABLE: (keyof Hotel)[] = ["name", "description", "propertyType", "category", "city", "area", "coordinates", "images", "amenities", "accessibility", "nearby", "cancellationPolicy", "monthlyDiscountPct", "petsAllowed", "instantBook", "payLater", "checkIn", "checkOut", "categories", "available"];
route("PATCH", "/host/hotels/:id", ({ params, body }) => {
  const h = ownHotel(params.id, true);
  const patch = body as Partial<Hotel> & { resubmit?: boolean };
  HOST_EDITABLE.forEach((k) => { if (k in patch) (h as Record<string, unknown>)[k] = patch[k]; });
  if (patch.resubmit && ["REJECTED", "DRAFT"].includes(h.status)) {
    h.status = "IN_REVIEW";
    admins().forEach((a) => notify(a.id, "RESERVATION_CHANGE", `Property resubmitted`, `${h.name} · ${h.host.name}`, "/admin/hotels"));
  }
  persist(); return h;
});
route("PATCH", "/host/rooms/:id", ({ params, body }) => {
  const { h, room } = ownRoom(params.id, true);
  const b = body as Partial<Room>;
  if (b.nightlyPrice !== undefined && b.nightlyPrice <= 0) throw invalid({ nightlyPrice: "Price must be greater than zero" });
  if ((b.minStay ?? room.minStay) > (b.maxStay ?? room.maxStay)) throw invalid({ minStay: "Minimum stay can’t exceed maximum stay" });
  if ((b.available ?? room.available) > (b.totalUnits ?? room.totalUnits)) throw invalid({ available: "Available rooms can’t exceed total rooms" });
  const priceChanged = b.nightlyPrice !== undefined && b.nightlyPrice !== room.nightlyPrice;
  Object.assign(room, b, { id: room.id, hotelId: room.hotelId });
  h.fromPrice = Math.min(...h.rooms.map((r) => r.nightlyPrice));
  // A new base price flows into non-special calendar days so search, detail and checkout agree.
  if (priceChanged) (getDb().calendars[room.id] ?? []).forEach((d) => { if (!d.special) d.price = room.nightlyPrice; });
  persist();
  return room;
});
route("GET", "/host/rooms/:id/calendar", ({ params }) => { ownRoom(params.id); return getDb().calendars[params.id] ?? []; });
route("PUT", "/host/rooms/:id/calendar", ({ params, body }) => {
  ownRoom(params.id, true);
  const { dates, patch } = body as { dates: string[]; patch: Partial<CalendarDay> };
  if (!dates?.length) throw invalid({ dates: "Select at least one date" });
  if (patch.price !== undefined && patch.price <= 0) throw invalid({ price: "Price must be greater than zero" });
  if (patch.available !== undefined && patch.available < 0) throw invalid({ available: "Availability can’t be negative" });
  const cal = getDb().calendars[params.id] ?? [];
  cal.forEach((d) => { if (dates.includes(d.date)) Object.assign(d, patch); });
  persist();
  return cal;
});
route("GET", "/host/hotels/:id/pricing", ({ params }) => { ownHotel(params.id); return getDb().pricing[params.id] ?? { weekendPct: 0, longStayPct: 0, monthlyPct: 0, earlyBookingPct: 0 }; });
route("PUT", "/host/hotels/:id/pricing", ({ params, body }) => {
  const h = ownHotel(params.id, true);
  const r = body as PricingRules;
  if (Object.values(r).some((v) => v < 0 || v > 60)) throw invalid({ rules: "Adjustments must be between 0% and 60%" });
  getDb().pricing[params.id] = r; h.monthlyDiscountPct = r.monthlyPct; persist(); return r;
});

route("GET", "/host/reservations", ({ query }) => {
  const me = host();
  const states = query.get("state")?.split(",").filter(Boolean) ?? [];
  const rows = getDb().bookings.filter((b) => b.hostId === me.id && (!states.length || states.includes(b.state))).sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.checkIn.localeCompare(a.checkIn));
  return paginate(rows, query, 50);
});
route("POST", "/host/reservations/:id/transition", ({ params, body }) => {
  const me = host(true);
  const b = booking(params.id);
  if (b.hostId !== me.id) throw notFound("Booking");
  transition(b, (body as { to: BookingState }).to);
  persist(); return b;
});

route("GET", "/host/reviews", () => { const me = host(); const mine = new Set(myHotels(me).map((h) => h.id)); return getDb().reviews.filter((r) => mine.has(r.hotelId) && r.moderation !== "REMOVED"); });
route("POST", "/host/reviews/:id/reply", ({ params, body }) => {
  const me = host(true);
  const { text } = body as { text: string };
  if ((text ?? "").trim().length < 10) throw invalid({ text: "Replies need at least 10 characters" });
  const r = getDb().reviews.find((x) => x.id === params.id);
  if (!r || !myHotels(me).some((h) => h.id === r.hotelId)) throw notFound("Review");
  r.hostReply = text.trim();
  if (r.authorId) notify(r.authorId, "REVIEW_REMINDER", `${hotel(r.hotelId).name} replied to your review`, `“${r.hostReply.slice(0, 80)}”`, "/profile/reviews");
  persist(); return r;
});

const purposeProfiles: [string, TripPurpose, string[], string[]][] = [
  ["Couples", "COUPLE", ["Romantic", "Quiet"], ["Pool", "Spa"]], ["Honeymoon", "HONEYMOON", ["Romantic", "Luxury"], ["Spa", "Room service"]],
  ["Families", "FAMILY", ["Family"], ["Pool", "Restaurant"]], ["Business", "BUSINESS", ["Business", "Quiet"], ["Wi-Fi", "Workspace"]],
  ["Solo", "SOLO", ["Quiet"], ["Gym", "Wi-Fi"]], ["Groups", "GROUP", ["Lively"], ["Restaurant", "Pool"]],
];
route("GET", "/host/match-insights", ({ query }) => {
  const me = host();
  const h = query.get("hotelId") ? ownHotel(query.get("hotelId")!) : myHotels(me)[0];
  if (!h) throw notFound("Hotel");
  const cfg = getDb().matchConfig;
  const segments = purposeProfiles.map(([label, purpose, atmosphere, facilities]) => {
    const m = computeMatch(h, { ...DEFAULT_PROFILE, destination: h.city, purpose, atmosphere, facilities, priorities: [] }, cfg);
    return { label, score: m.score, topIssue: m.negatives[0] ?? null };
  }).sort((a, b) => b.score - a.score);
  const sample: MatchProfile[] = purposeProfiles.flatMap(([, purpose, atmosphere, facilities]) => (["BUDGET", "MODERATE", "PREMIUM", "LUXURY"] as const).map((budget) => ({ ...DEFAULT_PROFILE, destination: h.city, purpose, budget, atmosphere, facilities })));
  return { hotelId: h.id, average: Math.round(segments.reduce((s, x) => s + x.score, 0) / segments.length), segments, distribution: scoreDistribution(sample.map((p) => computeMatch(h, p, cfg).score)) };
});

route("GET", "/host/stats", () => {
  const me = host();
  const hotels = myHotels(me);
  const bk = getDb().bookings.filter((b) => b.hostId === me.id);
  const active = bk.filter((b) => !["CANCELLED", "REFUNDED", "FAILED", "EXPIRED"].includes(b.state));
  const revenue = active.reduce((n, b) => n + toEGP(b.price.room - b.price.discount, b.currency), 0);
  const nights = active.reduce((n, b) => n + b.nights * b.guests.rooms, 0);
  const rated = hotels.filter((h) => h.reviewCount);
  return {
    // Totals below are computed from this host's real (mock) reservations; trend series are illustrative.
    revenue, revenueDelta: 12.4, occupancy: 78, occupancyDelta: 4.2, bookings: active.length, bookingsDelta: 2,
    adr: nights ? Math.round(revenue / nights) : 0, cancellationRate: bk.length ? Math.round((bk.filter((b) => ["CANCELLED", "REFUNDED", "NO_SHOW"].includes(b.state)).length / bk.length) * 1000) / 10 : 0, wishlistSaves: getDb().wishlists.filter((w) => w.hotelIds.some((id) => hotels.some((h) => h.id === id))).length,
    checkInsNext7: active.filter((b) => { const d = (new Date(b.checkIn).getTime() - Date.now()) / 864e5; return d >= -1 && d <= 7; }).length,
    checkOutsNext7: active.filter((b) => { const d = (new Date(b.checkOut).getTime() - Date.now()) / 864e5; return d >= -1 && d <= 7; }).length,
    averageRating: rated.length ? Math.round((rated.reduce((n, h) => n + h.rating, 0) / rated.length) * 10) / 10 : 0, reviewCount: hotels.reduce((n, h) => n + h.reviewCount, 0),
    revenueSeries: [38, 52, 44, 69, 58, 75, 62, 80, 74, 88, 78, 94, 83, 72, 90, 86, 96, 84, 76, 92].map((v, i) => ({ day: i + 1, revenue: v * 1000, occupancy: Math.min(98, 50 + v / 2) })),
    occupancyByMonth: [61, 64, 70, 73, 69, 82, 88, 91, 80, 78].map((v, i) => ({ month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][i], occupancy: v })),
    funnel: [{ step: "Listing views", value: 48210 }, { step: "Match Score clicks", value: 9120 }, { step: "Booking attempts", value: 1920 }, { step: "Completed bookings", value: Math.max(active.length, 1) }],
    pendingRequests: bk.filter((b) => b.state === "PENDING").length,
    today: bk.filter((b) => ["PENDING", "CONFIRMED", "CHECKED_IN"].includes(b.state)).sort((a, b) => a.checkIn.localeCompare(b.checkIn)).slice(0, 6),
  };
});
route("GET", "/host/earnings", () => {
  const me = host();
  const db = getDb();
  const refs = new Set(db.bookings.filter((b) => b.hostId === me.id).map((b) => b.id));
  const tx = db.transactions.filter((t) => refs.has(t.reference) || t.reference.includes(me.name));
  const gross = tx.filter((t) => t.type === "CAPTURE" || t.type === "AUTHORISATION").reduce((n, t) => n + toEGP(t.amount, t.currency), 0);
  const refunds = tx.filter((t) => t.type.includes("REFUND")).reduce((n, t) => n + Math.abs(toEGP(t.amount, t.currency)), 0);
  const commission = Math.round(gross * 0.15);
  return { gross, commissionPct: 15, commission, net: gross - commission - refunds, refunds, nextPayout: "2026-11-05", transactions: tx };
});

/* -------------------------------------------------------------- Admin */
route("GET", "/admin/stats", () => {
  admin();
  const db = getDb();
  return {
    users: db.users.length, usersDelta: 8.1, hotels: db.hotels.filter((h) => h.status === "LIVE").length, hotelsDelta: 2.4, bookings30d: db.bookings.length,
    gmv30d: db.bookings.filter((b) => !["FAILED", "CANCELLED"].includes(b.state)).reduce((n, b) => n + toEGP(b.price.total, b.currency), 0),
    pendingVerification: db.hotels.filter((h) => ["PENDING", "IN_REVIEW"].includes(h.status)).length, openReports: db.reports.filter((r) => r.status !== "RESOLVED").length,
    bookingsSeries: [620, 700, 680, 760, 810, 900, 870, 720, 760, 830, 880, 940, 990, 910].map((v, i) => ({ day: i + 1, bookings: v })),
    match: { questionnaireCompletion: 64, scoreClickRate: 38, bookedHighMatch: 57, matchToBooking: 7.4, selectedBecauseOfMatch: 41 },
    conversionByBand: [{ band: "<70", rate: 1.8 }, { band: "70s", rate: 3.1 }, { band: "80s", rate: 5.2 }, { band: "90–94", rate: 8.9 }, { band: "95+", rate: 12.4 }],
    fraud: { fakeAccounts: db.users.filter((u) => u.status === "SUSPENDED").length, heldPayments: db.bookings.filter((b) => b.dispute).length, reviewFlags: db.reviews.filter((r) => r.moderation === "FLAGGED").length, spam: 31 },
  };
});

route("GET", "/admin/users", ({ query }) => {
  admin();
  const role = query.get("role"), status = query.get("status"), verification = query.get("verification"), q = (query.get("q") ?? "").toLowerCase();
  const rows = getDb().users.filter((u) => (!role || u.role === role) && (!status || u.status === status) && (!verification || u.verification === verification) && (!q || (u.name + u.email).toLowerCase().includes(q)));
  return paginate(rows, query, 50);
});
route("PATCH", "/admin/users/:id", ({ params, body }) => {
  const me = admin(true);
  const u = getDb().users.find((x) => x.id === params.id);
  if (!u) throw notFound("User");
  const patch = body as Partial<User>;
  if (u.id === me.id && (patch.status === "SUSPENDED" || (patch.role && patch.role !== "ADMIN"))) throw new HttpError(409, "SELF_LOCKOUT", "You can’t suspend or demote your own admin account");
  const before = { ...u };
  if (patch.status) { u.status = patch.status; u.statusReason = patch.status === "SUSPENDED" ? patch.statusReason?.trim() || "Violation of Nuzul policies" : undefined; }
  if (patch.verification) u.verification = patch.verification;
  if (patch.role) u.role = patch.role;
  if (before.status !== u.status) notify(u.id, "RESERVATION_CHANGE", u.status === "SUSPENDED" ? "Your account has been suspended" : "Your account has been reactivated", u.status === "SUSPENDED" ? `${u.statusReason}. You can still sign in to view bookings and messages.` : "You can book, message and manage listings again.", u.role === "HOST" ? "/host/settings" : "/account");
  audit(`User ${u.name}: ${JSON.stringify(patch)}`);
  persist(); return u;
});

route("GET", "/admin/hotels", ({ query }) => { admin(); return paginate(getDb().hotels.filter((h) => !query.get("status") || h.status === query.get("status")), query, 100); });
route("PATCH", "/admin/hotels/:id", ({ params, body }) => {
  admin(true);
  const h = hotel(params.id);
  const patch = body as Partial<Hotel>;
  if ((patch.status === "REJECTED" || patch.status === "SUSPENDED") && !patch.moderationNote?.trim()) throw invalid({ moderationNote: "Give the host a reason" });
  const prev = h.status;
  if (patch.status) h.status = patch.status;
  if (patch.verification) h.verification = patch.verification;
  if (patch.status) h.moderationNote = patch.status === "LIVE" ? undefined : patch.moderationNote?.trim() ?? h.moderationNote;
  if (patch.status && patch.status !== prev) {
    const msg: Record<string, [string, string]> = {
      LIVE: [`${h.name} is live`, prev === "SUSPENDED" ? "Your listing has been restored to search." : "Approved by Nuzul — guests can now find and book it."],
      REJECTED: [`${h.name} was not approved`, h.moderationNote ?? ""],
      SUSPENDED: [`${h.name} has been suspended`, h.moderationNote ?? ""],
      IN_REVIEW: [`More information needed for ${h.name}`, patch.moderationNote?.trim() || "Nuzul needs more details to verify your listing."],
    };
    const m = msg[h.status];
    if (m) notify(h.host.id, "RESERVATION_CHANGE", m[0], m[1], "/host/listings");
  }
  audit(`Hotel ${h.name}: ${prev} → ${h.status}${patch.verification ? ` · ${patch.verification}` : ""}`);
  persist(); return h;
});
route("GET", "/admin/host-quality", () => { admin(); return getDb().hostQuality; });
route("PATCH", "/admin/host-quality/:id", ({ params, body }) => {
  admin(true);
  const q = getDb().hostQuality.find((x) => x.hostId === params.id); if (!q) throw notFound("Host");
  Object.assign(q, body);
  getDb().hotels.filter((h) => h.host.id === q.hostId).forEach((h) => (h.host.badge = q.badge));
  if (q.badge) notify(q.hostId, "RESERVATION_CHANGE", `You earned the ${q.badge === "TOP_HOST" ? "Top Host" : "Highly Rated Host"} badge`, "It now appears on your listings.", "/host/profile");
  persist(); return q;
});

route("GET", "/admin/bookings", ({ query }) => {
  admin();
  const q = (query.get("q") ?? "").toLowerCase();
  const rows = getDb().bookings.filter((b) => !q || `${b.id} ${b.guestName} ${hotel(b.hotelId).name}`.toLowerCase().includes(q)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return paginate(rows, query, 50);
});
route("PATCH", "/admin/bookings/:id", ({ params, body }) => {
  admin(true);
  const b = booking(params.id);
  const { checkIn, checkOut, nights } = body as Partial<Booking>;
  if (!checkIn || !checkOut || !nights || nights < 1) throw invalid({ checkOut: "Check-out must be after check-in" });
  adjustInventory(b, b.guests.rooms);
  Object.assign(b, { checkIn, checkOut, nights });
  adjustInventory(b, -b.guests.rooms);
  [b.guestId, b.hostId].forEach((u) => notify(u, "RESERVATION_CHANGE", `Reservation ${b.id} updated by Nuzul`, `New dates ${checkIn} → ${checkOut}`, userById(u)?.role === "HOST" ? "/host/reservations" : `/trips/${b.id}`));
  systemMessage(b, `Nuzul Support changed the dates of ${b.id} to ${checkIn} → ${checkOut}.`);
  audit(`Booking ${b.id} dates → ${checkIn}/${checkOut}`); persist(); return b;
});
route("POST", "/admin/bookings/:id/refund", ({ params, body }) => {
  admin(true);
  const b = booking(params.id);
  const { amount } = body as { amount: number };
  const remaining = b.price.total - (b.refundAmount ?? 0);
  if (!(amount > 0) || amount > remaining) throw invalid({ amount: `Refund must be between 1 and ${remaining}` });
  b.refundAmount = (b.refundAmount ?? 0) + amount; b.payment.status = b.refundAmount >= b.price.total ? "REFUNDED" : "PARTIALLY_REFUNDED";
  if (b.state === "CANCELLED") b.state = "REFUNDED";
  getDb().transactions.unshift({ id: newId("t"), at: now(), type: b.refundAmount >= b.price.total ? "REFUND" : "PARTIAL_REFUND", reference: b.id, amount: -amount, currency: b.currency, provider: "STRIPE", status: "PAID" });
  notify(b.guestId, "PAYMENT", `Refund issued · ${b.id}`, `${b.currency} ${amount.toLocaleString()} to your original payment method (simulated)`, `/trips/${b.id}`);
  audit(`Refund ${b.currency} ${amount} on ${b.id}`); persist(); return b;
});
route("POST", "/admin/bookings/:id/cancel", ({ params }) => {
  admin(true);
  const b = booking(params.id);
  if (["COMPLETED", "REFUNDED", "CANCELLED", "FAILED", "EXPIRED", "NO_SHOW"].includes(b.state)) throw new HttpError(409, "INVALID_STATE", "This booking can no longer be cancelled");
  b.state = "CANCELLED"; adjustInventory(b, b.guests.rooms);
  [b.guestId, b.hostId].forEach((u) => notify(u, "CANCELLATION", `Reservation ${b.id} cancelled by Nuzul`, "Any refund is issued separately by Nuzul Support.", userById(u)?.role === "HOST" ? "/host/reservations" : `/trips/${b.id}`));
  systemMessage(b, `Nuzul Support cancelled reservation ${b.id}.`);
  audit(`Cancelled ${b.id}`); persist(); return b;
});
route("POST", "/admin/bookings/:id/resolve-dispute", ({ params }) => {
  admin(true);
  const b = booking(params.id); b.dispute = undefined;
  [b.guestId, b.hostId].forEach((u) => notify(u, "RESERVATION_CHANGE", `Dispute resolved · ${b.id}`, "Nuzul Support has closed the case.", userById(u)?.role === "HOST" ? "/host/reservations" : `/trips/${b.id}`));
  audit(`Dispute resolved on ${b.id}`); persist(); return b;
});

route("GET", "/admin/reviews", ({ query }) => { admin(); return getDb().reviews.filter((r) => !query.get("moderation") || r.moderation === query.get("moderation")); });
route("PATCH", "/admin/reviews/:id", ({ params, body }) => {
  admin(true);
  const r = getDb().reviews.find((x) => x.id === params.id); if (!r) throw notFound("Review");
  const { moderation, flagReason } = body as Pick<Review, "moderation" | "flagReason">;
  const prev = r.moderation;
  if (moderation === "REMOVED" && !flagReason?.trim()) throw invalid({ flagReason: "Choose a removal reason" });
  r.moderation = moderation; r.flagReason = moderation === "PUBLISHED" ? undefined : flagReason;
  const h = hotel(r.hotelId);
  if (prev === "PUBLISHED" && moderation !== "PUBLISHED") h.reviewCount = Math.max(0, h.reviewCount - 1);
  if (prev !== "PUBLISHED" && moderation === "PUBLISHED") h.reviewCount += 1;
  if (r.authorId && prev !== moderation) notify(r.authorId, "REVIEW_REMINDER", moderation === "REMOVED" ? `Your review of ${h.name} was removed` : `Your review of ${h.name} is published`, moderation === "REMOVED" ? `Reason: ${flagReason}` : "Thanks for helping other guests.", "/profile/reviews");
  audit(`Review ${r.id} → ${r.moderation}`); persist(); return r;
});
route("GET", "/admin/reports", ({ query }) => { admin(); return getDb().reports.filter((r) => !query.get("type") || r.type === query.get("type")); });
route("PATCH", "/admin/reports/:id", ({ params, body }) => { admin(true); const r = getDb().reports.find((x) => x.id === params.id); if (!r) throw notFound("Report"); Object.assign(r, body); audit(`Report ${r.id} → ${r.status}`); persist(); return r; });
route("GET", "/admin/transactions", ({ query }) => { admin(); return paginate(getDb().transactions, query, 100); });
route("PUT", "/admin/categories", ({ body }) => {
  admin(true);
  const cats = body as Category[];
  const names = cats.map((c) => c.name.trim().toLowerCase());
  if (names.some((n) => !n)) throw invalid({ name: "Category names can’t be empty" });
  if (new Set(names).size !== names.length) throw invalid({ name: "Category names must be unique" });
  getDb().categories = cats.map((c, i) => ({ ...c, order: i })); audit(`Categories updated (${cats.length})`); persist(); return getDb().categories;
});
