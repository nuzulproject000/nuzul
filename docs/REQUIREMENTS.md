# Requirements checklist — Nuzul.pdf §1–89

**Legend**
- ✅ **Done** — implemented in the frontend and working end-to-end against the mock API.
- 🟡 **Partial** — implemented, with a stated gap.
- 🔌 **Backend-dependent** — UI and API contract are complete; the capability itself needs a real service (not faked).
- ➖ **N/A to frontend** — guidance or backend architecture; how the frontend honours it is noted.

Evidence: **U** unit test · **C** API-contract test · **J** user-journey test (Vitest + Testing Library) ·
**E** browser walkthrough (Puppeteer, EN/AR, desktop/mobile) — see `docs/QA.md`.

| § | Requirement | Status | Where | Evidence / notes |
|---|---|---|---|---|
| 1 | Product overview: hotel discovery + booking with Match Score | ✅ | whole app | E |
| 2 | Airbnb-level feature parity | ✅ | see §81 | E |
| 3 | Global navigation — guest header, account menu, mobile bottom nav, host/admin sidebars, role switch | ✅ | `components/layout/*` | E |
| 4 | Homepage | ✅ | `features/home` | E |
| 5 | Search: autocomplete (city/country/hotel/landmark/nearby), dates, flexible ±1/3/7/14, weekend/week/month, monthly, adults/children/infants/pets/rooms, validation | ✅ | `features/search/search-bar.tsx` | E |
| 6 | Match questionnaire under search; 5 questions; admin-configurable | ✅ | `features/search/questionnaire.tsx`, Admin → Match Engine → Questionnaire | E |
| 7 | Match Profile created from answers | ✅ | `PUT /me/match-profile` | C |
| 8 | Hotel Match Score on every hotel, separate from rating | ✅ | `components/match`, all hotel payloads | U, E |
| 9 | Score calculation with weighted factors | ✅ | `lib/match-engine.ts` | U |
| 10 | Explainable score — breakdown, positives, negatives, "Why?" | ✅ | `WhyMatchDialog`, hotel Match section | U, E |
| 11 | Results: list / map / split views | ✅ | `features/results` | E (split is list-only below 1024 px; map via toggle) |
| 12 | Hotel card: carousel, name, location, rating, reviews, nightly & total price, Match, Guest Favorite, availability, cancellation, like, share, compare | ✅ | `components/hotel/hotel-card.tsx` | E |
| 13 | Search ranking (relevance, availability, price, quality, popularity, Match) | 🟡 | `GET /hotels/search` (mock “Recommended” blend) | Ranking quality is a backend concern; 8 sort orders exposed |
| 14 | Full filter system incl. price, rating, type, rooms/beds/baths, amenities, booking options, accessibility, personalised | ✅ | `results/filters-sheet.tsx` (live count, URL state) | C, E |
| 15 | Flexible dates — cheapest / best value / best match | ✅ | results `FlexStrip`, `GET /hotels/:id/flexible-dates` | E |
| 16 | Monthly stays — monthly price, discounts, rules | ✅ | months search mode, monthly cards & banner | E |
| 17 | Categories / discovery, admin-managed | ✅ | home, results strip, Admin → Categories | E |
| 18 | Hotel detail: gallery (fullscreen, tabs, swipe, keys), overview, host, rooms, amenities, accessibility, location, policies, booking card | ✅ | `features/hotel` | E |
| 19 | Hotel Match section with negatives & review-insight link | ✅ | `hotel-page.tsx` | E |
| 20 | Comparison — up to 4, 16 rows, best-in-row, mobile cards | ✅ | `features/compare` | E |
| 21 | Wishlists: multiple, create/rename/delete/move, share link, collaborators, privacy, availability filter, compare saved | ✅ | `features/wishlists` | C, E |
| 22 | Quick like (optimistic) | ✅ | `useToggleLike` | C |
| 23 | Guest Favorites, distinct from Match | ✅ | badge + filter + home explainer | E |
| 24 | Structured reviews (6 categories) | ✅ | hotel reviews, trip review form | C |
| 25 | Verified reviews only (booked + completed) | ✅ | server rule 403/422 + UI gate dialog | C |
| 26 | Review sorting (relevant / recent / highest / lowest) | ✅ | `reviews-section.tsx` | E |
| 27 | Review Insights (topics, %, sentiment) | 🔌 | Review Insights panel | Displays API data; NLP extraction is backend |
| 28 | Insights feed Match Score (noise example) | ✅ | engine noise penalty + hotel insight callout | U |
| 29 | 8-step booking flow with validation, loading, errors | ✅ | `features/booking/checkout-page.tsx` | J, E |
| 30 | Transparent price breakdown | ✅ | `lib/pricing.ts`, `PriceLines` | U |
| 31 | Cancellation policies + refund timeline before paying | ✅ | step 5, trips cancel dialog | U, C |
| 32 | Trips: upcoming / active / completed / cancelled | ✅ | `features/trips` | E |
| 33 | Reservation management: cancel w/ refund, date & guest change requests, help, receipt, review | ✅ | `trip-dialogs.tsx`, `trip-detail-page.tsx` | C, E · receipt is a labelled sample HTML |
| 34 | Messaging: booking context, automated msgs, images, read status, unsend, host inbox | 🟡 | `features/messages` (guest + host scope) | Real-time delivery and attachments are 🔌 |
| 35 | Notifications: 9 types, filters, read state, channel preferences | 🟡 | `features/notifications` | In-app works; email/push delivery 🔌 |
| 36 | Map: price markers, clustering, zoom/pan, my location, search-this-area, landmarks, card↔marker | ✅ | `results-map.tsx` (Leaflet + OSM) | E |
| 37 | Nearby attractions with distance & travel time | ✅ | hotel Location section, host editor | E |
| 38 | Personalised recommendations with signals | 🟡 | home “Recommended for you” | Signals shown; ranking model is backend |
| 39 | Host dashboard | ✅ | `host-dashboard.tsx` | E |
| 40 | Listing management (all sections) | ✅ | `host-listings.tsx` editor | E |
| 41 | Room management | ✅ | `host-rooms.tsx` (validated) | E |
| 42 | Calendar: price, availability, close/reopen, special rates, bulk edit | ✅ | `host-calendar.tsx` | E |
| 43 | Dynamic pricing rules | ✅ | `host-pricing.tsx` | E |
| 44 | Host reservations with state machine | ✅ | `host-reservations.tsx` | J, C |
| 45 | Host reviews & public replies | ✅ | `host-reviews.tsx` | E |
| 46 | Host analytics (occupancy, ADR excl. fees, funnel, cancellations, saves) | ✅ | `host-analytics.tsx` | E · sample metrics |
| 47 | Match analytics for hosts | ✅ | `host-match-insights.tsx` (computed by engine) | E |
| 48 | Admin dashboard: users, hotels, reservations, reviews, reports, payments | ✅ | `features/admin/*` | E |
| 49 | Admin Match Engine: weights =100, boost, min/max, labels, explanation rules, questionnaire editor, live preview, audit | ✅ | `admin-match-engine.tsx` | J, C |
| 50 | Hotel verification (levels, documents, approve/reject/request info) | 🟡 | host wizard step 9, Admin → Hotels | Document upload/storage 🔌 |
| 51 | Host quality system & badges | ✅ | Admin → Hosts, Host → Profile | E |
| 52 | Accessibility filters & listing data | ✅ | filters, hotel page, host editor | E |
| 53 | Guest profile | ✅ | `features/profile` | E |
| 54 | Persistent Match Profile — edit, reset, live preview | ✅ | Profile → Travel preferences | C |
| 55 | Currency EGP/USD, original listing currency kept | ✅ | `useMoney`, header & profile | E |
| 56 | English / Arabic with RTL | ✅ | i18next, `dir` switching, RTL-aware icons/charts/calendar | U (key parity), E |
| 57 | Responsive: desktop / tablet / mobile patterns | ✅ | bottom nav, sheets, stacked tables, mobile booking bar | E |
| 58 | Design system | ✅ | `components/ui`, `/system` | E |
| 59 | Match Score UI identity | ✅ | `MatchRing`, `MatchPill`, `MatchLarge` | E |
| 60 | Auth: sign in/up, roles, reset, verify, session expired | 🔌 | `features/auth`, `app/guards.tsx`, `mocks/server/context.ts` | C · J · E · demo accounts per role, sign-up (guest/host) → verify, forgot → reset, per-tab session, protected routes with `next` return, access-denied, expiry; **mock authentication only** — identity provider/OAuth/email not connected |
| 61 | Security | ➖ | no secrets in client; token header; inputs validated client + server | — |
| 62 | Payment architecture; no raw card storage | 🔌 | checkout step 7 (token only), Admin → Payments, Host → Earnings | C (decline) · provider not connected, labelled |
| 63 | Booking state machine (9 states) | ✅ | mock transitions, trip timeline, host actions | C |
| 64 | Database entities | ➖ | mirrored as `types/models.ts` | — |
| 65 | Search → Ranking → Match → Recommendation pipeline | ➖ | engine is a pure module; `/system` → Architecture | — |
| 66 | Recommendation explainability | ✅ | structured reasons everywhere | U |
| 67 | Fraud & abuse | 🟡 | Admin trust & safety queue, review moderation, reports | Detection is backend |
| 68 | SEO | 🟡 | slug URLs, title/description/canonical/OG/JSON-LD | Needs SSR/prerender 🔌 |
| 69 | Performance | ✅ | route code-splitting, vendor chunks, lazy map/charts/mock server, lazy images | build output in QA.md |
| 70 | Loading, empty, error, retry states | ✅ | skeletons, `EmptyState`, `ErrorState` on every data view | E |
| 71 | Accessibility (WCAG): labels, focus, keyboard, roles, contrast, reduced motion | 🟡 | semantic tables/forms, skip link, aria on meters/radios | No formal audit yet |
| 72 | Analytics events | 🔌 | `lib/analytics.ts` → `POST /events` (15 events wired) | Ingestion backend |
| 73 | Core guest journey | ✅ | home → search → results → hotel → compare/save → book → pay → confirm → trip → review | J, E |
| 74 | Core host journey | ✅ | sign up as host → verify → create listing → rooms → calendar → reservations → reviews → analytics | E |
| 75 | Homepage structure (15 blocks, in order) | ✅ | `home-page.tsx` | E |
| 76 | Search + Match integration | ✅ | Match in ranking, sort, filters, cards | C |
| 77 | Match filtering 70/80/90/95 + sort by Match | ✅ | results chips & sort | C |
| 78 | Search result example | ✅ | card content | E |
| 79 | Rating vs Match distinction | ✅ | Why dialog, `/how-matching-works` | E |
| 80 | Product differentiators | ✅ | all eight present | — |
| 81 | Keep Airbnb-level features (incl. **split stays**) | ✅ | split-stay suggestions on results (`GET /hotels/split-stays`) | C, E |
| 82 | Hotel-specific concepts (room types, inventory, policies per room) | ✅ | models & host tools | — |
| 83 | Technology architecture | ➖ | layered frontend, contract-first API | `docs/ARCHITECTURE.md` |
| 84 | Suggested technology stack | ✅ | exactly the approved stack | `package.json` |
| 85 | Development phases | ➖ | build order followed (shell → home → auth → hotel → booking → dashboards → tests) | git history |
| 86 | Implementation rules (configurable data, no hardcoded hotels in UI, validation, never store cards, …) | ✅ | hotel data only via API; config via Admin | — |
| 87 | Seed data: Cairo, Alexandria, Sharm, Hurghada, Dubai, Paris, London, New York | ✅ | `mocks/hotels.ts` (13 hotels, 8 cities) | — |
| 88 | Definition of done | 🟡 | met for the frontend; backend items above remain | — |
| 89 | Product positioning | ✅ | copy & differentiators | — |

