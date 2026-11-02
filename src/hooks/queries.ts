/* TanStack Query hooks — the only way UI reads/writes server state. */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { HotelSearchParams, ReviewSort } from "@/types/api";
import type { BookingState, Category, Hotel, NotificationPrefs, Wishlist } from "@/types/models";
import type { MatchConfig, MatchProfile } from "@/lib/match-engine";
import type { Question } from "@/services/questions";
import { catalogService, hotelsService, type CollectionKind } from "@/services/catalog.service";
import { bookingService, matchService, meService, messagingService, notificationService, wishlistService } from "@/services/account.service";
import { adminService, hostService } from "@/services/ops.service";

export const qk = {
  categories: ["categories"] as const,
  destinations: ["destinations"] as const,
  suggestions: (q: string) => ["suggestions", q] as const,
  hotels: ["hotels"] as const,
  search: (p: HotelSearchParams) => ["hotels", "search", p] as const,
  collection: (k: CollectionKind) => ["hotels", "collection", k] as const,
  hotel: (id: string) => ["hotels", "detail", id] as const,
  hotelSlug: (slug: string) => ["hotels", "slug", slug] as const,
  compare: (ids: string[]) => ["hotels", "compare", ids] as const,
  flex: (id: string, checkIn: string, nights: number) => ["hotels", "flex", id, checkIn, nights] as const,
  reviews: (id: string, sort: ReviewSort, page: number) => ["reviews", id, sort, page] as const,
  me: ["me"] as const,
  profile: ["me", "profile"] as const,
  questions: ["match", "questions"] as const,
  matchConfig: ["match", "config"] as const,
  wishlists: ["me", "wishlists"] as const,
  bookings: ["me", "bookings"] as const,
  booking: (id: string) => ["bookings", id] as const,
  conversations: ["me", "conversations"] as const,
  messages: (id: string) => ["messages", id] as const,
  notifications: ["me", "notifications"] as const,
  notificationPrefs: ["me", "notification-prefs"] as const,
  host: { hotels: ["host", "hotels"] as const, stats: ["host", "stats"] as const, reservations: (s?: BookingState[]) => ["host", "reservations", s ?? []] as const, calendar: (r: string) => ["host", "calendar", r] as const, pricing: (h: string) => ["host", "pricing", h] as const, reviews: ["host", "reviews"] as const, insights: (h?: string) => ["host", "insights", h ?? ""] as const, earnings: ["host", "earnings"] as const },
  admin: { stats: ["admin", "stats"] as const, users: (p: object) => ["admin", "users", p] as const, hotels: ["admin", "hotels"] as const, hostQuality: ["admin", "host-quality"] as const, bookings: (q: string) => ["admin", "bookings", q] as const, reviews: (m?: string) => ["admin", "reviews", m ?? ""] as const, reports: (t?: string) => ["admin", "reports", t ?? ""] as const, transactions: ["admin", "transactions"] as const, audit: ["admin", "audit"] as const },
};

/* ------------------------------------------------------------ Catalog */
export const useCategories = () => useQuery({ queryKey: qk.categories, queryFn: catalogService.categories, staleTime: 5 * 60_000 });
export const useDestinations = () => useQuery({ queryKey: qk.destinations, queryFn: catalogService.destinations, staleTime: Infinity });
export const useSuggestions = (q: string) => useQuery({ queryKey: qk.suggestions(q), queryFn: () => catalogService.suggestions(q), placeholderData: keepPreviousData, staleTime: 60_000 });

/* ------------------------------------------------------------- Hotels */
export const useHotelSearch = (p: HotelSearchParams) => useQuery({ queryKey: qk.search(p), queryFn: () => hotelsService.search(p), placeholderData: keepPreviousData });
export const useCollection = (k: CollectionKind) => useQuery({ queryKey: qk.collection(k), queryFn: () => hotelsService.collection(k) });
export const useHotel = (id: string) => useQuery({ queryKey: qk.hotel(id), queryFn: () => hotelsService.get(id), enabled: !!id });
export const useHotelBySlug = (slug: string) => useQuery({ queryKey: qk.hotelSlug(slug), queryFn: () => hotelsService.bySlug(slug), enabled: !!slug });
export const useCompareHotels = (ids: string[]) => useQuery({ queryKey: qk.compare(ids), queryFn: () => hotelsService.compare(ids), enabled: ids.length > 0 });
/** Batch fetch (wishlists etc.) — same contract as compare. */
export const useHotelsByIds = (ids: string[]) => useQuery({ queryKey: ["hotels", "batch", ids], queryFn: () => hotelsService.compare(ids), enabled: ids.length > 0, placeholderData: keepPreviousData });
export const useFlexibleDates = (id: string, checkIn: string, nights: number, enabled = true) => useQuery({ queryKey: qk.flex(id, checkIn, nights), queryFn: () => hotelsService.flexibleDates(id, checkIn, nights), enabled: enabled && !!id });
export const useReviews = (id: string, sort: ReviewSort, page: number) => useQuery({ queryKey: qk.reviews(id, sort, page), queryFn: () => hotelsService.reviews(id, sort, page), placeholderData: keepPreviousData });

