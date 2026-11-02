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

| Method | Path | Caller |
|---|---|---|
| GET | `/admin/audit` | Admin |
| GET | `/admin/bookings` | Admin |
| PATCH | `/admin/bookings/:id` | Admin |
| POST | `/admin/bookings/:id/cancel` | Admin |
| POST | `/admin/bookings/:id/refund` | Admin |
| POST | `/admin/bookings/:id/resolve-dispute` | Admin |
| PUT | `/admin/categories` | Admin |
| GET | `/admin/host-quality` | Admin |
| PATCH | `/admin/host-quality/:id` | Admin |
| GET | `/admin/hotels` | Admin |
| PATCH | `/admin/hotels/:id` | Admin |
| PUT | `/admin/match-engine/config` | Admin |
| PUT | `/admin/match-engine/questions` | Admin |
| GET | `/admin/reports` | Admin |
| PATCH | `/admin/reports/:id` | Admin |
| GET | `/admin/reviews` | Admin |
| PATCH | `/admin/reviews/:id` | Admin |
| GET | `/admin/stats` | Admin |
| GET | `/admin/transactions` | Admin |
| GET | `/admin/users` | Admin |
| PATCH | `/admin/users/:id` | Admin |
| GET | `/auth/demo-accounts` | Public |
| POST | `/auth/forgot-password` | Public |
| POST | `/auth/login` | Public |
| POST | `/auth/register` | Public |
| POST | `/auth/reset-password` | Public |
| POST | `/auth/verify-email` | Public |
| POST | `/bookings` | Guest (own data) |
| GET | `/bookings/:id` | Guest (own data) |
| POST | `/bookings/:id/cancel` | Guest (own data) |
| POST | `/bookings/:id/change-requests` | Guest (own data) |
| POST | `/bookings/:id/review` | Guest (own data) |
| GET | `/catalog/categories` | Public |
| GET | `/catalog/destinations` | Public |
| GET | `/catalog/suggestions` | Public |
| GET | `/conversations` | Signed in (own data / participants) |
| POST | `/conversations` | Signed in (own data / participants) |
| GET | `/conversations/:id/messages` | Signed in (own data / participants) |
| POST | `/conversations/:id/messages` | Signed in (own data / participants) |
| POST | `/conversations/:id/read` | Signed in (own data / participants) |
| POST | `/demo/reset` | Public |
| GET | `/events` | Public |
| POST | `/events` | Public |
| GET | `/host/earnings` | Host (own properties) |
| GET | `/host/hotels` | Host (own properties) |
| POST | `/host/hotels` | Host (own properties) |
| PATCH | `/host/hotels/:id` | Host (own properties) |
| GET | `/host/hotels/:id/pricing` | Host (own properties) |
| PUT | `/host/hotels/:id/pricing` | Host (own properties) |
| GET | `/host/match-insights` | Host (own properties) |
| GET | `/host/reservations` | Host (own properties) |
| POST | `/host/reservations/:id/transition` | Host (own properties) |
| GET | `/host/reviews` | Host (own properties) |
| POST | `/host/reviews/:id/reply` | Host (own properties) |
| PATCH | `/host/rooms/:id` | Host (own properties) |
| GET | `/host/rooms/:id/calendar` | Host (own properties) |
| PUT | `/host/rooms/:id/calendar` | Host (own properties) |
| GET | `/host/stats` | Host (own properties) |
| GET | `/hotels/:id` | Public |
| GET | `/hotels/:id/availability` | Public |
| GET | `/hotels/:id/flexible-dates` | Public |
| GET | `/hotels/:id/reviews` | Public |
| GET | `/hotels/by-slug` | Public |
| GET | `/hotels/collections/:kind` | Public |
| POST | `/hotels/compare` | Public |
| GET | `/hotels/search` | Public |
| GET | `/hotels/split-stays` | Public |
| GET | `/match/config` | Public |
| GET | `/match/questions` | Public |
| GET | `/me` | Signed in (own data / participants) |
| PATCH | `/me` | Signed in (own data / participants) |
| GET | `/me/bookings` | Guest (own data) |
| POST | `/me/likes/:hotelId` | Guest (own data) |
| GET | `/me/match-profile` | Any (visitor = anonymous profile) |
| PUT | `/me/match-profile` | Any (visitor = anonymous profile) |
| POST | `/me/match-profile/reset` | Any (visitor = anonymous profile) |
| GET | `/me/notification-preferences` | Signed in (own data / participants) |
| PUT | `/me/notification-preferences` | Signed in (own data / participants) |
| GET | `/me/notifications` | Signed in (own data / participants) |
| POST | `/me/notifications/:id/read` | Signed in (own data / participants) |
| POST | `/me/notifications/read-all` | Signed in (own data / participants) |
| GET | `/me/reviews` | Signed in (own data / participants) |
| GET | `/me/wishlists` | Guest (own data) |
| POST | `/me/wishlists` | Guest (own data) |
| DELETE | `/me/wishlists/:id` | Guest (own data) |
| PATCH | `/me/wishlists/:id` | Guest (own data) |
| POST | `/me/wishlists/:id/collaborators` | Guest (own data) |
| POST | `/me/wishlists/:id/items` | Guest (own data) |
| DELETE | `/me/wishlists/:id/items/:hotelId` | Guest (own data) |
| POST | `/me/wishlists/:id/move` | Guest (own data) |
| POST | `/messages/:id/unsend` | Signed in (own data / participants) |

