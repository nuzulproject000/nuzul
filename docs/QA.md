# QA report

Date: 2 Nov 2026 · Build: `npm run build` ✅ · Tests: `npm test` ✅ 40/40 · i18n: `npm run i18n:check` ✅ 0 missing (EN/AR)

## Automated tests (Vitest + Testing Library, jsdom)

| Suite | What it proves |
|---|---|
| `lib/__tests__/match-engine.test.ts` | weights total 100; bounded scores with all 8 factors; Match ≠ rating; noise penalty only for quiet-seekers; budget negatives; admin weights change scores |
| `lib/__tests__/pricing.test.ts` | fee/tax breakdown, long-stay discount at 7 nights, per-room multiplication, all refund-policy checkpoints, currency & nights |
| `i18n/__tests__/i18n.test.ts` | Arabic covers every English key; interpolation variables match |
| `services/__tests__/api-contracts.test.ts` | search pagination/sort/min-match, slug 404, booking validation (422 + field errors), capacity, payment decline (402, no booking), create → cancel → refund, host state machine incl. illegal transition (409), verified-review rules (403/422), wishlists create/like/move/unlike, Match Engine config validation + recalculation + audit, profile changes scores, auth errors, split stays |
| `test/journeys/journeys.test.tsx` (real router + UI) | sign-in validation → wrong password → host lands on `/host`; full 8-step checkout incl. policy-consent gate → confirmation → booking exists; host confirms a pending reservation; admin cannot publish weights ≠ 100 |

## Browser walkthroughs (Puppeteer against `npm run dev`)

* **Route sweep** — all 47 routes (guest, host, admin, auth, system, 404) in **English/LTR at 1440 px** and
  **Arabic/RTL at 390 px**: no runtime errors, no horizontal overflow, no untranslated keys
  (one untranslated-key defect on Admin → Reports was found and fixed in this pass).
* **Booking journey** — hotel page → “Choose a room” → 8 steps → missing-consent error → invalid email error →
  simulated decline (error shown, no booking) → success → confirmation → trip listed.
* **Visual review** against the v2 Figma Make reference: home, results (list/split/map), hotel, checkout,
  confirmation, trips, trip detail, messages, notifications, profile, wishlists, compare, auth, host
  dashboard/calendar/reservations, admin match engine — desktop, tablet (820 px) and mobile (390 px, Arabic).

## Fixed during QA

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
* Route guards for `/host` and `/admin` must be enforced by the API; the mock session does not restrict them.
* No formal WCAG audit yet (semantic structure, labels, focus and keyboard paths were checked manually).
* Hotel content (names, descriptions, review text) is sample data in English; UI chrome is fully bilingual.
* `charts` vendor chunk (≈110 kB gzip) loads only on host/admin analytics pages.
