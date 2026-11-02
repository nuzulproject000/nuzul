import type { AppNotification, Review, Booking, Conversation, Message, NotificationPrefs, User, Wishlist } from "@/types/models";
import type { CancelBookingResponse, ChangeRequest, CreateBookingRequest, Session } from "@/types/api";
import type { MatchConfig, MatchProfile } from "@/lib/match-engine";
import type { Question } from "./questions";
import { api, unwrap } from "./api-client";

export const meService = {
  get: () => unwrap<User>(api.get("/me")),
  update: (patch: Partial<Pick<User, "name" | "email" | "phone" | "city">>) => unwrap<User>(api.patch("/me", patch)),
  reviews: () => unwrap<Review[]>(api.get("/me/reviews")),
  profile: () => unwrap<MatchProfile>(api.get("/me/match-profile")),
  saveProfile: (p: Partial<MatchProfile>) => unwrap<MatchProfile>(api.put("/me/match-profile", p)),
  resetProfile: () => unwrap<MatchProfile>(api.post("/me/match-profile/reset")),
};

export const matchService = {
  questions: () => unwrap<Question[]>(api.get("/match/questions")),
  config: () => unwrap<MatchConfig>(api.get("/match/config")),
};

export const wishlistService = {
  list: () => unwrap<Wishlist[]>(api.get("/me/wishlists")),
  create: (name: string) => unwrap<Wishlist>(api.post("/me/wishlists", { name })),
  update: (id: string, patch: Partial<Pick<Wishlist, "name" | "privacy" | "dates">>) => unwrap<Wishlist>(api.patch(`/me/wishlists/${id}`, patch)),
  remove: (id: string) => unwrap<{ ok: true }>(api.delete(`/me/wishlists/${id}`)),
  addItem: (id: string, hotelId: string) => unwrap<Wishlist>(api.post(`/me/wishlists/${id}/items`, { hotelId })),
  removeItem: (id: string, hotelId: string) => unwrap<Wishlist>(api.delete(`/me/wishlists/${id}/items/${hotelId}`)),
  move: (id: string, hotelId: string, toId: string) => unwrap<{ from: Wishlist; to: Wishlist }>(api.post(`/me/wishlists/${id}/move`, { hotelId, toId })),
  invite: (id: string, email: string) => unwrap<Wishlist>(api.post(`/me/wishlists/${id}/collaborators`, { email })),
  toggleLike: (hotelId: string) => unwrap<{ liked: boolean; wishlistName?: string }>(api.post(`/me/likes/${hotelId}`)),
};

export const bookingService = {
  mine: () => unwrap<Booking[]>(api.get("/me/bookings")),
  get: (id: string) => unwrap<Booking>(api.get(`/bookings/${id}`)),
  create: (req: CreateBookingRequest) => unwrap<Booking>(api.post("/bookings", req)),
  cancel: (id: string) => unwrap<CancelBookingResponse>(api.post(`/bookings/${id}/cancel`)),
  requestChange: (id: string, req: ChangeRequest) => unwrap<{ status: string }>(api.post(`/bookings/${id}/change-requests`, req)),
  review: (id: string, body: { categories: Record<string, number>; text: string }) => unwrap(api.post(`/bookings/${id}/review`, body)),
};

/** Conversations of the signed-in user, whatever their role (guest, host or support). */
export const messagingService = {
  conversations: () => unwrap<Conversation[]>(api.get("/conversations")),
  start: (body: { hotelId?: string; bookingId?: string; kind?: "HOTEL" | "SUPPORT" }) => unwrap<Conversation>(api.post("/conversations", body)),
  messages: (conversationId: string) => unwrap<Message[]>(api.get(`/conversations/${conversationId}/messages`)),
  send: (conversationId: string, text: string) => unwrap<Message>(api.post(`/conversations/${conversationId}/messages`, { text })),
  unsend: (messageId: string) => unwrap<Message>(api.post(`/messages/${messageId}/unsend`)),
  markRead: (conversationId: string) => unwrap(api.post(`/conversations/${conversationId}/read`)),
};

export const notificationService = {
  list: () => unwrap<AppNotification[]>(api.get("/me/notifications")),
  markRead: (id: string) => unwrap(api.post(`/me/notifications/${id}/read`)),
  markAllRead: () => unwrap(api.post("/me/notifications/read-all")),
  preferences: () => unwrap<NotificationPrefs>(api.get("/me/notification-preferences")),
  savePreferences: (p: NotificationPrefs) => unwrap<NotificationPrefs>(api.put("/me/notification-preferences", p)),
};

export type DemoAccount = { id: string; name: string; email: string; role: User["role"]; status: User["status"] };
/** MOCK AUTH — see README: demo accounts only, no real identity provider. */
export const authService = {
  demoAccounts: () => unwrap<DemoAccount[]>(api.get("/auth/demo-accounts")),
  login: (body: { email: string; password: string }) => unwrap<Session>(api.post("/auth/login", body)),
  register: (body: { name: string; email: string; password: string; role: "GUEST" | "HOST" }) => unwrap<{ status: string; email: string }>(api.post("/auth/register", body)),
  verifyEmail: (email: string, code: string) => unwrap<Session>(api.post("/auth/verify-email", { email, code })),
  forgotPassword: (email: string) => unwrap<{ status: string; demoResetToken: string }>(api.post("/auth/forgot-password", { email })),
  resetPassword: (body: { token: string; password: string; confirm: string }) => unwrap<{ status: string; email: string }>(api.post("/auth/reset-password", body)),
  resetDemoData: () => unwrap<{ ok: true }>(api.post("/demo/reset")),
};
