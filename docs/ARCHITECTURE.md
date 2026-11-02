# Architecture

## Layers

```
features/* (pages)  ──▶  hooks/queries.ts (TanStack Query: caching, loading, error, invalidation)
                         └─▶ services/*.service.ts (typed request/response, the only place with URLs)
                               └─▶ services/api-client.ts (Axios: auth header, Accept-Language, ApiError normalisation)
                                     ├─ VITE_USE_MOCKS=true  → mocks/server (lazy-loaded adapter, 250–550 ms latency)
                                     └─ VITE_USE_MOCKS=false → VITE_API_BASE_URL (real REST API)
```

* **Business logic that must be identical client- and server-side** lives in pure modules:
  `lib/match-engine.ts` (§8–12 scoring + structured reasons), `lib/pricing.ts` (§30 breakdown, §31 refunds).
  The mock server imports them; a real backend should port or share them so previews (Admin → Match Engine,
  Profile → live preview) match what the API returns.
* **Configuration is data, not code** (§86): questionnaire questions, factor weights, thresholds, explanation
  rules and categories are fetched from the API and editable in Admin.
* **Client state** (Zustand, persisted): display language/currency, privacy toggles, current search, compare
  tray, session. Everything else is server state.
* **Errors** are normalised to `ApiError { status, code, message, fieldErrors? }`. Forms map `fieldErrors`
  onto fields (`lib/forms.ts`); 402 = payment declined; 409 = illegal state transition; 422 = validation.

## API contract (implemented by the mock server)

All paths are relative to `VITE_API_BASE_URL` (`/v1`). Lists return `Paginated<T>`
(`items, page, pageSize, total, totalPages`). Every hotel payload includes the requesting guest's `match`.

| Method | Path |
|---|---|
| GET | `/admin/audit` |
| GET | `/admin/bookings` |
| PATCH | `/admin/bookings/:id` |
| POST | `/admin/bookings/:id/cancel` |
| POST | `/admin/bookings/:id/refund` |
| POST | `/admin/bookings/:id/resolve-dispute` |
| PUT | `/admin/categories` |
| GET | `/admin/host-quality` |
| PATCH | `/admin/host-quality/:id` |
| GET | `/admin/hotels` |
| PATCH | `/admin/hotels/:id` |
| PUT | `/admin/match-engine/config` |
| PUT | `/admin/match-engine/questions` |
| GET | `/admin/reports` |
| PATCH | `/admin/reports/:id` |
| GET | `/admin/reviews` |
| PATCH | `/admin/reviews/:id` |
| GET | `/admin/stats` |
| GET | `/admin/transactions` |
| GET | `/admin/users` |
| PATCH | `/admin/users/:id` |
| POST | `/auth/forgot-password` |
| POST | `/auth/login` |
| POST | `/auth/register` |
| POST | `/auth/verify-email` |
| POST | `/bookings` |
| GET | `/bookings/:id` |
| POST | `/bookings/:id/cancel` |
| POST | `/bookings/:id/change-requests` |
| POST | `/bookings/:id/review` |
| GET | `/catalog/categories` |
| GET | `/catalog/destinations` |
| GET | `/catalog/suggestions` |
| GET | `/conversations/:id/messages` |
| POST | `/conversations/:id/messages` |
| POST | `/conversations/:id/read` |
| GET | `/events` |
| POST | `/events` |
| GET | `/host/conversations` |
| POST | `/host/conversations/:id/messages` |
| POST | `/host/conversations/:id/read` |
| GET | `/host/earnings` |
| GET | `/host/hotels` |
| POST | `/host/hotels` |
| PATCH | `/host/hotels/:id` |
| GET | `/host/hotels/:id/pricing` |
| PUT | `/host/hotels/:id/pricing` |
| GET | `/host/match-insights` |
| POST | `/host/messages/:id/unsend` |
| GET | `/host/reservations` |
| POST | `/host/reservations/:id/transition` |
| GET | `/host/reviews` |
| POST | `/host/reviews/:id/reply` |
| PATCH | `/host/rooms/:id` |
| GET | `/host/rooms/:id/calendar` |
| PUT | `/host/rooms/:id/calendar` |
| GET | `/host/stats` |
| GET | `/hotels/:id` |
| GET | `/hotels/:id/flexible-dates` |
| GET | `/hotels/:id/reviews` |
| GET | `/hotels/by-slug` |
| GET | `/hotels/collections/:kind` |
| POST | `/hotels/compare` |
| GET | `/hotels/search` |
| GET | `/hotels/split-stays` |
| GET | `/match/config` |
| GET | `/match/questions` |
| GET | `/me` |
| PATCH | `/me` |
| GET | `/me/bookings` |
| GET | `/me/conversations` |
| POST | `/me/likes/:hotelId` |
| GET | `/me/match-profile` |
| PUT | `/me/match-profile` |
| POST | `/me/match-profile/reset` |
| GET | `/me/notification-preferences` |
| PUT | `/me/notification-preferences` |
| GET | `/me/notifications` |
| POST | `/me/notifications/:id/read` |
| POST | `/me/notifications/read-all` |
| GET | `/me/reviews` |
| GET | `/me/wishlists` |
| POST | `/me/wishlists` |
| DELETE | `/me/wishlists/:id` |
| PATCH | `/me/wishlists/:id` |
| POST | `/me/wishlists/:id/collaborators` |
| POST | `/me/wishlists/:id/items` |
| DELETE | `/me/wishlists/:id/items/:hotelId` |
| POST | `/me/wishlists/:id/move` |
| POST | `/messages/:id/unsend` |

## Backend responsibilities not covered by the frontend

| Concern | Expectation |
|---|---|
| Authentication (§60) | httpOnly session cookie or short-lived JWT + refresh; role claims; route guards for `/host` and `/admin` enforced server-side. The UI currently trusts the mock session. |
| Payments (§62) | Provider hosted fields / wallet sheets return a token; the API authorises, captures at check-in, refunds and pays out. The UI never sees card numbers. |
| Booking state machine (§63) | Server-enforced transitions (mirrored in `handlers-ops.ts` → `TRANSITIONS`), hold expiry, idempotency keys. |
| Messaging (§34) | WebSocket/SSE push; the UI polls via query invalidation today. Attachments need file storage. |
| Notifications (§35) | Email/push delivery honouring `/me/notification-preferences`. |
| Review Insights (§27) | NLP topic & sentiment extraction producing `hotel.insights` and `noiseMentionPct`. |
| Analytics (§72) | Ingest `POST /events` (`lib/analytics.ts`). |
| SEO (§68) | SSR/prerender of `/hotels/:country/:city/:slug`; the client already sets title, description, canonical, OG and schema.org `Hotel` JSON-LD. |
| Fraud & abuse (§67) | Signals behind Admin → Dashboard / Reports; rate limits, review-fraud detection. |
