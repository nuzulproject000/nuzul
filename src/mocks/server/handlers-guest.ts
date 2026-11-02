/* Public catalogue and guest endpoints: catalog, search, hotels, reviews, wishlists, bookings.
 * Identity comes from the request token (see context.ts); visitors may browse but not act. */
import type { Booking, Hotel, Review, Wishlist } from "@/types/models";
import type { CreateBookingRequest, SortKey } from "@/types/api";
import { computeMatch, DEFAULT_PROFILE } from "@/lib/match-engine";
import { computePrice, refundPct } from "@/lib/pricing";
import { toEGP } from "@/lib/currency";
import { daysUntil, nightsBetween } from "@/lib/dates";
import { searchIndexSeed } from "../seed";
import { currentUser, isPublic, newId, notify, now, after, requireUser } from "./context";
import { destinations } from "../hotels";
import { getDb, persist } from "./db";
import { HttpError, invalid, notFound, paginate, route } from "./router";

/** The Match Profile used for this request: the signed-in user's, or the visitor's questionnaire answers. */
export const profileKey = () => currentUser()?.id ?? "anonymous";
export const activeProfile = () => getDb().profiles[profileKey()] ?? { ...DEFAULT_PROFILE, saved: false };
export const withMatch = (h: Hotel) => ({ ...h, match: computeMatch(h, activeProfile(), getDb().matchConfig) });
const live = () => getDb().hotels.filter(isPublic);
const hotel = (hid: string) => getDb().hotels.find((h) => h.id === hid) ?? (() => { throw notFound("Hotel"); })();
/** Unpublished listings are visible only to their host and to admins (preview / moderation). */
function visibleHotel(h: Hotel | undefined) {
  const u = currentUser();
  if (h && (isPublic(h) || u?.role === "ADMIN" || (u?.role === "HOST" && h.host.id === u.id))) return h;
  throw notFound("Hotel");
}
const id = newId;
const list = (q: URLSearchParams, k: string) => (q.get(k) ? q.get(k)!.split(",").filter(Boolean) : []);
const bool = (q: URLSearchParams, k: string) => q.get(k) === "true";

/* ------------------------------------------------------------ Catalog */
route("GET", "/catalog/categories", () => [...getDb().categories].sort((a, b) => a.order - b.order));
route("GET", "/catalog/destinations", () => destinations);
route("GET", "/catalog/suggestions", ({ query }) => {
  const q = (query.get("q") ?? "").trim().toLowerCase();
  const items = q ? searchIndexSeed.filter((s) => s.label.toLowerCase().includes(q) || s.sub.toLowerCase().includes(q)) : searchIndexSeed.filter((s) => s.kind === "CITY" || s.kind === "NEARBY").slice(0, 8);
  return items.slice(0, 8);
});