## Identity, roles and the shared demo dataset

> **Mock authentication — frontend demonstration only.** Nothing below is a security boundary.

* **One dataset for every role.** The mock database (`localStorage["nuzul.mockdb"]`, `mocks/server/db.ts`) holds users,
  hotels → rooms → calendars, bookings, conversations → messages, reviews, wishlists, notifications and the audit log,
  linked by stable IDs (`hotel.host.id`, `booking.guestId/hostId/hotelId/roomId`, `conversation.guestId/hostId/hotelId/bookingId`,
  `message.senderId`, `notification.recipientId`, `review.authorId`, `wishlist.ownerId`).
* **Who is asking.** Sign-in returns `{ user, token }` where the token is `mock.<userId>`. The Axios client sends it as
  `Authorization: Bearer …`; every handler resolves the caller with `requireUser(roles, { write })` (`mocks/server/context.ts`):
  401 `UNAUTHENTICATED` without a session, 403 `FORBIDDEN` for the wrong role or someone else's record, 403 `ACCOUNT_SUSPENDED`
  for writes by a suspended account. Host endpoints are scoped to the host's own properties; guest endpoints to the guest's own data;
  conversations to their two participants.
* **Session storage.** The session lives in `sessionStorage` (per tab) — or also `localStorage` with “Keep me signed in” — so two tabs
  can be a guest and a host on the same dataset. A `storage` event on `nuzul.mockdb` reloads the DB and invalidates queries, so
  actions in one tab appear in the other. A 401 with a token clears the session and routes to `/auth/expired?next=…`.
* **Routing.** `app/guards.tsx` → `RequireRole` redirects visitors to `/auth/sign-in?next=<url>` and shows `AccessDenied` (403)
  for the wrong role. Guest-only actions (save, book, review, message) call `useAuthGate()`, which opens a sign-in prompt and returns
  the visitor to the same page (or straight into checkout) after sign-in. `safeNext()` only accepts same-origin paths that the new role may open.
* **Events → notifications.** Handlers call `notify(recipientId, …)` (honouring each user's preferences) whenever another party
  must know: new booking/request → host; host confirm/cancel/check-in → guest; message → the other participant; new listing,
  resubmission, new account → admins; approval/rejection/suspension → host; review published → host; review removed → author;
  account suspended/reinstated → that user.
* **Visibility rules.** A hotel is public only when `status === "LIVE"` **and** its host account is active (`isPublic`). Hosts see their
  own non-public listings; admins see everything. Reviews are public only while `moderation === "PUBLISHED"`.
* **Inventory.** Bookings decrement the room calendar's `available` for each night; cancellations (guest, host or admin) release it.
  `GET /hotels/:id/availability` and `POST /bookings` refuse closed or sold-out nights (409 `NOT_AVAILABLE`); duplicate submissions
  get 409 `DUPLICATE_BOOKING`. Room price changes flow to non-special calendar days and `hotel.fromPrice`.
* **Reset.** `POST /demo/reset` (footer → “Reset demo data”) restores the seed for every account.

## Backend responsibilities not covered by the frontend

| Concern | Expectation |
|---|---|
| Authentication (§60) | Real identity provider: hashed passwords, email delivery for verification/reset, httpOnly session cookie or short-lived JWT + refresh, role claims. The mock token `mock.<userId>` is only a demo identifier; the RBAC rules in `mocks/server/context.ts` document what the real API must enforce. |
| Payments (§62) | Provider hosted fields / wallet sheets return a token; the API authorises, captures at check-in, refunds and pays out. The UI never sees card numbers. |
| Booking state machine (§63) | Server-enforced transitions (mirrored in `handlers-ops.ts` → `TRANSITIONS`), hold expiry, idempotency keys. |
| Messaging (§34) | WebSocket/SSE push; the UI polls via query invalidation today. Attachments need file storage. |
| Notifications (§35) | Email/push delivery honouring `/me/notification-preferences`. |
| Review Insights (§27) | NLP topic & sentiment extraction producing `hotel.insights` and `noiseMentionPct`. |
| Analytics (§72) | Ingest `POST /events` (`lib/analytics.ts`). |
| SEO (§68) | SSR/prerender of `/hotels/:country/:city/:slug`; the client already sets title, description, canonical, OG and schema.org `Hotel` JSON-LD. |
| Fraud & abuse (§67) | Signals behind Admin → Dashboard / Reports; rate limits, review-fraud detection. |
