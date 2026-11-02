/* Endpoints shared by every role: account (/me), Match Profile, messaging, notifications, auth, analytics, demo reset.
 * MOCK AUTH ONLY — tokens name a demo account; there is no password storage or real security here. */
import type { ConversationRecord, Message, NotificationPrefs, User } from "@/types/models";
import { DEFAULT_PROFILE, type MatchProfile } from "@/lib/match-engine";
import { defaultPrefs, getDb, persist, resetDb } from "./db";
import { HttpError, invalid, notFound, route } from "./router";
import { admins, currentUser, newId, notify, now, after, requireUser, tokenFor, userById } from "./context";
import { profileKey } from "./handlers-guest";

/* ----------------------------------------------------------------- Me */
route("GET", "/me", () => requireUser());
route("PATCH", "/me", ({ body }) => {
  const u = requireUser(undefined, { write: true });
  const patch = body as Partial<User>;
  const e: Record<string, string> = {};
  if (patch.name !== undefined && !patch.name.trim()) e.name = "Name is required";
  if (patch.email !== undefined && !/^\S+@\S+\.\S+$/.test(patch.email)) e.email = "Enter a valid email address";
  if (patch.email && getDb().users.some((x) => x.email === patch.email && x.id !== u.id)) e.email = "Another account uses this email";
  if (patch.phone !== undefined && patch.phone.replace(/\D/g, "").length < 8) e.phone = "Enter a valid phone number";
  if (Object.keys(e).length) throw invalid(e);
  Object.assign(u, { name: patch.name?.trim() ?? u.name, email: patch.email ?? u.email, phone: patch.phone ?? u.phone, city: patch.city ?? u.city });
  // Hosts' public name follows their account name on every listing they own.
  if (u.role === "HOST") getDb().hotels.filter((h) => h.host.id === u.id).forEach((h) => (h.host.name = u.name));
  persist(); return u;
});
route("GET", "/me/reviews", () => { const me = requireUser(["GUEST"]); return getDb().reviews.filter((r) => r.authorId === me.id); });

/* ------------------------------------------- Match Profile (visitors too) */
route("GET", "/me/match-profile", () => getDb().profiles[profileKey()] ?? { ...DEFAULT_PROFILE, saved: false });
route("PUT", "/me/match-profile", ({ body }) => {
  if (currentUser()?.status === "SUSPENDED") throw new HttpError(403, "ACCOUNT_SUSPENDED", "Your account is suspended.");
  const db = getDb(); const k = profileKey();
  db.profiles[k] = { ...(db.profiles[k] ?? DEFAULT_PROFILE), ...(body as Partial<MatchProfile>) };
  persist(); return db.profiles[k];
});
route("POST", "/me/match-profile/reset", () => {
  const db = getDb(); const k = profileKey();
  db.profiles[k] = { ...DEFAULT_PROFILE, priorities: [], atmosphere: [], facilities: [], saved: false };
  persist(); return db.profiles[k];
});

