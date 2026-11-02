import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, ChevronDown, Globe2, Search, User } from "lucide-react";
import { Logo } from "@/components/common";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlay";
import { useNotifications } from "@/hooks/queries";
import { usePreferences } from "@/stores/preferences.store";
import { useSession } from "@/stores/session.store";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { to: "/", key: "stays", end: true },
  { to: "/search", key: "explore" },
  { to: "/wishlists", key: "wishlists" },
  { to: "/trips", key: "trips" },
  { to: "/messages", key: "messages" },
] as const;

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale, setLocale, currency, setCurrency } = usePreferences();
  const { user, signOut } = useSession();
  const { data: notifications } = useNotifications();
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <header className="sticky top-0 z-40 border-b border-sand/30 bg-ivory/95 backdrop-blur-md">
      <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between gap-4 px-12 max-lg:px-6 max-md:h-16 max-md:px-4">
        <Link to="/" aria-label="Nuzul home"><Logo /></Link>
        <nav aria-label="Main" className="flex gap-9 max-lg:hidden">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={"end" in n} className={({ isActive }) => cn("relative py-2.5 text-xs font-semibold text-charcoal", isActive && "text-gold after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-gold")}>{t(`nav.${n.key}`)}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-5 max-md:gap-3">
          <Link to="/search" className="text-charcoal max-md:hidden" aria-label={t("nav.search")}><Search className="size-[17px]" /></Link>
          <button type="button" onClick={() => setLocale(locale === "en" ? "ar" : "en")} className="flex items-center gap-1.5 text-xs font-semibold text-charcoal max-lg:hidden" aria-label="Switch language"><Globe2 className="size-[17px]" /> {t("nav.language")}</button>
          <button type="button" onClick={() => setCurrency(currency === "EGP" ? "USD" : "EGP")} className="flex items-center gap-1 text-xs font-semibold text-charcoal max-md:hidden" aria-label={`${t("nav.currency")}: ${currency}`}>{currency} <ChevronDown className="size-3.5" /></button>
          <Link to="/host/listings/new" className="border-b border-gold py-2 text-xs font-semibold text-charcoal max-lg:hidden">{t("nav.listHotel")}</Link>
          <Link to="/notifications" className="relative text-charcoal" aria-label={`${t("nav.notifications")} (${unread})`}>
            <Bell className="size-[18px]" />
            {unread > 0 && <i className="absolute -end-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold text-[8px] font-bold not-italic text-white">{unread}</i>}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={t("nav.account")} className="grid size-[38px] place-items-center rounded-full bg-navy text-xs font-bold text-white max-md:size-[34px]">
              {user ? initials(user.name) : <User className="size-4" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {user && <DropdownMenuLabel>{user.name}</DropdownMenuLabel>}
              {[["/profile", "profile"], ["/trips", "trips"], ["/wishlists", "wishlists"], ["/messages", "messages"], ["/notifications", "notifications"]].map(([to, k]) => <DropdownMenuItem key={to} onSelect={() => navigate(to)}>{t(`nav.${k}`)}</DropdownMenuItem>)}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate("/host")}>{t("nav.hostDashboard")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/admin")}>{t("nav.adminConsole")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate("/system")}>{t("nav.designSystem")}</DropdownMenuItem>
              <DropdownMenuItem className="lg:hidden" onSelect={() => setLocale(locale === "en" ? "ar" : "en")}><Globe2 /> {t("nav.language")}</DropdownMenuItem>
              <DropdownMenuItem className="md:hidden" onSelect={() => setCurrency(currency === "EGP" ? "USD" : "EGP")}>{t("nav.currency")}: {currency === "EGP" ? "USD" : "EGP"}</DropdownMenuItem>
              <DropdownMenuSeparator />
              {user ? <DropdownMenuItem onSelect={() => { signOut(); navigate("/auth/sign-in"); }}>{t("nav.signOut")}</DropdownMenuItem> : <DropdownMenuItem onSelect={() => navigate("/auth/sign-in")}>{t("nav.signIn")}</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
