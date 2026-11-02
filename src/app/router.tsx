import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, type RouteObject } from "react-router-dom";
import { FocusLayout, GuestLayout } from "@/components/layout/guest-layout";
import { HostLayout } from "@/features/host/host-layout";
import { AdminLayout } from "@/features/admin/admin-layout";
import { RouteError } from "@/features/misc/route-error";

/* Route-level code splitting keeps the first load small (§69). */
const page = (loader: () => Promise<{ default: React.ComponentType }>) => {
  const C = lazy(loader);
  return <Suspense fallback={<PageFallback />}><C /></Suspense>;
};
function PageFallback() { return <div className="container-page py-16" aria-busy="true"><div className="skeleton h-10 w-1/3" /><div className="skeleton mt-6 h-64" /></div>; }
function Root({ children }: { children?: ReactNode }) { return <>{children ?? <Outlet />}<ScrollRestoration /></>; }

export const routes: RouteObject[] = [
  {
    element: <Root />,
    errorElement: <RouteError />,
    children: [
      {
        element: <GuestLayout />,
        children: [
          { index: true, element: page(() => import("@/features/home/home-page")) },
          { path: "search", element: page(() => import("@/features/results/results-page")) },
          { path: "hotels/*", element: page(() => import("@/features/hotel/hotel-page")) },
          { path: "compare", element: page(() => import("@/features/compare/compare-page")) },
          { path: "wishlists/:id?", element: page(() => import("@/features/wishlists/wishlists-page")) },
          { path: "trips", element: page(() => import("@/features/trips/trips-page")) },
          { path: "trips/:id", element: page(() => import("@/features/trips/trip-detail-page")) },
          { path: "messages/:id?", element: page(() => import("@/features/messages/messages-page")) },
          { path: "notifications", element: page(() => import("@/features/notifications/notifications-page")) },
          { path: "profile/:section?", element: page(() => import("@/features/profile/profile-page")) },
          { path: "system", element: page(() => import("@/features/system/system-page")) },
          { path: "how-matching-works", element: page(() => import("@/features/system/how-matching-page")) },
          { path: "*", element: page(() => import("@/features/misc/not-found-page")) },
        ],
      },
      {
        element: <FocusLayout />,
        children: [
          { path: "book/:hotelId", element: page(() => import("@/features/booking/checkout-page")) },
          { path: "booking/confirmation/:id", element: page(() => import("@/features/booking/confirmation-page")) },
          { path: "auth", element: <Navigate to="/auth/sign-in" replace /> },
          { path: "auth/:mode", element: page(() => import("@/features/auth/auth-page")) },
        ],
      },
      {
        path: "host",
        element: <HostLayout />,
        children: [
          { index: true, element: page(() => import("@/features/host/host-dashboard")) },
          { path: "listings", element: page(() => import("@/features/host/host-listings")) },
          { path: "listings/new", element: page(() => import("@/features/host/host-create-listing")) },
          { path: "rooms", element: page(() => import("@/features/host/host-rooms")) },
          { path: "calendar", element: page(() => import("@/features/host/host-calendar")) },
          { path: "pricing", element: page(() => import("@/features/host/host-pricing")) },
          { path: "reservations", element: page(() => import("@/features/host/host-reservations")) },
          { path: "messages/:id?", element: page(() => import("@/features/host/host-messages")) },
          { path: "earnings", element: page(() => import("@/features/host/host-earnings")) },
          { path: "analytics", element: page(() => import("@/features/host/host-analytics")) },
          { path: "match-insights", element: page(() => import("@/features/host/host-match-insights")) },
          { path: "reviews", element: page(() => import("@/features/host/host-reviews")) },
          { path: "profile", element: page(() => import("@/features/host/host-profile")) },
        ],
      },
      {
        path: "admin",
        element: <AdminLayout />,
        children: [
          { index: true, element: page(() => import("@/features/admin/admin-dashboard")) },
          { path: "users", element: page(() => import("@/features/admin/admin-users")) },
          { path: "hotels", element: page(() => import("@/features/admin/admin-hotels")) },
          { path: "hosts", element: page(() => import("@/features/admin/admin-hosts")) },
          { path: "reservations", element: page(() => import("@/features/admin/admin-reservations")) },
          { path: "reviews", element: page(() => import("@/features/admin/admin-reviews")) },
          { path: "reports", element: page(() => import("@/features/admin/admin-reports")) },
          { path: "payments", element: page(() => import("@/features/admin/admin-payments")) },
          { path: "categories", element: page(() => import("@/features/admin/admin-categories")) },
          { path: "match-engine", element: page(() => import("@/features/admin/admin-match-engine")) },
          { path: "analytics", element: page(() => import("@/features/admin/admin-analytics")) },
          { path: "settings", element: page(() => import("@/features/admin/admin-settings")) },
        ],
      },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
