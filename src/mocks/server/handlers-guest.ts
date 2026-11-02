/* Guest-facing mock endpoints: catalog, hotels, search, reviews, me/*, bookings, messaging, notifications, auth. */
import type { Booking, Hotel, Message, Review, Wishlist } from "@/types/models";
import type { CreateBookingRequest, SortKey } from "@/types/api";
import { computeMatch, DEFAULT_PROFILE } from "@/lib/match-engine";
import { computePrice, refundPct } from "@/lib/pricing";
import { toEGP } from "@/lib/currency";
import { daysUntil, nightsBetween } from "@/lib/dates";
import { CURRENT_GUEST_ID, searchIndexSeed } from "../seed";
import { destinations } from "../hotels";
import { getDb, persist } from "./db";
import { HttpError, invalid, notFound, paginate, route } from "./router";

const withMatch = (h: Hotel) => { const db = getDb(); return { ...h, match: computeMatch(h, db.profile, db.matchConfig) }; };
const live = () => getDb().hotels.filter((h) => h.status === "LIVE");
const hotel = (id: string) => getDb().hotels.find((h) => h.id === id) ?? (() => { throw notFound("Hotel"); })();
const now = () => new Date().toISOString();
const id = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
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
  const h = getDb().hotels.find((x) => x.slug === query.get("slug"));
  if (!h) throw notFound("Hotel");
  return withMatch(h);
});
route("GET", "/hotels/:id", ({ params }) => withMatch(hotel(params.id)));
route("POST", "/hotels/compare", ({ body }) => ((body as { ids: string[] }).ids ?? []).map((i) => withMatch(hotel(i))));