/* ------------------------------------------------------------- Search */
route("GET", "/hotels/search", ({ query: q }) => {
  const dest = q.get("destination") ?? "";
  const minPrice = Number(q.get("minPrice") ?? 0), maxPrice = Number(q.get("maxPrice") ?? Infinity);
  const minRating = Number(q.get("minRating") ?? 0), minMatch = Number(q.get("minMatch") ?? 0);
  const minCapacity = Number(q.get("minCapacity") ?? 0), minBathrooms = Number(q.get("minBathrooms") ?? 0);
  const types = list(q, "propertyTypes"), amenities = list(q, "amenities"), access = list(q, "accessibility");
  const roomType = q.get("roomType"), category = q.get("category");
  const guests = Number(q.get("guests") ?? 0);

  const inDest = dest && dest !== "NEARBY" ? live().filter((h) => h.city === dest || h.country === dest) : [];
  // Destinations with few listings also show alternatives (ranked lower by the Match Engine's location factor).
  const base = !dest || dest === "NEARBY" ? live() : inDest.length >= 4 ? inDest : [...inDest, ...live().filter((h) => !inDest.includes(h))];

  const rows = base.map(withMatch).filter((h) => {
    const egp = toEGP(h.fromPrice, h.currency);
    if (egp < minPrice || egp > maxPrice) return false;
    if (h.rating < minRating) return false;
    if (types.length && !types.includes(h.propertyType)) return false;
    if (roomType && !h.rooms.some((r) => r.type === roomType)) return false;
    if (minCapacity && !h.rooms.some((r) => r.capacity >= minCapacity)) return false;
    if (guests && !h.rooms.some((r) => r.capacity * Number(q.get("rooms") ?? 1) >= guests)) return false;
    if (minBathrooms && !h.rooms.some((r) => r.bathrooms >= minBathrooms)) return false;
    if (amenities.some((a) => !h.amenities.includes(a))) return false;
    if (access.some((a) => !h.accessibility.includes(a))) return false;
    if (bool(q, "instantBook") && !h.instantBook) return false;
    if (bool(q, "payLater") && !h.payLater) return false;
    if (bool(q, "freeCancellation") && h.cancellationPolicy !== "FLEXIBLE") return false;
    if (bool(q, "flexibleCancellation") && !["FLEXIBLE", "MODERATE"].includes(h.cancellationPolicy)) return false;
    if (bool(q, "pets") && !h.petsAllowed) return false;
    if (bool(q, "guestFavorite") && !h.guestFavorite) return false;
    if (bool(q, "highlyRated") && h.rating < 4.7) return false;
    if (h.match.score < minMatch) return false;
    if (category && !h.categories.includes(category)) return false;
    return true;
  });

  // §13/§76: marketplace ranking with Match Score as a first-class signal.
  const recommended = (h: (typeof rows)[number]) => h.match.score * 0.55 + h.rating * 8 + (h.available ? 6 : -20) + Math.log10(h.reviewCount) * 2 + (h.guestFavorite ? 3 : 0) + (inDest.includes(h as Hotel) || h.city === dest ? 12 : 0);
  const sorters: Record<SortKey, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
    RECOMMENDED: (a, b) => recommended(b) - recommended(a), MATCH: (a, b) => b.match.score - a.match.score,
    PRICE_ASC: (a, b) => toEGP(a.fromPrice, a.currency) - toEGP(b.fromPrice, b.currency), PRICE_DESC: (a, b) => toEGP(b.fromPrice, b.currency) - toEGP(a.fromPrice, a.currency),
    RATING: (a, b) => b.rating - a.rating, DISTANCE: (a, b) => a.distanceKm - b.distanceKm, REVIEWS: (a, b) => b.reviewCount - a.reviewCount,
    POPULARITY: (a, b) => b.reviewCount * b.rating - a.reviewCount * a.rating,
  };
  const sort = (q.get("sort") as SortKey) || "RECOMMENDED";
  rows.sort(sorters[sort] ?? sorters.RECOMMENDED);
  return { ...paginate(rows, q, 12), inDestination: inDest.length };
});

route("GET", "/hotels/collections/:kind", ({ params }) => {
  const rows = live().map(withMatch);
  const byMatch = [...rows].sort((a, b) => b.match.score - a.match.score);
  switch (params.kind) {
    case "recommended": return byMatch.filter((h) => h.available).slice(0, 4);
    case "high-match": return byMatch.slice(0, 3);
    case "guest-favorites": return rows.filter((h) => h.guestFavorite).slice(0, 4);
    case "popular": return [...rows].sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4);
    case "nearby": return rows.filter((h) => h.country === "Egypt").sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 4);
    case "long-stays": return [...rows].sort((a, b) => b.monthlyDiscountPct - a.monthlyDiscountPct).slice(0, 4);
    default: throw notFound("Collection");
  }
});

