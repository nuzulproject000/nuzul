/* Product analytics (§72). Events go to POST /events (the analytics service in production; the mock
 * backend keeps the last 500 in memory). Fire-and-forget: tracking never blocks or breaks the UI. */
import { api } from "@/services/api-client";

export type AnalyticsEvent =
  | "search" | "filters_applied" | "hotel_view" | "like" | "wishlist_create" | "wishlist_share" | "compare"
  | "booking_attempt" | "booking_complete" | "booking_failed" | "cancellation" | "review_submit"
  | "questionnaire_complete" | "match_view" | "match_why_click";

export function track(event: AnalyticsEvent, props: Record<string, string | number | boolean | undefined> = {}) {
  const payload = { event, props, at: new Date().toISOString(), path: typeof location !== "undefined" ? location.pathname : "" };
  if (import.meta.env.DEV && import.meta.env.MODE !== "test") console.debug("[analytics]", event, props);
  void api.post("/events", payload).catch(() => { /* analytics must never surface errors */ });
}