route("GET", "/hotels/:id/flexible-dates", ({ params, query }) => {
  const h = withMatch(hotel(params.id));
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

/* ----------------------------------------------------------------- Me */
route("GET", "/me", () => getDb().users.find((u) => u.id === CURRENT_GUEST_ID));
route("PATCH", "/me", ({ body }) => {
  const u = getDb().users.find((x) => x.id === CURRENT_GUEST_ID)!;
  const patch = body as Partial<typeof u>;
  const e: Record<string, string> = {};
  if (patch.name !== undefined && !patch.name.trim()) e.name = "Name is required";
  if (patch.email !== undefined && !/^\S+@\S+\.\S+$/.test(patch.email)) e.email = "Enter a valid email address";
  if (patch.phone !== undefined && patch.phone.replace(/\D/g, "").length < 8) e.phone = "Enter a valid phone number";
  if (Object.keys(e).length) throw invalid(e);
  Object.assign(u, { name: patch.name ?? u.name, email: patch.email ?? u.email, phone: patch.phone ?? u.phone, city: patch.city ?? u.city });
  persist(); return u;
});
route("GET", "/me/reviews", () => {
  const db = getDb();
  const mine = new Set(db.bookings.filter((b) => b.guestId === CURRENT_GUEST_ID).map((b) => b.id));
  return db.reviews.filter((r) => r.bookingId && mine.has(r.bookingId));
});
route("GET", "/me/match-profile", () => getDb().profile);
route("PUT", "/me/match-profile", ({ body }) => { const db = getDb(); db.profile = { ...db.profile, ...(body as object) }; persist(); return db.profile; });
route("POST", "/me/match-profile/reset", () => { const db = getDb(); db.profile = { ...DEFAULT_PROFILE, priorities: [], atmosphere: [], facilities: [], saved: false }; persist(); return db.profile; });

/* ---------------------------------------------------------- Wishlists */
const wl = (wid: string) => getDb().wishlists.find((w) => w.id === wid) ?? (() => { throw notFound("Wishlist"); })();
route("GET", "/me/wishlists", () => getDb().wishlists);
route("POST", "/me/wishlists", ({ body }) => {
  const { name } = body as { name: string };
  if (!name?.trim()) throw invalid({ name: "Name is required" });
  if (name.length > 50) throw invalid({ name: "Use 50 characters or fewer" });
  const w: Wishlist = { id: id("wl"), name: name.trim(), hotelIds: [], privacy: "PRIVATE", collaborators: [], updatedAt: now() };
  getDb().wishlists.push(w); persist(); return w;
});
route("PATCH", "/me/wishlists/:id", ({ params, body }) => { const w = wl(params.id); Object.assign(w, body, { updatedAt: now() }); persist(); return w; });
route("DELETE", "/me/wishlists/:id", ({ params }) => { const db = getDb(); db.wishlists = db.wishlists.filter((w) => w.id !== params.id); persist(); return { ok: true }; });
route("POST", "/me/wishlists/:id/items", ({ params, body }) => { const w = wl(params.id); const { hotelId } = body as { hotelId: string }; if (!w.hotelIds.includes(hotelId)) w.hotelIds.push(hotelId); w.updatedAt = now(); persist(); return w; });
route("DELETE", "/me/wishlists/:id/items/:hotelId", ({ params }) => { const w = wl(params.id); w.hotelIds = w.hotelIds.filter((x) => x !== params.hotelId); persist(); return w; });
route("POST", "/me/wishlists/:id/move", ({ params, body }) => {
  const { hotelId, toId } = body as { hotelId: string; toId: string };
  const from = wl(params.id), to = wl(toId);
  from.hotelIds = from.hotelIds.filter((x) => x !== hotelId);
  if (!to.hotelIds.includes(hotelId)) to.hotelIds.push(hotelId);
  persist(); return { from, to };
});
route("POST", "/me/wishlists/:id/collaborators", ({ params, body }) => {
  const { email } = body as { email: string };
  if (!/^\S+@\S+\.\S+$/.test(email ?? "")) throw invalid({ email: "Enter a valid email address" });
  const w = wl(params.id); w.collaborators.push(email.split("@")[0]); w.privacy = "SHARED"; persist(); return w;
});
/** Quick like (§22): toggles the hotel in the guest's first wishlist. */
route("POST", "/me/likes/:hotelId", ({ params }) => {
  const db = getDb();
  const saved = db.wishlists.some((w) => w.hotelIds.includes(params.hotelId));
  if (saved) db.wishlists.forEach((w) => (w.hotelIds = w.hotelIds.filter((x) => x !== params.hotelId)));
  else {
    if (!db.wishlists.length) db.wishlists.push({ id: id("wl"), name: "Saved stays", hotelIds: [], privacy: "PRIVATE", collaborators: [], updatedAt: now() });
    db.wishlists[0].hotelIds.push(params.hotelId);
  }
  persist(); return { liked: !saved, wishlistName: db.wishlists[0]?.name };
});

/* ----------------------------------------------------------- Bookings */
const booking = (bid: string) => getDb().bookings.find((b) => b.id === bid) ?? (() => { throw notFound("Booking"); })();
route("GET", "/me/bookings", () => getDb().bookings.filter((b) => b.guestId === CURRENT_GUEST_ID).sort((a, b) => b.checkIn.localeCompare(a.checkIn)));
route("GET", "/bookings/:id", ({ params }) => booking(params.id));

route("POST", "/bookings", ({ body }) => {
  const req = body as CreateBookingRequest;
  const h = hotel(req.hotelId);
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
  if (req.paymentToken === "tok_decline") throw new HttpError(402, "PAYMENT_DECLINED", "Your bank declined the authorisation. No money was taken.");
  const created: Booking = {
    id: `NZL-${req.checkIn.replace(/-/g, "").slice(2)}-${Math.floor(1000 + Math.random() * 8999)}`,
    hotelId: h.id, roomId: room!.id, guestId: CURRENT_GUEST_ID, guestName: `${req.guest.firstName} ${req.guest.lastName}`.trim(),
    checkIn: req.checkIn, checkOut: req.checkOut, nights, guests: req.guests, state: h.instantBook ? "CONFIRMED" : "PENDING",
    price: computePrice(room!.nightlyPrice, nights, { rooms: req.guests.rooms, longStayPct: h.monthlyDiscountPct }), currency: h.currency,
    payment: { method: req.paymentMethod, status: "AUTHORISED", last4: req.paymentMethod === "CARD_ON_FILE" ? "4242" : undefined },
    specialRequests: req.specialRequests, createdAt: now(),
  };
  const db = getDb();
  db.bookings.unshift(created);
  db.notifications.unshift({ id: id("n"), type: "BOOKING_CONFIRMATION", title: `${created.state === "CONFIRMED" ? "Booking confirmed" : "Request sent"} · ${created.id}`, body: `${h.name} · ${nights} nights`, createdAt: now(), read: false, channels: ["IN_APP", "EMAIL"], link: `/trips/${created.id}` });
  db.transactions.unshift({ id: id("t"), at: now(), type: "AUTHORISATION", reference: created.id, amount: created.price.total, currency: created.currency, provider: "STRIPE", status: "AUTHORISED" });
  persist();
  return created;
});

route("POST", "/bookings/:id/cancel", ({ params }) => {
  const b = booking(params.id);
  if (!["PENDING", "CONFIRMED"].includes(b.state)) throw new HttpError(409, "INVALID_STATE", "Only upcoming reservations can be cancelled");
  const h = hotel(b.hotelId);
  const room = h.rooms.find((r) => r.id === b.roomId)!;
  const pct = refundPct(room.cancellationPolicy, daysUntil(b.checkIn));
  const refundAmount = Math.round((b.price.total * pct) / 100);
  b.state = refundAmount > 0 ? "REFUNDED" : "CANCELLED";
  b.refundAmount = refundAmount;
  b.payment.status = pct === 100 ? "REFUNDED" : pct > 0 ? "PARTIALLY_REFUNDED" : b.payment.status;
  getDb().notifications.unshift({ id: id("n"), type: "CANCELLATION", title: `Reservation cancelled · ${b.id}`, body: refundAmount ? `Refund of ${b.currency} ${refundAmount.toLocaleString()} to your original payment method` : "No refund under the hotel’s policy", createdAt: now(), read: false, channels: ["IN_APP", "EMAIL"], link: `/trips/${b.id}` });
  persist();
  return { booking: b, refundAmount, refundPct: pct };
});

route("POST", "/bookings/:id/change-requests", ({ params, body }) => {
  const b = booking(params.id);
  const req = body as { kind: string; checkIn?: string; checkOut?: string };
  if (req.kind === "DATES" && nightsBetween(req.checkIn, req.checkOut) < 1) throw invalid({ checkOut: "Check-out must be after check-in" });
  getDb().notifications.unshift({ id: id("n"), type: "RESERVATION_CHANGE", title: `Change request sent · ${b.id}`, body: "The hotel will approve or decline within 24 hours", createdAt: now(), read: false, channels: ["IN_APP", "EMAIL"], link: `/trips/${b.id}` });
  persist();
  return { status: "REQUESTED" };
});

route("POST", "/bookings/:id/review", ({ params, body }) => {
  const b = booking(params.id);
  if (b.state !== "COMPLETED") throw new HttpError(403, "NOT_ELIGIBLE", "Only completed stays booked through Nuzul can be reviewed (Verified Stay).");
  if (b.reviewed) throw new HttpError(409, "ALREADY_REVIEWED", "You have already reviewed this stay");
  const r = body as { categories: Review["categories"]; text: string };
  if ((r.text ?? "").trim().length < 30) throw invalid({ text: "Write at least 30 characters" });
  const vals = Object.values(r.categories);
  const review: Review = { id: id("rv"), hotelId: b.hotelId, bookingId: b.id, author: "Nadia A.", country: "Egypt", tripType: "Couple", createdAt: now(), overall: Math.round((vals.reduce((a, c) => a + c, 0) / vals.length) * 10) / 10, categories: r.categories, text: r.text, verifiedStay: true, relevance: 70, moderation: "PUBLISHED" };
  getDb().reviews.unshift(review);
  b.reviewed = true;
  persist();
  return review;
});

/* ---------------------------------------------------------- Messaging */
route("GET", "/me/conversations", () => [...getDb().conversations].sort((a, b) => b.lastAt.localeCompare(a.lastAt)));
route("GET", "/conversations/:id/messages", ({ params }) => getDb().messages.filter((m) => m.conversationId === params.id).sort((a, b) => a.sentAt.localeCompare(b.sentAt)));
route("POST", "/conversations/:id/messages", ({ params, body }) => {
  const { text } = body as { text: string };
  if (!text?.trim()) throw invalid({ text: "Message can’t be empty" });
  if (text.length > 2000) throw invalid({ text: "Messages are limited to 2,000 characters" });
  const db = getDb();
  const c = db.conversations.find((x) => x.id === params.id);
  if (!c) throw notFound("Conversation");
  const m: Message = { id: id("m"), conversationId: c.id, from: "GUEST", text: text.trim(), sentAt: now(), read: false };
  db.messages.push(m);
  c.lastMessage = m.text!; c.lastAt = m.sentAt;
  persist();
  return m;
});
route("POST", "/messages/:id/unsend", ({ params }) => { const m = getDb().messages.find((x) => x.id === params.id); if (!m) throw notFound("Message"); if (m.from !== "GUEST") throw new HttpError(403, "FORBIDDEN", "You can only unsend your own messages"); m.unsent = true; persist(); return m; });
route("POST", "/conversations/:id/read", ({ params }) => { const db = getDb(); const c = db.conversations.find((x) => x.id === params.id); if (c) c.unread = 0; db.messages.filter((m) => m.conversationId === params.id).forEach((m) => (m.read = true)); persist(); return { ok: true }; });

/* ------------------------------------------------------ Notifications */
route("GET", "/me/notifications", () => [...getDb().notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
route("POST", "/me/notifications/read-all", () => { getDb().notifications.forEach((n) => (n.read = true)); persist(); return { ok: true }; });
route("POST", "/me/notifications/:id/read", ({ params }) => { const n = getDb().notifications.find((x) => x.id === params.id); if (n) n.read = true; persist(); return n; });
route("GET", "/me/notification-preferences", () => getDb().notificationPrefs);
route("PUT", "/me/notification-preferences", ({ body }) => { getDb().notificationPrefs = body as never; persist(); return getDb().notificationPrefs; });

/* --------------------------------------------------------------- Auth */
const sessionFor = (email: string, role: string) => ({ token: "mock-session-token", user: { ...(getDb().users.find((u) => u.email === email) ?? getDb().users.find((u) => u.role === role)!), role } });
route("POST", "/auth/login", ({ body }) => {
  const { email, password, role } = body as { email: string; password: string; role: string };
  const e: Record<string, string> = {};
  if (!/^\S+@\S+\.\S+$/.test(email ?? "")) e.email = "Enter a valid email address";
  if ((password ?? "").length < 8) e.password = "Password must be at least 8 characters";
  if (Object.keys(e).length) throw invalid(e);
  if (password === "wrongpassword") throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  return sessionFor(email, role ?? "GUEST");
});
route("POST", "/auth/register", ({ body }) => {
  const { email, password, name } = body as { email: string; password: string; name: string };
  const e: Record<string, string> = {};
  if (!name?.trim()) e.name = "Enter your name";
  if (!/^\S+@\S+\.\S+$/.test(email ?? "")) e.email = "Enter a valid email address";
  if ((password ?? "").length < 8) e.password = "Password must be at least 8 characters";
  if (getDb().users.some((u) => u.email === email)) e.email = "An account with this email already exists";
  if (Object.keys(e).length) throw invalid(e);
  return { status: "VERIFICATION_SENT", email };
});
route("POST", "/auth/forgot-password", () => ({ status: "SENT" }));
route("POST", "/auth/verify-email", ({ body }) => {
  const { code } = body as { code: string };
  if (!/^\d{6}$/.test(code ?? "")) throw invalid({ code: "Enter the 6-digit code from your email" });
  if (code === "000000") throw new HttpError(400, "CODE_EXPIRED", "This code has expired. Request a new one.");
  return { status: "VERIFIED" };
});
