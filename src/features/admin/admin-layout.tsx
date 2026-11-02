import { MessageCircle, BarChart3, Building2, Compass, CreditCard, Flag, LayoutDashboard, List, Settings, ShieldCheck, SlidersHorizontal, Star, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardLayout, type DashNavItem } from "@/components/layout/dashboard-layout";

const NAV: DashNavItem[] = [
  { to: "/admin", labelKey: "admin.nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/users", labelKey: "admin.nav.users", icon: Users },
  { to: "/admin/hotels", labelKey: "admin.nav.hotels", icon: Building2 },
  { to: "/admin/hosts", labelKey: "admin.nav.hosts", icon: ShieldCheck },
  { to: "/admin/reservations", labelKey: "admin.nav.reservations", icon: List },
  { to: "/admin/reviews", labelKey: "admin.nav.reviews", icon: Star },
  { to: "/admin/reports", labelKey: "admin.nav.reports", icon: Flag },
  { to: "/admin/messages", labelKey: "admin.nav.support", icon: MessageCircle },
  { to: "/admin/payments", labelKey: "admin.nav.payments", icon: CreditCard },
  { to: "/admin/categories", labelKey: "admin.nav.categories", icon: Compass },
  { to: "/admin/match-engine", labelKey: "admin.nav.matchEngine", icon: SlidersHorizontal },
  { to: "/admin/analytics", labelKey: "admin.nav.analytics", icon: BarChart3 },
  { to: "/admin/settings", labelKey: "admin.nav.settings", icon: Settings },
];

export function AdminLayout() {
  const { t } = useTranslation();
  return <DashboardLayout role="admin" nav={NAV} eyebrowKey="admin.operations" sub={t("auth.role.ADMIN")} />;
}