## Role-based product & shared data ecosystem (follow-up brief)

| Requirement | Status | Evidence |
|---|---|---|
| Visitor experience: public browsing; sign-in prompt for save/book/review/message/account; return to the same page | ✅ | J (visitor save prompt, booking resume) · E |
| Guest: dashboard (`/account`), profile, settings, wishlists, trips, trip detail, cancel/change, reviews, notifications, messages | ✅ | C · J · E |
| Host: dashboard, listings create/edit/resubmit, rooms, pricing, calendar/availability, reservations + state machine, messages, reviews/replies, profile, settings, notifications | ✅ | C · J · E |
| Admin: dashboard, users (suspend with reason / reinstate / role), hosts, properties moderation (approve/reject/request info/suspend with note), bookings, reviews moderation, reports, payments, settings, support inbox, notifications | ✅ | C · J · E |
| Auth states: sign in, sign up, verify, forgot, reset, expired, sign out, role switch, persistence, unauthorized handling | ✅ (mock) | C · J · E |
| Role-aware routing: guards, 403 page, 404, deep links, back/forward, `next` return incl. checkout | ✅ | J · E (78 role/route combinations × EN desktop + AR mobile) |
| Single source of truth with stable IDs and relationships; cross-role sync; per-recipient notifications; persistence; reset | ✅ | `services/__tests__/cross-role.test.ts` TEST 1–8 |
| Simulated operations clearly labelled (demo strip, sign-in note, payments, email links) | ✅ | E |

**Summary (89 rows):** 71 ✅ Done · 9 🟡 Partial · 4 🔌 Backend-dependent · 5 ➖ N/A to frontend. Several 🟡 rows are partial only because part of them is backend-dependent (noted per row).
