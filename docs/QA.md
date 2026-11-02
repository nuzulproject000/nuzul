# QA report

Date: 2 Nov 2026 · Build: `npm run build` ✅ · Tests: `npm test` ✅ 57/57 · i18n: `npm run i18n:check` ✅ 0 missing (EN/AR)

## Automated tests (Vitest + Testing Library, jsdom)

| Suite | What it proves |
|---|---|
| `lib/__tests__/match-engine.test.ts` | weights total 100; bounded scores with all 8 factors; Match ≠ rating; noise penalty only for quiet-seekers; budget negatives; admin weights change scores |
| `lib/__tests__/pricing.test.ts` | fee/tax breakdown, long-stay discount at 7 nights, per-room multiplication, all refund-policy checkpoints, currency & nights |
| `i18n/__tests__/i18n.test.ts` | Arabic covers every English key; interpolation variables match |
| `services/__tests__/api-contracts.test.ts` | search pagination/sort/min-match, slug 404, booking validation (422 + field errors), capacity, payment decline (402, no booking), create → cancel → refund, host state machine incl. illegal transition (409), verified-review rules (403/422), wishlists create/like/move/unlike, Match Engine config validation + recalculation + audit, profile changes scores, auth errors, split stays |
| `services/__tests__/cross-role.test.ts` | **TEST 1** host creates listing → hidden from visitors → admin notified & approves → public in search/detail → host notified · **TEST 2** rejection needs a reason → host sees note + notification → still private → resubmit → admin notified → other host can't edit · **TEST 3** guest books → host sees reservation, inventory −1, notification, duplicate refused → host cancels → inventory restored → guest sees state + notification → other guest can't open it · **TEST 4** guest ↔ host messages both ways with unread counts and notifications; non-participants 403/404; visitor 401; support thread reaches admin · **TEST 5** verified review public → admin removal needs reason → hidden + count updated → author notified · **TEST 6** host price change → calendar, detail and new booking total; closed night → availability blocked + 409 → reopened → bookable · **TEST 7** suspended guest: login refused, open session read-only, writes 403; suspended host's hotels hidden until reinstated; admin can't suspend self; suspended property not bookable · **TEST 8** data persisted to `localStorage`, session in `sessionStorage`, survives reload, reset restores seed |
| `test/journeys/journeys.test.tsx` (real router + UI) | visitor save → sign-in prompt; visitor opens checkout → sign-in with `next` → demo guest → returns to the same checkout step; sign-in validation → wrong password → host lands on `/host`; forgot → reset link → new password; guest opening `/admin` gets 403 page; full 8-step checkout → confirmation → booking exists; host confirms a pending reservation; admin cannot publish weights ≠ 100 |

## Browser walkthroughs (Puppeteer against `npm run dev`)

* **Role route sweep** — 59 routes as visitor, guest, host and admin (incl. cross-role attempts: visitor → `/trips` and `/host`
  redirect to sign-in; guest → `/admin` and host → `/trips` show the 403 page) in **English/LTR at 1440 px** and
  **Arabic/RTL at 390 px**: correct destination, no runtime errors, no horizontal overflow, no untranslated keys.
* **Booking journey** — hotel page → “Choose a room” → 8 steps → missing-consent error → invalid email error →
  simulated decline (error shown, no booking) → success → confirmation → trip listed.
* **Visual review** against the v2 Figma Make reference: home, results (list/split/map), hotel, checkout,
  confirmation, trips, trip detail, messages, notifications, profile, wishlists, compare, auth, host
  dashboard/calendar/reservations, admin match engine — desktop, tablet (820 px) and mobile (390 px, Arabic).

## Fixed during QA

* New messages sorted before seeded ones dated later than the clock → message timestamps are now monotonic per thread.
* Auth prompt state leaked between tests → reset in test setup.
* Skip-link visible at the top edge on long pages → translated off-screen until focused.
* Map framed every alternative worldwide → frames the searched destination.
* Split view cramped on tablets → list + map toggle below 1024 px.
* Split-stay suggestions listed the same pair twice (A→B / B→A) → de-duplicated.
* Confirmation copy claimed an email was sent → now states emails start once the notification service is connected.
* Arabic keys for report statuses were nested in the wrong object → moved; added exact-path verification.
* Vite 8 rejected object-form `manualChunks`; `react` chunk captured `react-hook-form` → function form with exact package prefixes.

## Known limitations

* Backend-dependent capabilities (see `REQUIREMENTS.md` 🔌): payments provider, identity provider/OAuth,
  email/push delivery, real-time messaging and attachments, document/media upload, NLP Review Insights,
  analytics ingestion, SSR for SEO.
* Authentication is a frontend demonstration (`mock.<userId>` tokens, any password ≥ 8 characters). The mock API enforces
  roles and ownership so the UI behaves correctly, but a real backend must enforce the same rules.
* Real-time delivery is simulated by polling (messages 10 s, conversations 15 s) and cross-tab `storage` events.
* No formal WCAG audit yet (semantic structure, labels, focus and keyboard paths were checked manually).
* Hotel content (names, descriptions, review text) is sample data in English; UI chrome is fully bilingual.
* `charts` vendor chunk (≈110 kB gzip) loads only on host/admin analytics pages.
