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

export type MessagingScope = "guest" | "host";
/** Same contract for both sides of a conversation; the host inbox lives under /host. */
export const messagingService = {
  conversations: (scope: MessagingScope = "guest") => unwrap<Conversation[]>(api.get(scope === "host" ? "/host/conversations" : "/me/conversations")),
  messages: (conversationId: string) => unwrap<Message[]>(api.get(`/conversations/${conversationId}/messages`)),
  send: (conversationId: string, text: string, scope: MessagingScope = "guest") => unwrap<Message>(api.post(`${scope === "host" ? "/host" : ""}/conversations/${conversationId}/messages`, { text })),
  unsend: (messageId: string, scope: MessagingScope = "guest") => unwrap<Message>(api.post(`${scope === "host" ? "/host" : ""}/messages/${messageId}/unsend`)),
  markRead: (conversationId: string, scope: MessagingScope = "guest") => unwrap(api.post(`${scope === "host" ? "/host" : ""}/conversations/${conversationId}/read`)),
};

export const notificationService = {
  list: () => unwrap<AppNotification[]>(api.get("/me/notifications")),
  markRead: (id: string) => unwrap(api.post(`/me/notifications/${id}/read`)),
  markAllRead: () => unwrap(api.post("/me/notifications/read-all")),
  preferences: () => unwrap<NotificationPrefs>(api.get("/me/notification-preferences")),
  savePreferences: (p: NotificationPrefs) => unwrap<NotificationPrefs>(api.put("/me/notification-preferences", p)),
};

export const authService = {
  login: (body: { email: string; password: string; role: string }) => unwrap<Session>(api.post("/auth/login", body)),
  register: (body: { name: string; email: string; password: string; role: string }) => unwrap<{ status: string; email: string }>(api.post("/auth/register", body)),
  forgotPassword: (email: string) => unwrap(api.post("/auth/forgot-password", { email })),
  verifyEmail: (code: string) => unwrap(api.post("/auth/verify-email", { code })),
};