/* ---------------------------------------------------------- Messaging */
const SUPPORT_NAME = "Nuzul Support";
function view(c: ConversationRecord, meId: string) {
  const db = getDb();
  const guestSide = c.guestId === meId;
  const otherId = guestSide ? c.hostId : c.guestId;
  const other = userById(otherId);
  const hotel = c.hotelId ? db.hotels.find((h) => h.id === c.hotelId) : undefined;
  const title = c.kind === "SUPPORT" ? (guestSide ? SUPPORT_NAME : other?.name ?? "Guest") : guestSide ? hotel?.name ?? other?.name ?? "Host" : other?.name ?? "Guest";
  const responseTime = c.kind === "SUPPORT" ? "Support · replies within 2 hours" : guestSide ? `Typically replies ${hotel?.host.responseTime ?? "within a day"}` : hotel ? `${hotel.name}${c.bookingId ? ` · ${c.bookingId}` : ""}` : "Enquiry";
  const unread = db.messages.filter((m) => m.conversationId === c.id && m.senderId !== meId && m.senderId !== "system" && !m.read).length;
  return { ...c, title, counterpartId: otherId, counterpartName: c.kind === "SUPPORT" && guestSide ? SUPPORT_NAME : other?.name ?? "", responseTime, unread };
}
function conversation(cid: string) {
  const me = requireUser();
  const c = getDb().conversations.find((x) => x.id === cid && (x.guestId === me.id || x.hostId === me.id));
  if (!c) throw notFound("Conversation");
  return { c, me };
}
route("GET", "/conversations", () => {
  const me = requireUser();
  return getDb().conversations.filter((c) => c.guestId === me.id || c.hostId === me.id).sort((a, b) => b.lastAt.localeCompare(a.lastAt)).map((c) => view(c, me.id));
});
/** Start (or reopen) a conversation: guest → a property's host, or anyone → Nuzul Support. */
route("POST", "/conversations", ({ body }) => {
  const me = requireUser(["GUEST", "HOST"], { write: true });
  const { hotelId, bookingId, kind } = body as { hotelId?: string; bookingId?: string; kind?: "HOTEL" | "SUPPORT" };
  const db = getDb();
  if (kind === "SUPPORT") {
    const support = admins()[0];
    let c = db.conversations.find((x) => x.kind === "SUPPORT" && x.guestId === me.id);
    if (!c) { c = { id: newId("c"), kind: "SUPPORT", guestId: me.id, hostId: support.id, createdAt: now(), lastMessage: "", lastAt: now() }; db.conversations.push(c); }
    persist(); return view(c, me.id);
  }
  if (me.role !== "GUEST") throw new HttpError(403, "FORBIDDEN", "Only guests can contact a property");
  const h = db.hotels.find((x) => x.id === hotelId);
  if (!h) throw notFound("Hotel");
  let c = db.conversations.find((x) => x.kind === "HOTEL" && x.guestId === me.id && x.hotelId === h.id);
  if (!c) { c = { id: newId("c"), kind: "HOTEL", guestId: me.id, hostId: h.host.id, hotelId: h.id, bookingId, createdAt: now(), lastMessage: "", lastAt: now() }; db.conversations.push(c); }
  persist(); return view(c, me.id);
});
route("GET", "/conversations/:id/messages", ({ params }) => { const { c } = conversation(params.id); return getDb().messages.filter((m) => m.conversationId === c.id).sort((a, b) => a.sentAt.localeCompare(b.sentAt)); });
route("POST", "/conversations/:id/messages", ({ params, body }) => {
  const { c, me } = conversation(params.id);
  if (me.status === "SUSPENDED") throw new HttpError(403, "ACCOUNT_SUSPENDED", "Your account is suspended. You can read messages but not send them.");
  const { text } = body as { text: string };
  if (!text?.trim()) throw invalid({ text: "Message can’t be empty" });
  if (text.length > 2000) throw invalid({ text: "Messages are limited to 2,000 characters" });
  const db = getDb();
  const m: Message = { id: newId("m"), conversationId: c.id, senderId: me.id, text: text.trim(), sentAt: after(c.lastAt), read: false };
  db.messages.push(m);
  c.lastMessage = m.text!; c.lastAt = m.sentAt;
  const recipient = c.guestId === me.id ? c.hostId : c.guestId;
  const recipientUser = userById(recipient);
  const link = recipientUser?.role === "HOST" ? `/host/messages/${c.id}` : recipientUser?.role === "ADMIN" ? `/admin/messages/${c.id}` : `/messages/${c.id}`;
  notify(recipient, "MESSAGE", `New message from ${view(c, recipient).counterpartName || me.name}`, `“${m.text!.slice(0, 80)}${m.text!.length > 80 ? "…" : ""}”`, link);
  persist();
  return m;
});
route("POST", "/messages/:id/unsend", ({ params }) => {
  const me = requireUser(undefined, { write: true });
  const m = getDb().messages.find((x) => x.id === params.id);
  if (!m) throw notFound("Message");
  if (m.senderId !== me.id) throw new HttpError(403, "FORBIDDEN", "You can only unsend your own messages");
  m.unsent = true; persist(); return m;
});
route("POST", "/conversations/:id/read", ({ params }) => {
  const { c, me } = conversation(params.id);
  getDb().messages.filter((m) => m.conversationId === c.id && m.senderId !== me.id).forEach((m) => (m.read = true));
  persist(); return { ok: true };
});

/* ------------------------------------------------------ Notifications */
route("GET", "/me/notifications", () => { const me = requireUser(); return getDb().notifications.filter((n) => n.recipientId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); });
route("POST", "/me/notifications/read-all", () => { const me = requireUser(); getDb().notifications.forEach((n) => { if (n.recipientId === me.id) n.read = true; }); persist(); return { ok: true }; });
route("POST", "/me/notifications/:id/read", ({ params }) => { const me = requireUser(); const n = getDb().notifications.find((x) => x.id === params.id && x.recipientId === me.id); if (!n) throw notFound("Notification"); n.read = true; persist(); return n; });
route("GET", "/me/notification-preferences", () => { const me = requireUser(); return getDb().notificationPrefs[me.id] ?? defaultPrefs(); });
route("PUT", "/me/notification-preferences", ({ body }) => { const me = requireUser(undefined, { write: true }); getDb().notificationPrefs[me.id] = body as NotificationPrefs; persist(); return getDb().notificationPrefs[me.id]; });

