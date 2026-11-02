import type { Booking, BookingState, CalendarDay, Category, Hotel, HostQuality, PricingRules, Report, Review, Room, Transaction, User } from "@/types/models";
import type { Paginated } from "@/types/api";
import type { MatchConfig, Reason } from "@/lib/match-engine";
import type { Question } from "./questions";
import { api, unwrap } from "./api-client";

export type HostStats = {
  revenue: number; revenueDelta: number; occupancy: number; occupancyDelta: number; bookings: number; bookingsDelta: number; adr: number; cancellationRate: number; wishlistSaves: number;
  checkInsNext7: number; checkOutsNext7: number; averageRating: number; reviewCount: number;
  revenueSeries: { day: number; revenue: number; occupancy: number }[]; occupancyByMonth: { month: string; occupancy: number }[];
  funnel: { step: string; value: number }[]; pendingRequests: number; today: Booking[];
};
export type MatchInsights = { hotelId: string; average: number; segments: { label: string; score: number; topIssue: Reason | null }[]; distribution: { label: string; count: number }[] };
export type Earnings = { gross: number; commissionPct: number; commission: number; net: number; refunds: number; nextPayout: string; transactions: Transaction[] };
export type AdminStats = {
  users: number; usersDelta: number; hotels: number; hotelsDelta: number; bookings30d: number; gmv30d: number; pendingVerification: number; openReports: number;
  bookingsSeries: { day: number; bookings: number }[];
  match: { questionnaireCompletion: number; scoreClickRate: number; bookedHighMatch: number; matchToBooking: number; selectedBecauseOfMatch: number };
  conversionByBand: { band: string; rate: number }[];
  fraud: { fakeAccounts: number; heldPayments: number; reviewFlags: number; spam: number };
};
export type AuditEntry = { at: string; actor: string; action: string };

export const hostService = {
  hotels: () => unwrap<Hotel[]>(api.get("/host/hotels")),
  createHotel: (body: Partial<Hotel>) => unwrap<Hotel>(api.post("/host/hotels", body)),
  updateHotel: (id: string, patch: Partial<Hotel>) => unwrap<Hotel>(api.patch(`/host/hotels/${id}`, patch)),
  updateRoom: (id: string, patch: Partial<Room>) => unwrap<Room>(api.patch(`/host/rooms/${id}`, patch)),
  calendar: (roomId: string) => unwrap<CalendarDay[]>(api.get(`/host/rooms/${roomId}/calendar`)),
  updateCalendar: (roomId: string, dates: string[], patch: Partial<CalendarDay>) => unwrap<CalendarDay[]>(api.put(`/host/rooms/${roomId}/calendar`, { dates, patch })),
  pricing: (hotelId: string) => unwrap<PricingRules>(api.get(`/host/hotels/${hotelId}/pricing`)),
  savePricing: (hotelId: string, rules: PricingRules) => unwrap<PricingRules>(api.put(`/host/hotels/${hotelId}/pricing`, rules)),
  reservations: (state?: BookingState[]) => unwrap<Paginated<Booking>>(api.get("/host/reservations", { params: { state } })),
  transition: (id: string, to: BookingState) => unwrap<Booking>(api.post(`/host/reservations/${id}/transition`, { to })),
  reviews: () => unwrap<Review[]>(api.get("/host/reviews")),
  reply: (id: string, text: string) => unwrap<Review>(api.post(`/host/reviews/${id}/reply`, { text })),
  stats: () => unwrap<HostStats>(api.get("/host/stats")),
  matchInsights: (hotelId?: string) => unwrap<MatchInsights>(api.get("/host/match-insights", { params: { hotelId } })),
  earnings: () => unwrap<Earnings>(api.get("/host/earnings")),
};

export const adminService = {
  stats: () => unwrap<AdminStats>(api.get("/admin/stats")),
  users: (params: { role?: string; status?: string; verification?: string; q?: string }) => unwrap<Paginated<User>>(api.get("/admin/users", { params })),
  updateUser: (id: string, patch: Partial<User>) => unwrap<User>(api.patch(`/admin/users/${id}`, patch)),
  hotels: () => unwrap<Paginated<Hotel>>(api.get("/admin/hotels")),
  updateHotel: (id: string, patch: Partial<Hotel>) => unwrap<Hotel>(api.patch(`/admin/hotels/${id}`, patch)),
  hostQuality: () => unwrap<HostQuality[]>(api.get("/admin/host-quality")),
  updateHostQuality: (id: string, patch: Partial<HostQuality>) => unwrap<HostQuality>(api.patch(`/admin/host-quality/${id}`, patch)),
  bookings: (q: string) => unwrap<Paginated<Booking>>(api.get("/admin/bookings", { params: { q } })),
  updateBooking: (id: string, patch: Partial<Booking>) => unwrap<Booking>(api.patch(`/admin/bookings/${id}`, patch)),
  refund: (id: string, amount: number) => unwrap<Booking>(api.post(`/admin/bookings/${id}/refund`, { amount })),
  cancelBooking: (id: string) => unwrap<Booking>(api.post(`/admin/bookings/${id}/cancel`)),
  resolveDispute: (id: string) => unwrap<Booking>(api.post(`/admin/bookings/${id}/resolve-dispute`)),
  reviews: (moderation?: Review["moderation"]) => unwrap<Review[]>(api.get("/admin/reviews", { params: { moderation } })),
  moderateReview: (id: string, moderation: Review["moderation"], flagReason?: string) => unwrap<Review>(api.patch(`/admin/reviews/${id}`, { moderation, flagReason })),
  reports: (type?: Report["type"]) => unwrap<Report[]>(api.get("/admin/reports", { params: { type } })),
  updateReport: (id: string, status: Report["status"]) => unwrap<Report>(api.patch(`/admin/reports/${id}`, { status })),
  transactions: () => unwrap<Paginated<Transaction>>(api.get("/admin/transactions")),
  saveCategories: (cats: Category[]) => unwrap<Category[]>(api.put("/admin/categories", cats)),
  saveMatchConfig: (cfg: MatchConfig) => unwrap<MatchConfig>(api.put("/admin/match-engine/config", cfg)),
  saveQuestions: (qs: Question[]) => unwrap<Question[]>(api.put("/admin/match-engine/questions", qs)),
  audit: () => unwrap<AuditEntry[]>(api.get("/admin/audit")),
};