/* Split stays (§81): two hotels in the destination across one trip, ranked by average Match then total. */
route("GET", "/hotels/split-stays", ({ query }) => {
  const dest = query.get("destination") ?? "";
  const checkIn = query.get("checkIn") ?? "", checkOut = query.get("checkOut") ?? "";
  const nights = nightsBetween(checkIn, checkOut);
  if (nights < 4) return [];
  const first = Math.ceil(nights / 2);
  const mid = new Date(checkIn); mid.setDate(mid.getDate() + first);
  const split = mid.toISOString().slice(0, 10);
  const pool = live().filter((h) => h.available && (!dest || h.city === dest || h.country === dest)).map(withMatch);
  const pairs = pool.flatMap((a) => pool.filter((b) => b.id !== a.id).map((b) => {
    const legs = [{ hotel: a, checkIn, checkOut: split, nights: first }, { hotel: b, checkIn: split, checkOut, nights: nights - first }]
      .map((l) => ({ ...l, total: computePrice(l.hotel.fromPrice, l.nights, { longStayPct: l.hotel.monthlyDiscountPct }).total, currency: l.hotel.currency }));
    return { legs, averageMatch: Math.round((a.match.score + b.match.score) / 2), totalEGP: legs.reduce((n, l) => n + toEGP(l.total, l.currency), 0) };
  }));
  const seen = new Set<string>();
  return pairs.sort((x, y) => y.averageMatch - x.averageMatch || x.totalEGP - y.totalEGP)
    .filter((p) => { const k = p.legs.map((l) => l.hotel.id).sort().join(); return !seen.has(k) && !!seen.add(k); }).slice(0, 3);
});
route("GET", "/hotels/by-slug", ({ query }) => {
  return withMatch(visibleHotel(getDb().hotels.find((x) => x.slug === query.get("slug"))));
});
route("GET", "/hotels/:id", ({ params }) => withMatch(visibleHotel(getDb().hotels.find((h) => h.id === params.id))));
route("POST", "/hotels/compare", ({ body }) => ((body as { ids: string[] }).ids ?? []).map((i) => getDb().hotels.find((h) => h.id === i)).filter((h): h is Hotel => !!h && isPublic(h)).map(withMatch));

route("GET", "/hotels/:id/flexible-dates", ({ params, query }) => {
  const h = withMatch(visibleHotel(hotel(params.id)));
  const nights = Number(query.get("nights") ?? 3);
  const start = new Date(query.get("checkIn") ?? Date.now());
  return [-2, -1, 0, 1, 2].map((offset, i) => {
    const d = new Date(start); d.setDate(d.getDate() + offset);
    const factor = [0.92, 0.96, 1, 0.94, 0.9][i];
    const total = computePrice(Math.round(h.fromPrice * factor), nights).total;
    return { checkIn: d.toISOString().slice(0, 10), nights, total, currency: h.currency, matchScore: Math.min(99, h.match.score + [0, 1, 0, 3, -1][i]) };
  });
});


/* ------------------------------------------------------------ Reviews */
route("GET", "/hotels/:id/reviews", ({ params, query }) => {
  const sort = query.get("sort") ?? "RELEVANT";
  const rows = getDb().reviews.filter((r) => r.hotelId === params.id && r.moderation === "PUBLISHED");
  const cmp: Record<string, (a: Review, b: Review) => number> = {
    RELEVANT: (a, b) => b.relevance - a.relevance, RECENT: (a, b) => b.createdAt.localeCompare(a.createdAt),
    HIGHEST: (a, b) => b.overall - a.overall, LOWEST: (a, b) => a.overall - b.overall,
  };
  return paginate([...rows].sort(cmp[sort] ?? cmp.RELEVANT), query, 6);
});