/* --------------------------------------------------------------- Auth */
const emailOk = (e?: string) => /^\S+@\S+\.\S+$/.test(e ?? "");
const session = (u: User) => ({ token: tokenFor(u.id), user: u });
/** Demo accounts surfaced on the sign-in page. */
route("GET", "/auth/demo-accounts", () => ["u-nadia", "host-rixos", "u-admin"].map((i) => userById(i)).filter(Boolean).map((u) => ({ id: u!.id, name: u!.name, email: u!.email, role: u!.role, status: u!.status })));
route("POST", "/auth/login", ({ body }) => {
  const { email, password } = body as { email: string; password: string };
  const e: Record<string, string> = {};
  if (!emailOk(email)) e.email = "Enter a valid email address";
  if ((password ?? "").length < 8) e.password = "Password must be at least 8 characters";
  if (Object.keys(e).length) throw invalid(e);
  const u = getDb().users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!u || password === "wrongpassword") throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  if (u.status === "SUSPENDED") throw new HttpError(403, "ACCOUNT_SUSPENDED", `This account is suspended${u.statusReason ? `: ${u.statusReason}` : ""}. Contact Nuzul Support.`);
  return session(u);
});
route("POST", "/auth/register", ({ body }) => {
  const { email, password, name, role } = body as { email: string; password: string; name: string; role: "GUEST" | "HOST" };
  const e: Record<string, string> = {};
  if (!name?.trim()) e.name = "Enter your name";
  if (!emailOk(email)) e.email = "Enter a valid email address";
  if ((password ?? "").length < 8) e.password = "Password must be at least 8 characters";
  if (getDb().users.some((u) => u.email.toLowerCase() === (email ?? "").toLowerCase())) e.email = "An account with this email already exists";
  if (!["GUEST", "HOST"].includes(role)) e.role = "Choose Guest or Host";
  if (Object.keys(e).length) throw invalid(e);
  const u: User = { id: newId(role === "HOST" ? "host" : "u"), name: name.trim(), email: email.trim(), phone: "", role, status: "ACTIVE", verification: "PENDING", joinedAt: now().slice(0, 10), city: "", bookings: 0 };
  getDb().users.push(u);
  admins().forEach((a) => notify(a.id, "RESERVATION_CHANGE", `New ${role.toLowerCase()} account`, `${u.name} · ${u.email}`, "/admin/users"));
  persist();
  return { status: "VERIFICATION_SENT", email: u.email };
});
route("POST", "/auth/verify-email", ({ body }) => {
  const { code, email } = body as { code: string; email: string };
  if (!/^\d{6}$/.test(code ?? "")) throw invalid({ code: "Enter the 6-digit code from your email" });
  if (code === "000000") throw new HttpError(400, "CODE_EXPIRED", "This code has expired. Request a new one.");
  const u = getDb().users.find((x) => x.email === email);
  if (!u) throw notFound("Account");
  u.verification = "VERIFIED";
  persist();
  return session(u);
});
route("POST", "/auth/forgot-password", ({ body }) => {
  const { email } = body as { email: string };
  if (!emailOk(email)) throw invalid({ email: "Enter a valid email address" });
  // Always succeed so the response doesn't reveal which emails have accounts.
  return { status: "SENT", demoResetToken: `reset.${btoa(email)}` };
});
route("POST", "/auth/reset-password", ({ body }) => {
  const { token, password, confirm } = body as { token: string; password: string; confirm: string };
  const e: Record<string, string> = {};
  if ((password ?? "").length < 8) e.password = "Password must be at least 8 characters";
  if (password !== confirm) e.confirm = "Passwords don’t match";
  if (Object.keys(e).length) throw invalid(e);
  let email = "";
  try { email = atob((token ?? "").replace(/^reset\./, "")); } catch { /* invalid */ }
  if (!token?.startsWith("reset.") || !emailOk(email)) throw new HttpError(400, "INVALID_TOKEN", "This reset link is invalid or has expired. Request a new one.");
  return { status: "PASSWORD_RESET", email };
});

/* --------------------------------------------- Analytics & demo utilities */
route("POST", "/events", ({ body }) => { const db = getDb(); db.analytics.unshift({ ...(body as { event: string; props: unknown; at: string }), userId: currentUser()?.id }); db.analytics.length = Math.min(db.analytics.length, 300); persist(); return { ok: true }; });
route("GET", "/events", () => { requireUser(["ADMIN"]); return getDb().analytics; });
/** Restores the seed dataset for every role (demo only). */
route("POST", "/demo/reset", () => { resetDb(); return { ok: true }; });
