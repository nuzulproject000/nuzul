# Nuzul — web frontend

Hotel discovery and booking platform with a personal, explainable **Match Score** (Nuzul spec §1–89).
Guest, Host and Admin experiences in English (LTR) and Arabic (RTL), desktop / tablet / mobile.

> **Status:** production-grade frontend running against an in-browser **mock backend** that implements
> the REST contracts in `src/types/api.ts`. Payments, authentication, email/push delivery, real-time
> messaging, file storage, NLP and analytics ingestion are **not live** — the UI says so wherever it matters.
> See [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) for the section-by-section status.

## Quick start

```bash
npm install          # Node ≥ 20 (Node ≥ 22.18 for scripts/i18n-check.mjs)
npm run dev          # http://localhost:5173
npm test             # Vitest: unit, API-contract, cross-role and user-journey tests
npm run build        # type-check + production build to dist/
npm run i18n:check   # every translation key used in src/ exists in en.ts and ar.ts
```

### Demo accounts and data (frontend only — mock authentication)

The app opens as a **visitor**: anyone can browse, search, compare and read reviews. Saving, booking, messaging,
reviews and the account area ask you to sign in and then bring you back to where you were.

| Role | Email | Lands on |
|---|---|---|
| Guest | `nadia@example.com` | `/account` |
| Host | `partners@rixos.example` | `/host` |
| Admin | `ops@nuzul.example` | `/admin` |

Any password of 8+ characters works (the sign-in page also has one-click demo buttons). Other seeded accounts:
`james@example.com`, `hassan@example.com` (guests), `info@nilehouse.example` (host). New guest or host accounts can be
created with **Sign up** (verification code: any 6 digits).

**All roles share one demo dataset** in this browser (`localStorage` → `nuzul.mockdb`): a booking made by the guest appears in
the host's reservations, a listing created by the host waits in the admin queue, an admin suspension hides the host's
listings, and so on — with notifications to the right people. Sessions are **per tab** unless you tick “Keep me signed in”,
so you can keep a guest tab and a host tab open side by side; changes sync between tabs.
Use **Footer → Reset demo data** to restore the seed for everyone.

> Mock authentication, payments, email and notifications are **simulated in the browser** for demonstration.
> They are not secure and nothing leaves the device. See `docs/ARCHITECTURE.md` → *Backend responsibilities*.

Useful test inputs:

| Where | Input | Result |
|---|---|---|
| Sign in | password `wrongpassword` | 401 "Email or password is incorrect" |
| Verify email | code `000000` | expired-code error (any other 6 digits succeed) |
| Forgot password | any registered email | a demo reset link is shown on screen instead of being emailed |
| Checkout → Payment | tick "simulate a declined payment" | 402 decline, no booking created |
| Host → Calendar | close a night | guests can no longer book stays that include it |

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui pattern on Radix UI · React Router 7 (lazy routes) ·
TanStack Query · Axios · Zustand · React Hook Form + Yup · i18next · React DayPicker · date-fns · Embla ·
React Leaflet + OpenStreetMap · Recharts · Lucide · Sonner · Vitest + Testing Library — per `Nuzul_Frontend_Tech_Stack.pdf`.

## Project layout

```
src/
  app/            router (code-split routes), providers, path helpers
  components/     ui/ (design-system primitives) · common/ · match/ (Match Score UI) · hotel/ · layout/ · dashboard/
  features/       one folder per area: home, search, results, hotel, booking, trips, wishlists, compare,
                  messages, notifications, profile, auth, system, host/*, admin/*
  hooks/          queries.ts (all server state via TanStack Query), formatting, share
  services/       typed API clients — the only code that knows URLs
  mocks/          seed data + mock REST server (route table, validation, state machine)
  lib/            match-engine (pure), pricing, currency, dates, analytics, forms, receipt
  stores/         client state: preferences, search, compare, session, ui
  i18n/           en.ts / ar.ts dictionaries
  types/          domain models (§64) and API contracts
docs/             architecture, requirements checklist, QA report
```

## Connecting a real backend

1. Implement the endpoints listed in `docs/ARCHITECTURE.md` (shapes in `src/types/api.ts` / `models.ts`).
2. Set `VITE_USE_MOCKS=false` and `VITE_API_BASE_URL=https://…/v1` (see `.env.example`).
3. Nothing in `features/` or `components/` changes; the mock server is lazy-loaded and dropped from the bundle.

## Design source

Visual reference: Figma Make “Nuzul Hotel Discovery Platform — v2 (Spec-complete)”
(`figma.com/make/DPvd2950xahoNLDH84JQwJ`). Neither Figma file was modified by this project.