/* ---------------------------------------------------------- Wishlists (guest-owned) */
function wl(wid: string) {
  const me = requireUser(["GUEST"]);
  const w = getDb().wishlists.find((x) => x.id === wid && x.ownerId === me.id);
  if (!w) throw notFound("Wishlist");
  return w;
}
const mine = () => { const me = requireUser(["GUEST"]); return getDb().wishlists.filter((w) => w.ownerId === me.id); };
route("GET", "/me/wishlists", () => mine());
route("POST", "/me/wishlists", ({ body }) => {
  const me = requireUser(["GUEST"], { write: true });
  const { name } = body as { name: string };
  if (!name?.trim()) throw invalid({ name: "Name is required" });
  if (name.length > 50) throw invalid({ name: "Use 50 characters or fewer" });
  if (mine().some((w) => w.name.toLowerCase() === name.trim().toLowerCase())) throw invalid({ name: "You already have a wishlist with this name" });
  const w: Wishlist = { id: id("wl"), ownerId: me.id, name: name.trim(), hotelIds: [], privacy: "PRIVATE", collaborators: [], updatedAt: now() };
  getDb().wishlists.push(w); persist(); return w;
});
route("PATCH", "/me/wishlists/:id", ({ params, body }) => { requireUser(["GUEST"], { write: true }); const w = wl(params.id); const { name, privacy, dates } = body as Partial<Wishlist>; Object.assign(w, name !== undefined ? { name: name.trim() } : {}, privacy ? { privacy } : {}, dates ? { dates } : {}, { updatedAt: now() }); persist(); return w; });
route("DELETE", "/me/wishlists/:id", ({ params }) => { requireUser(["GUEST"], { write: true }); wl(params.id); const db = getDb(); db.wishlists = db.wishlists.filter((w) => w.id !== params.id); persist(); return { ok: true }; });
route("POST", "/me/wishlists/:id/items", ({ params, body }) => { requireUser(["GUEST"], { write: true }); const w = wl(params.id); const { hotelId } = body as { hotelId: string }; if (!w.hotelIds.includes(hotelId)) w.hotelIds.push(hotelId); w.updatedAt = now(); persist(); return w; });
route("DELETE", "/me/wishlists/:id/items/:hotelId", ({ params }) => { requireUser(["GUEST"], { write: true }); const w = wl(params.id); w.hotelIds = w.hotelIds.filter((x) => x !== params.hotelId); persist(); return w; });
route("POST", "/me/wishlists/:id/move", ({ params, body }) => {
  requireUser(["GUEST"], { write: true });
  const { hotelId, toId } = body as { hotelId: string; toId: string };
  const from = wl(params.id), to = wl(toId);
  from.hotelIds = from.hotelIds.filter((x) => x !== hotelId);
  if (!to.hotelIds.includes(hotelId)) to.hotelIds.push(hotelId);
  persist(); return { from, to };
});
route("POST", "/me/wishlists/:id/collaborators", ({ params, body }) => {
  requireUser(["GUEST"], { write: true });
  const { email } = body as { email: string };
  if (!/^\S+@\S+\.\S+$/.test(email ?? "")) throw invalid({ email: "Enter a valid email address" });
  const w = wl(params.id);
  const name = email.split("@")[0];
  if (w.collaborators.includes(name)) throw invalid({ email: "Already invited" });
  w.collaborators.push(name); w.privacy = "SHARED"; persist(); return w;
});
/** Quick like (§22): toggles the hotel in the guest's wishlists (first list, created on demand). */
route("POST", "/me/likes/:hotelId", ({ params }) => {
  const me = requireUser(["GUEST"], { write: true });
  const db = getDb();
  const lists = db.wishlists.filter((w) => w.ownerId === me.id);
  const saved = lists.some((w) => w.hotelIds.includes(params.hotelId));
  if (saved) lists.forEach((w) => (w.hotelIds = w.hotelIds.filter((x) => x !== params.hotelId)));
  else {
    if (!lists.length) { const w: Wishlist = { id: id("wl"), ownerId: me.id, name: "Saved stays", hotelIds: [], privacy: "PRIVATE", collaborators: [], updatedAt: now() }; db.wishlists.push(w); lists.push(w); }
    lists[0].hotelIds.push(params.hotelId); lists[0].updatedAt = now();
  }
  persist(); return { liked: !saved, wishlistName: lists[0]?.name };
});

/* ----------------------------------------------------------- Bookings */
const booking = (bid: string) => getDb().bookings.find((b) => b.id === bid) ?? (() => { throw notFound("Booking"); })();
/** A reservation is visible to its guest, the property's host and admins. */
function myBooking(bid: string, write = false) {
  const me = requireUser(undefined, { write });
  const b = booking(bid);
  if (me.role === "ADMIN" || b.guestId === me.id || b.hostId === me.id) return { b, me };
  throw notFound("Booking");
}
route("GET", "/me/bookings", () => { const me = requireUser(["GUEST"]); return getDb().bookings.filter((b) => b.guestId === me.id).sort((a, b) => b.checkIn.localeCompare(a.checkIn)); });
route("GET", "/bookings/:id", ({ params }) => myBooking(params.id).b);

