import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BarChart3, BedDouble, Building2, CalendarDays, DollarSign, LayoutDashboard, List, MessageCircle, Percent, Plus, Star, TrendingUp, User } from "lucide-react";
import { DashboardLayout, type DashNavItem } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";

const NAV: DashNavItem[] = [
  { to: "/host", labelKey: "host.nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/host/listings", labelKey: "host.nav.listings", icon: Building2, end: true },
  { to: "/host/listings/new", labelKey: "host.nav.create", icon: Plus },
  { to: "/host/rooms", labelKey: "host.nav.rooms", icon: BedDouble },
  { to: "/host/calendar", labelKey: "host.nav.calendar", icon: CalendarDays },
  { to: "/host/pricing", labelKey: "host.nav.pricing", icon: Percent },
  { to: "/host/reservations", labelKey: "host.nav.reservations", icon: List },
  { to: "/host/messages", labelKey: "host.nav.messages", icon: MessageCircle },
  { to: "/host/earnings", labelKey: "host.nav.earnings", icon: DollarSign },
  { to: "/host/analytics", labelKey: "host.nav.analytics", icon: BarChart3 },
  { to: "/host/match-insights", labelKey: "host.nav.insights", icon: TrendingUp },
  { to: "/host/reviews", labelKey: "host.nav.reviews", icon: Star },
  { to: "/host/profile", labelKey: "host.nav.profile", icon: User },
];

export function HostLayout() {
  const { t } = useTranslation();
  return <DashboardLayout role="host" nav={NAV} eyebrowKey="host.propertyWorkspace" user={{ initials: "RH", name: "Rixos Hotels Egypt", sub: "Top Host · Premium Verified" }} action={<Button variant="gold" asChild className="max-md:min-h-10 max-md:px-3"><Link to="/host/listings/new"><Plus /> {t("host.addListing")}</Link></Button>} />;
}