/* ------------------------------------------------------ Match profile */
export const useMe = () => useQuery({ queryKey: qk.me, queryFn: meService.get });
export const useMyReviews = () => useQuery({ queryKey: ["me", "reviews"], queryFn: meService.reviews });
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: meService.update, onSuccess: (u) => qc.setQueryData(qk.me, u) });
}
export const useMatchProfile = () => useQuery({ queryKey: qk.profile, queryFn: meService.profile });
export const useQuestions = () => useQuery({ queryKey: qk.questions, queryFn: matchService.questions });
export const useMatchConfig = () => useQuery({ queryKey: qk.matchConfig, queryFn: matchService.config });

/** Scores depend on profile + config, so any change refreshes every hotel query. */
function useInvalidateScores() {
  const qc = useQueryClient();
  return () => { qc.invalidateQueries({ queryKey: qk.hotels }); qc.invalidateQueries({ queryKey: ["host", "insights"] }); };
}
export function useSaveProfile() {
  const qc = useQueryClient(); const refresh = useInvalidateScores();
  return useMutation({ mutationFn: (p: Partial<MatchProfile>) => meService.saveProfile(p), onSuccess: (p) => { qc.setQueryData(qk.profile, p); refresh(); } });
}
export function useResetProfile() {
  const qc = useQueryClient(); const refresh = useInvalidateScores();
  return useMutation({ mutationFn: meService.resetProfile, onSuccess: (p) => { qc.setQueryData(qk.profile, p); refresh(); } });
}

/* ---------------------------------------------------------- Wishlists */
export const useWishlists = () => useQuery({ queryKey: qk.wishlists, queryFn: wishlistService.list });
function useWl<TVars, TRes>(fn: (v: TVars) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: qk.wishlists }) });
}
export const useCreateWishlist = () => useWl((name: string) => wishlistService.create(name));
export const useUpdateWishlist = () => useWl(({ id, patch }: { id: string; patch: Partial<Pick<Wishlist, "name" | "privacy">> }) => wishlistService.update(id, patch));
export const useDeleteWishlist = () => useWl((id: string) => wishlistService.remove(id));
export const useMoveWishlistItem = () => useWl(({ id, hotelId, toId }: { id: string; hotelId: string; toId: string }) => wishlistService.move(id, hotelId, toId));
export const useRemoveWishlistItem = () => useWl(({ id, hotelId }: { id: string; hotelId: string }) => wishlistService.removeItem(id, hotelId));
export const useInviteCollaborator = () => useWl(({ id, email }: { id: string; email: string }) => wishlistService.invite(id, email));
/** Quick like with optimistic update (§22). */
export function useToggleLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (hotelId: string) => wishlistService.toggleLike(hotelId),
    onMutate: async (hotelId) => {
      await qc.cancelQueries({ queryKey: qk.wishlists });
      const prev = qc.getQueryData<Wishlist[]>(qk.wishlists);
      if (prev) {
        const saved = prev.some((w) => w.hotelIds.includes(hotelId));
        qc.setQueryData<Wishlist[]>(qk.wishlists, saved ? prev.map((w) => ({ ...w, hotelIds: w.hotelIds.filter((x) => x !== hotelId) })) : prev.map((w, i) => (i === 0 ? { ...w, hotelIds: [...w.hotelIds, hotelId] } : w)));
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.wishlists, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.wishlists }),
  });
}

/* ----------------------------------------------------------- Bookings */
export const useMyBookings = () => useQuery({ queryKey: qk.bookings, queryFn: bookingService.mine });
export const useBooking = (id: string) => useQuery({ queryKey: qk.booking(id), queryFn: () => bookingService.get(id), enabled: !!id });
function useBookingMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => { qc.invalidateQueries({ queryKey: qk.bookings }); qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: qk.notifications }); qc.invalidateQueries({ queryKey: ["host"] }); qc.invalidateQueries({ queryKey: ["admin"] }); } });
}
export const useCreateBooking = () => useBookingMutation(bookingService.create);
export const useCancelBooking = () => useBookingMutation((id: string) => bookingService.cancel(id));
export const useChangeRequest = () => useBookingMutation(({ id, ...req }: { id: string } & Parameters<typeof bookingService.requestChange>[1]) => bookingService.requestChange(id, req));
export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...body }: { id: string; categories: Record<string, number>; text: string }) => bookingService.review(id, body), onSuccess: () => { qc.invalidateQueries({ queryKey: qk.bookings }); qc.invalidateQueries({ queryKey: ["reviews"] }); } });
}

/* ---------------------------------------------------------- Messaging */
export const useConversations = () => useQuery({ queryKey: qk.conversations, queryFn: messagingService.conversations });
export const useMessages = (id: string) => useQuery({ queryKey: qk.messages(id), queryFn: () => messagingService.messages(id), enabled: !!id });
export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (text: string) => messagingService.send(conversationId, text), onSuccess: () => { qc.invalidateQueries({ queryKey: qk.messages(conversationId) }); qc.invalidateQueries({ queryKey: qk.conversations }); } });
}
export function useUnsend(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (messageId: string) => messagingService.unsend(messageId), onSuccess: () => qc.invalidateQueries({ queryKey: qk.messages(conversationId) }) });
}
export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => messagingService.markRead(id), onSuccess: () => qc.invalidateQueries({ queryKey: qk.conversations }) });
}

