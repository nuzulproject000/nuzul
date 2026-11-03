/* Global header (§3) — role-aware: visitors see sign-in, guests see their travel areas,
 * hosts and admins see a link back to their own workspace. */
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, Globe2, LayoutDashboard, LogIn, Search, User } from "lucide-react";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlay";
import { useConversations, useNotifications } from "@/hooks/queries";
import { usePreferences } from "@/stores/preferences.store";
import { roleHome, useSession } from "@/stores/session.store";
import { useAuthGate } from "@/components/auth/auth-gate";
import { cn, initials } from "@/lib/utils";
import { CurrencyMenu } from "@/components/preferences/currency-menu";

/** Routes that open with a full-bleed hero image: the header overlays it while at the top. */
export const HERO_ROUTES = ["/"];

/** True once the page has scrolled — drives the header shadow / solid state. */
function useScrolled(threshold = 4) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > threshold);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [threshold]);
  return scrolled;
}

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loc = useLocation();
  const gate = useAuthGate();
  const { locale, setLocale, currency, setCurrency } = usePreferences();
  const { user, signOut } = useSession();
  const isGuest = user?.role === "GUEST";
  const { data: notifications } = useNotifications(!!user);
  const { data: convos } = useConversations(isGuest);
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const unreadMsgs = convos?.reduce((n, c) => n + c.unread, 0) ?? 0;
  const nav = [
    { to: "/", key: "stays", end: true, guest: false },
    { to: "/search", key: "explore", guest: false },
    { to: "/wishlists", key: "wishlists", guest: true },
    { to: "/trips", key: "trips", guest: true },
    { to: "/messages", key: "messages", guest: true, badge: unreadMsgs },
  ].filter((n) => !n.guest || !user || isGuest);
  const go = (to: string) => gate("account", () => navigate(to), to);
  const signOutNow = () => { signOut(); navigate("/", { replace: true }); };
  const scrolled = useScrolled();
  /** Transparent header with white content over the hero, until the page scrolls. */
  const overlay = HERO_ROUTES.includes(loc.pathname) && !scrolled;
  const ink = overlay ? "text-white" : "text-charcoal";

  return (
    <header data-overlay={overlay || undefined} className={cn("sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-200", overlay ? "border-transparent bg-transparent" : scrolled ? "border-line/70 bg-ivory shadow-[0_6px_24px_rgb(15_28_46/.08)]" : "border-sand/30 bg-ivory")}>
      <div className="mx-auto flex h-[calc(var(--header-h)-1px)] max-w-[1440px] items-center justify-between gap-4 px-12 max-lg:px-6 max-md:px-4">
        <Link to="/" aria-label="Nuzul home" className="transition-colors duration-200"><Logo light={overlay} /></Link>
        <nav aria-label="Main" className="flex gap-9 max-lg:hidden">
          {nav.map((n) => n.guest && !user ? (
            <button key={n.to} type="button" onClick={() => go(n.to)} className={cn("relative py-2.5 text-xs font-semibold transition-colors duration-200 hover:opacity-80", ink)}>{t(`nav.${n.key}`)}</button>
          ) : (
            <NavLink key={n.to} to={n.to} end={"end" in n} className={({ isActive }) => cn("relative py-2.5 text-xs font-semibold transition-colors duration-200 hover:opacity-80", ink, isActive && (overlay ? "text-sand after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-sand" : "text-gold after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-gold"))}>
              {t(`nav.${n.key}`)}{n.badge ? <i className="ms-1 inline-grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[8px] font-bold not-italic text-white">{n.badge}</i> : null}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-4 max-md:gap-3">
          <Link to="/search" className={cn("transition-colors duration-200 hover:opacity-80 max-md:hidden", ink)} aria-label={t("nav.search")}><Search className="size-[17px]" /></Link>
          <button type="button" onClick={() => setLocale(locale === "en" ? "ar" : "en")} className={cn("flex cursor-pointer items-center gap-1.5 py-1.5 text-xs font-semibold transition-colors duration-200 hover:opacity-80 max-lg:hidden", ink)} aria-label="Switch language"><Globe2 className="size-[17px]" /> {t("nav.language")}</button>
          <CurrencyMenu className={cn("max-md:hidden", ink)} />
          {!user && <Link to="/auth/sign-up?role=HOST" className={cn("border-b py-2 text-xs font-semibold transition-colors duration-200 hover:opacity-80 max-lg:hidden", ink, overlay ? "border-sand" : "border-gold")}>{t("nav.listHotel")}</Link>}
          {user && !isGuest && <Button size="sm" variant="outline" onClick={() => navigate(roleHome(user.role))} className={cn("max-md:hidden", overlay && "border-white/50 text-white hover:text-white/75")}><LayoutDashboard /> {t(user.role === "HOST" ? "nav.hostDashboard" : "nav.adminConsole")}</Button>}
          {user && (
            <Link to={user.role === "GUEST" ? "/notifications" : `${roleHome(user.role)}/notifications`} className={cn("relative transition-colors duration-200 hover:opacity-80", ink)} aria-label={`${t("nav.notifications")} (${unread})`}>
              <Bell className="size-[18px]" />
              {unread > 0 && <i className="absolute -end-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold text-[8px] font-bold not-italic text-white">{unread}</i>}
            </Link>
          )}
          {!user && <Button size="sm" onClick={() => navigate(`/auth/sign-in?next=${encodeURIComponent(loc.pathname + loc.search)}`)} className="max-md:hidden"><LogIn /> {t("nav.signIn")}</Button>}
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={t("nav.account")} className={cn("grid size-[38px] cursor-pointer place-items-center rounded-full text-xs font-bold transition-colors duration-200 max-md:size-[34px]", user ? "bg-navy text-white hover:opacity-80" : cn("hover:opacity-80", overlay ? "text-white" : "text-navy"))}>
              {user ? initials(user.name) : <User className="size-[18px]" />}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {user ? <DropdownMenuLabel><span className="flex flex-col"><span>{user.name}</span><small className="text-[10px] font-normal text-ink-muted">{t(`auth.role.${user.role}`)} · {user.email}</small></span></DropdownMenuLabel> : <DropdownMenuLabel>{t("nav.visitor")}</DropdownMenuLabel>}
              {isGuest && [["/account", "dashboard"], ["/trips", "trips"], ["/wishlists", "wishlists"], ["/messages", "messages"], ["/notifications", "notifications"], ["/profile", "profile"]].map(([to, k]) => <DropdownMenuItem key={to} onSelect={() => navigate(to)}>{t(`nav.${k}`)}</DropdownMenuItem>)}
              {user && !isGuest && <DropdownMenuItem onSelect={() => navigate(roleHome(user.role))}>{t(user.role === "HOST" ? "nav.hostDashboard" : "nav.adminConsole")}</DropdownMenuItem>}
              {!user && <>
                <DropdownMenuItem onSelect={() => navigate(`/auth/sign-in?next=${encodeURIComponent(loc.pathname + loc.search)}`)}>{t("nav.signIn")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/auth/sign-up")}>{t("auth.createAccount")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate("/auth/sign-up?role=HOST")}>{t("nav.listHotel")}</DropdownMenuItem>
              </>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate("/how-matching-works")}>{t("nav.howMatching")}</DropdownMenuItem>
              <DropdownMenuItem className="lg:hidden" onSelect={() => setLocale(locale === "en" ? "ar" : "en")}><Globe2 /> {t("nav.language")}</DropdownMenuItem>
              <DropdownMenuItem className="md:hidden" onSelect={() => setCurrency(currency === "EGP" ? "USD" : "EGP")}>{t("nav.currency")}: {currency === "EGP" ? "USD" : "EGP"}</DropdownMenuItem>
              {user && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={signOutNow}>{t("nav.signOut")}</DropdownMenuItem></>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