/** Nights covered by a stay, as calendar dates. */
const stayDates = (checkIn: string, nights: number) => Array.from({ length: nights }, (_, i) => { const d = new Date(`${checkIn}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
/** Adjusts room inventory on the host calendar (−rooms when booked, + when cancelled). */
export function adjustInventory(b: Booking, delta: number) {
  const cal = getDb().calendars[b.roomId] ?? [];
  const dates = new Set(stayDates(b.checkIn, b.nights));
  cal.forEach((d) => { if (dates.has(d.date)) d.available = Math.max(0, d.available + delta); });
}

/** Ensures the guest ↔ host conversation for a property exists and posts an automated message (§34). */
export function systemMessage(b: Booking, text: string) {
  const db = getDb();
  let c = db.conversations.find((x) => x.kind === "HOTEL" && x.guestId === b.guestId && x.hotelId === b.hotelId);
  if (!c) { c = { id: id("c"), kind: "HOTEL", guestId: b.guestId, hostId: b.hostId, hotelId: b.hotelId, bookingId: b.id, createdAt: now(), lastMessage: "", lastAt: now() }; db.conversations.push(c); }
  c.bookingId = b.id;
  const at = after(c.lastAt);
  db.messages.push({ id: id("m"), conversationId: c.id, senderId: "system", text, sentAt: at, read: true });
  c.lastMessage = text; c.lastAt = at;
  return c;
}

/** Live availability for a room and stay (§42): reflects host calendar closures and inventory. */
route("GET", "/hotels/:id/availability", ({ params, query }) => {
  const h = visibleHotel(hotel(params.id));
  const room = h.rooms.find((r) => r.id === query.get("roomId"));
  if (!room) throw notFound("Room");
  const checkIn = query.get("checkIn") ?? "", nights = nightsBetween(checkIn, query.get("checkOut") ?? "");
  const rooms = Number(query.get("rooms") ?? 1);
  const cal = getDb().calendars[room.id] ?? [];
  const blockedDates = stayDates(checkIn, nights).filter((d) => { const c = cal.find((x) => x.date === d); return c && (c.closed || c.available < rooms); });
  return { available: h.available && room.available > 0 && nights > 0 && blockedDates.length === 0, blockedDates, roomsLeft: room.available };
});

route("POST", "/bookings", ({ body }) => {
  const me = requireUser(["GUEST"], { write: true });
  const req = body as CreateBookingRequest;
  const h = hotel(req.hotelId);
  if (!isPublic(h)) throw notFound("Hotel");
  const room = h.rooms.find((r) => r.id === req.roomId);
  const errors: Record<string, string> = {};
  if (!room) errors.roomId = "Room not found";
  const nights = nightsBetween(req.checkIn, req.checkOut);
  if (nights < 1) errors.checkOut = "Check-out must be after check-in";
  if (room && nights && nights < room.minStay) errors.checkOut = `Minimum stay is ${room.minStay} nights`;
  if (room && nights > room.maxStay) errors.checkOut = `Maximum stay is ${room.maxStay} nights`;
  if (room && req.guests.adults + req.guests.children > room.capacity * req.guests.rooms) errors.guests = "Too many guests for the selected rooms";
  if (!/^\S+@\S+\.\S+$/.test(req.guest?.email ?? "")) errors.email = "Enter a valid email address";
  if (!h.available) errors.hotelId = "This hotel is not available for the selected dates";
  if (Object.keys(errors).length) throw invalid(errors);
  // Availability from the host calendar (§42): closed dates or no inventory block the stay.
  const cal = getDb().calendars[room!.id] ?? [];
  const blocked = stayDates(req.checkIn, nights).map((d) => cal.find((c) => c.date === d)).filter((d) => d && (d.closed || d.available < req.guests.rooms));
  if (room!.available === 0 || blocked.length) throw new HttpError(409, "NOT_AVAILABLE", `${room!.name} isn’t available for ${blocked.length ? blocked.map((d) => d!.date).join(", ") : "these dates"}. Choose other dates or another room.`);
  // Duplicate-submission guard: same guest, room and dates still active.
  if (getDb().bookings.some((b) => b.guestId === me.id && b.roomId === room!.id && b.checkIn === req.checkIn && b.checkOut === req.checkOut && ["PENDING", "CONFIRMED"].includes(b.state))) throw new HttpError(409, "DUPLICATE_BOOKING", "You already have this reservation. Open it from Trips.");
  if (req.paymentToken === "tok_decline") throw new HttpError(402, "PAYMENT_DECLINED", "Your bank declined the authorisation. No money was taken.");
  const created: Booking = {
    id: `NZL-${req.checkIn.replace(/-/g, "").slice(2)}-${Math.floor(1000 + Math.random() * 8999)}`,
    hotelId: h.id, roomId: room!.id, guestId: me.id, hostId: h.host.id, guestName: `${req.guest.firstName} ${req.guest.lastName}`.trim(),
    checkIn: req.checkIn, checkOut: req.checkOut, nights, guests: req.guests, state: h.instantBook ? "CONFIRMED" : "PENDING",
    price: computePrice(room!.nightlyPrice, nights, { rooms: req.guests.rooms, longStayPct: h.monthlyDiscountPct }), currency: h.currency,
    payment: { method: req.paymentMethod, status: "AUTHORISED", last4: req.paymentMethod === "CARD_ON_FILE" ? "4242" : undefined },
    specialRequests: req.specialRequests, createdAt: now(),
  };
  const db = getDb();
  db.bookings.unshift(created);
  adjustInventory(created, -created.guests.rooms);
  me.bookings += 1;
  const confirmed = created.state === "CONFIRMED";
  notify(me.id, "BOOKING_CONFIRMATION", `${confirmed ? "Booking confirmed" : "Request sent"} · ${created.id}`, `${h.name} · ${nights} nights`, `/trips/${created.id}`);
  notify(h.host.id, "BOOKING_CONFIRMATION", `${confirmed ? "New booking" : "New booking request"} · ${created.id}`, `${created.guestName} · ${room!.name} · ${created.checkIn} → ${created.checkOut}`, `/host/reservations${confirmed ? "" : "?state=PENDING"}`);
  systemMessage(created, `${confirmed ? "Booking confirmed" : "Booking request"} · ${created.id} · ${room!.name}, ${created.checkIn} → ${created.checkOut}. Reply here to reach ${confirmed ? "the hotel" : "the hotel — it confirms within 24 hours"}.`);
  db.transactions.unshift({ id: id("t"), at: now(), type: "AUTHORISATION", reference: created.id, amount: created.price.total, currency: created.currency, provider: "STRIPE", status: "AUTHORISED" });
  persist();
  return created;
});

route("POST", "/bookings/:id/cancel", ({ params }) => {
  const { b, me } = myBooking(params.id, true);
  if (b.guestId !== me.id) throw new HttpError(403, "FORBIDDEN", "Only the guest can cancel from Trips");
  if (!["PENDING", "CONFIRMED"].includes(b.state)) throw new HttpError(409, "INVALID_STATE", "Only upcoming reservations can be cancelled");
  const h = hotel(b.hotelId);
  const room = h.rooms.find((r) => r.id === b.roomId)!;
  const pct = refundPct(room.cancellationPolicy, daysUntil(b.checkIn));
  const refundAmount = Math.round((b.price.total * pct) / 100);
  b.state = refundAmount > 0 ? "REFUNDED" : "CANCELLED";
  b.refundAmount = refundAmount;
  b.payment.status = pct === 100 ? "REFUNDED" : pct > 0 ? "PARTIALLY_REFUNDED" : b.payment.status;
  adjustInventory(b, b.guests.rooms);
  notify(b.guestId, "CANCELLATION", `Reservation cancelled · ${b.id}`, refundAmount ? `Refund of ${b.currency} ${refundAmount.toLocaleString()} to your original payment method` : "No refund under the hotel’s policy", `/trips/${b.id}`);
  notify(b.hostId, "CANCELLATION", `Guest cancelled · ${b.id}`, `${b.guestName} · ${b.checkIn} → ${b.checkOut} · rooms released`, `/host/reservations`);
  systemMessage(b, `Reservation ${b.id} was cancelled by the guest.`);
  if (refundAmount) getDb().transactions.unshift({ id: id("t"), at: now(), type: pct === 100 ? "REFUND" : "PARTIAL_REFUND", reference: b.id, amount: -refundAmount, currency: b.currency, provider: "STRIPE", status: "PAID" });
  persist();
  return { booking: b, refundAmount, refundPct: pct };
});

route("POST", "/bookings/:id/change-requests", ({ params, body }) => {
  const { b, me } = myBooking(params.id, true);
  if (b.guestId !== me.id) throw new HttpError(403, "FORBIDDEN", "Only the guest can request changes");
  if (!["PENDING", "CONFIRMED"].includes(b.state)) throw new HttpError(409, "INVALID_STATE", "Changes can only be requested for upcoming stays");
  const req = body as { kind: string; checkIn?: string; checkOut?: string; guests?: { adults?: number; children?: number }; message?: string };
  if (req.kind === "DATES" && nightsBetween(req.checkIn, req.checkOut) < 1) throw invalid({ checkOut: "Check-out must be after check-in" });
  const what = req.kind === "DATES" ? `new dates ${req.checkIn} → ${req.checkOut}` : `${(req.guests?.adults ?? 0) + (req.guests?.children ?? 0)} guests`;
  notify(b.guestId, "RESERVATION_CHANGE", `Change request sent · ${b.id}`, "The hotel will approve or decline within 24 hours", `/trips/${b.id}`);
  notify(b.hostId, "RESERVATION_CHANGE", `Change requested · ${b.id}`, `${b.guestName} asks for ${what}`, `/host/reservations`);
  systemMessage(b, `Change request for ${b.id}: ${what}.${req.message ? ` Guest note: “${req.message}”` : ""}`);
  persist();
  return { status: "REQUESTED" };
});

route("POST", "/bookings/:id/review", ({ params, body }) => {
  const { b, me } = myBooking(params.id, true);
  if (b.guestId !== me.id) throw new HttpError(403, "FORBIDDEN", "Only the guest who stayed can review");
  if (b.state !== "COMPLETED") throw new HttpError(403, "NOT_ELIGIBLE", "Only completed stays booked through Nuzul can be reviewed (Verified Stay).");
  if (b.reviewed) throw new HttpError(409, "ALREADY_REVIEWED", "You have already reviewed this stay");
  const r = body as { categories: Review["categories"]; text: string };
  if ((r.text ?? "").trim().length < 30) throw invalid({ text: "Write at least 30 characters" });
  const vals = Object.values(r.categories ?? {});
  if (vals.length < 6 || vals.some((v) => !(v >= 1 && v <= 5))) throw invalid({ categories: "Rate all six categories from 1 to 5" });
  const author = `${me.name.split(" ")[0]} ${me.name.split(" ")[1]?.[0] ?? ""}.`.replace(" .", "");
  const review: Review = { id: id("rv"), hotelId: b.hotelId, bookingId: b.id, authorId: me.id, author, country: me.city || "—", tripType: b.guests.children ? "Family" : b.guests.adults > 2 ? "Group" : b.guests.adults === 2 ? "Couple" : "Solo", createdAt: now(), overall: Math.round((vals.reduce((a, c) => a + c, 0) / vals.length) * 10) / 10, categories: r.categories, text: r.text.trim(), verifiedStay: true, relevance: 70, moderation: "PUBLISHED" };
  getDb().reviews.unshift(review);
  const h = hotel(b.hotelId);
  h.reviewCount += 1;
  b.reviewed = true;
  notify(b.hostId, "REVIEW_REMINDER", `New verified review · ${h.name}`, `${author} rated their stay ${review.overall}/5`, "/host/reviews");
  persist();
  return review;
});
