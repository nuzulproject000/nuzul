import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Bell, Building2, Search, Settings } from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/common";
import { WhyMatchDialog } from "@/components/match";
import { cn } from "@/lib/utils";

export type DashNavItem = { to: string; labelKey: string; icon: LucideIcon; end?: boolean };

/** Shared shell for Host & Admin (§3). Sidebar on desktop, section picker on mobile (§57). */
export function DashboardLayout({ role, nav, eyebrowKey, user, action }: { role: "host" | "admin"; nav: DashNavItem[]; eyebrowKey: string; user: { initials: string; name: string; sub: string }; action?: React.ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = [...nav].sort((a, b) => b.to.length - a.to.length).find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to))) ?? nav[0];
  return (
    <div className="grid min-h-screen grid-cols-[250px_1fr] bg-dash max-lg:grid-cols-[210px_1fr] max-md:block">
      <a href="#main" className="fixed start-2 top-2 z-[400] -translate-y-[300%] bg-navy px-3.5 py-2.5 text-xs text-white focus:translate-y-0">{t("nav.skip")}</a>
      <aside className="sticky top-0 flex h-screen flex-col bg-navy px-5 py-7 text-white max-md:hidden">
        <Link to="/" aria-label="Nuzul home"><Logo light /></Link>
        <span className="mx-2.5 mt-6 mb-3 text-[9px] tracking-[0.18em] text-sand uppercase">{t(role === "host" ? "host.workspace" : "admin.administration")}</span>
        <nav aria-label={role} className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
          {nav.map(({ to, labelKey, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("flex items-center gap-3 rounded-md px-3 py-2.5 text-[12px] text-[#adb6c0] hover:text-white", isActive && "bg-sand/15 text-sand")}>
              <Icon className="size-4 shrink-0" /> {t(labelKey)}
            </NavLink>
          ))}
        </nav>
        <Link to={role === "host" ? "/admin" : "/host"} className="mt-1.5 flex items-center gap-3 border-t border-white/10 px-3 pt-3 pb-2 text-[12px] text-[#adb6c0] hover:text-white">{role === "host" ? <Settings className="size-4" /> : <Building2 className="size-4" />} {t(role === "host" ? "nav.switchToAdmin" : "nav.switchToHost")}</Link>
        <Link to="/" className="flex items-center gap-3 px-3 py-2 text-[12px] text-[#adb6c0] hover:text-white"><ArrowLeft className="size-4 rtl:rotate-180" /> {t("nav.backToMarketplace")}</Link>
        <div className="mt-2.5 flex items-center gap-2.5 border-t border-white/10 px-2 pt-4">
          <span className="grid size-[34px] place-items-center rounded-full bg-sand text-[10px] font-bold text-navy">{user.initials}</span>
          <div className="flex flex-col"><b className="text-[11px]">{user.name}</b><small className="mt-0.5 text-[9px] text-[#7e8996]">{user.sub}</small></div>
        </div>
      </aside>
      <section className="min-w-0">
        <header className="flex h-[88px] items-center justify-between gap-4 border-b border-line bg-ivory px-9 max-md:h-auto max-md:flex-wrap max-md:px-4 max-md:py-3.5">
          <div>
            <span className="eyebrow mb-1 text-[9px]">{t(eyebrowKey)}</span>
            <h1 className="m-0 text-[25px] tracking-tight">{t(current.labelKey)}</h1>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="dash-section">Section</label>
            <select id="dash-section" value={current.to} onChange={(e) => navigate(e.target.value)} className="hidden min-h-10 border border-line bg-paper px-2.5 text-[13px] font-bold text-navy max-md:block">
              {nav.map((n) => <option key={n.to} value={n.to}>{t(n.labelKey)}</option>)}
            </select>
            <Link to="/" className="grid size-11 place-items-center rounded-full border border-line text-navy max-md:hidden md:hidden" aria-hidden><Search className="size-4" /></Link>
            <Link to="/notifications" className="relative grid size-11 place-items-center rounded-full border border-line text-navy max-md:hidden" aria-label={t("nav.notifications")}><Bell className="size-[18px]" /><i className="absolute end-2.5 top-2 size-1.5 rounded-full bg-gold" /></Link>
            {action}
          </div>
        </header>
        <main id="main" className="flex flex-col gap-4 px-9 pt-7 pb-16 max-md:px-4 max-md:pt-4"><Outlet /></main>
      </section>
      <WhyMatchDialog />
    </div>
  );
}