/* ------------------------------------------------------ Notifications */
export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: notificationService.list });
export const useNotificationPrefs = () => useQuery({ queryKey: qk.notificationPrefs, queryFn: notificationService.preferences });
export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string | "all") => (id === "all" ? notificationService.markAllRead() : notificationService.markRead(id)), onSuccess: () => qc.invalidateQueries({ queryKey: qk.notifications }) });
}
export function useSaveNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (p: NotificationPrefs) => notificationService.savePreferences(p), onSuccess: (p) => qc.setQueryData(qk.notificationPrefs, p) });
}

/* --------------------------------------------------------------- Host */
export const useHostHotels = () => useQuery({ queryKey: qk.host.hotels, queryFn: hostService.hotels });
export const useHostStats = () => useQuery({ queryKey: qk.host.stats, queryFn: hostService.stats });
export const useHostReservations = (s?: BookingState[]) => useQuery({ queryKey: qk.host.reservations(s), queryFn: () => hostService.reservations(s) });
export const useRoomCalendar = (roomId: string) => useQuery({ queryKey: qk.host.calendar(roomId), queryFn: () => hostService.calendar(roomId), enabled: !!roomId });
export const usePricingRules = (hotelId: string) => useQuery({ queryKey: qk.host.pricing(hotelId), queryFn: () => hostService.pricing(hotelId), enabled: !!hotelId });
export const useHostReviews = () => useQuery({ queryKey: qk.host.reviews, queryFn: hostService.reviews });
export const useHostMatchInsights = (hotelId?: string) => useQuery({ queryKey: qk.host.insights(hotelId), queryFn: () => hostService.matchInsights(hotelId) });
export const useHostEarnings = () => useQuery({ queryKey: qk.host.earnings, queryFn: hostService.earnings });
export function useHostMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>, extraKeys: readonly unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => { qc.invalidateQueries({ queryKey: ["host"] }); qc.invalidateQueries({ queryKey: qk.hotels }); extraKeys.forEach((k) => qc.invalidateQueries({ queryKey: k })); } });
}
export const useUpdateHostHotel = () => useHostMutation(({ id, patch }: { id: string; patch: Partial<Hotel> }) => hostService.updateHotel(id, patch));

/* -------------------------------------------------------------- Admin */
export const useAdminStats = () => useQuery({ queryKey: qk.admin.stats, queryFn: adminService.stats });
export const useAdminUsers = (p: { role?: string; status?: string; verification?: string; q?: string }) => useQuery({ queryKey: qk.admin.users(p), queryFn: () => adminService.users(p), placeholderData: keepPreviousData });
export const useAdminHotels = () => useQuery({ queryKey: qk.admin.hotels, queryFn: adminService.hotels });
export const useHostQuality = () => useQuery({ queryKey: qk.admin.hostQuality, queryFn: adminService.hostQuality });
export const useAdminBookings = (q: string) => useQuery({ queryKey: qk.admin.bookings(q), queryFn: () => adminService.bookings(q), placeholderData: keepPreviousData });
export const useAdminReviews = (m?: "PUBLISHED" | "FLAGGED" | "REMOVED") => useQuery({ queryKey: qk.admin.reviews(m), queryFn: () => adminService.reviews(m) });
export const useAdminReports = (t?: "USER" | "HOTEL" | "FRAUD" | "ABUSE" | "PAYMENT") => useQuery({ queryKey: qk.admin.reports(t), queryFn: () => adminService.reports(t) });
export const useTransactions = () => useQuery({ queryKey: qk.admin.transactions, queryFn: adminService.transactions });
export const useAudit = () => useQuery({ queryKey: qk.admin.audit, queryFn: adminService.audit });
export function useAdminMutation<TVars, TRes>(fn: (v: TVars) => Promise<TRes>, alsoInvalidate: readonly unknown[][] = []) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin"] }); alsoInvalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })); } });
}
export const useSaveCategories = () => useAdminMutation((c: Category[]) => adminService.saveCategories(c), [qk.categories as unknown as unknown[]]);
export function useSaveMatchConfig() {
  const qc = useQueryClient(); const refresh = useInvalidateScores();
  return useMutation({ mutationFn: (c: MatchConfig) => adminService.saveMatchConfig(c), onSuccess: (c) => { qc.setQueryData(qk.matchConfig, c); qc.invalidateQueries({ queryKey: qk.admin.audit }); refresh(); } });
}
export function useSaveQuestions() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (q: Question[]) => adminService.saveQuestions(q), onSuccess: (q) => { qc.setQueryData(qk.questions, q); qc.invalidateQueries({ queryKey: qk.admin.audit }); } });
}
