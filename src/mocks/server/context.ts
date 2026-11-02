/* Request identity and cross-role side effects for the mock backend.
 * MOCK AUTH: the token is "mock.<userId>" — it identifies a demo account, it is not a secure credential. */
import type { AppNotification, NotificationType, Role, User } from "@/types/models";
import { defaultPrefs, getDb } from "./db";
import { HttpError, requestToken } from "./router";

export const tokenFor = (userId: string) => `mock.${userId}`;
export const now = () => new Date().toISOString();
/** A timestamp that sorts after `after` — keeps threads ordered even when seed data is dated later than the clock. */
export const after = (prev?: string) => { const n = now(); return prev && prev >= n ? new Date(Date.parse(prev) + 1000).toISOString() : n; };
export const newId = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;

/** The signed-in user for this request, or null for a visitor. */
export function currentUser(): User | null {
  const t = requestToken();
  if (!t?.startsWith("mock.")) return null;
  return getDb().users.find((u) => u.id === t.slice(5)) ?? null;
}

/** 401 for visitors, 403 for the wrong role, 403 ACCOUNT_SUSPENDED for writes by suspended accounts. */
export function requireUser(roles?: Role[], opts: { write?: boolean } = {}): User {
  const u = currentUser();
  if (!u) throw new HttpError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  if (roles && !roles.includes(u.role)) throw new HttpError(403, "FORBIDDEN", `This action needs a ${roles.map((r) => r.toLowerCase()).join(" or ")} account.`);
  if (opts.write && u.status === "SUSPENDED") throw new HttpError(403, "ACCOUNT_SUSPENDED", "Your account is suspended. You can view your data but can’t make changes. Contact Nuzul Support.");
  return u;
}

export const userById = (id: string) => getDb().users.find((u) => u.id === id);
export const admins = () => getDb().users.filter((u) => u.role === "ADMIN");

/** Creates an in-app notification for a real recipient, honouring their channel preferences. */
export function notify(recipientId: string, type: NotificationType, title: string, body: string, link?: string) {
  const db = getDb();
  const prefs = db.notificationPrefs[recipientId] ?? defaultPrefs();
  const channels = prefs[type] ?? ["IN_APP"];
  if (!channels.includes("IN_APP")) return; // email/push only — delivered by the (not connected) notification service
  const n: AppNotification = { id: newId("n"), recipientId, type, title, body, link, createdAt: now(), read: false, channels };
  db.notifications.unshift(n);
}

export const audit = (action: string) => {
  const actor = currentUser()?.name ?? "System";
  getDb().audit.unshift({ at: now(), actor, action });
};

/** Public visibility rule: live listing whose host account is active (§50–51). */
export function isPublic(h: { status: string; host: { id: string } }) {
  return h.status === "LIVE" && userById(h.host.id)?.status !== "SUSPENDED";
}
