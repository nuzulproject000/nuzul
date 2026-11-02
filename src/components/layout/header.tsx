/* Global header (§3) — role-aware: visitors see sign-in, guests see their travel areas,
 * hosts and admins see a link back to their own workspace. */
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, ChevronDown, Globe2, LayoutDashboard, LogIn, Search, User } from "lucide-react";
import { Logo } from "@/components/common";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlay";
import { useConversations, useNotifications } from "@/hooks/queries";
import { usePreferences } from "@/stores/preferences.store";
import { roleHome, useSession } from "@/stores/session.store";
import { useAuthGate } from "@/components/auth/auth-gate";
import { cn, initials } from "@/lib/utils";

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

  return (
    <header className="sticky top-0 z-40 border-b border-sand/30 bg-ivory/95 backdrop-blur-md">
      <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between gap-4 px-12 max-lg:px-6 max-md:h-16 max-md:px-4">
        <Link to="/" aria-label="Nuzul home"><Logo /></Link>
        <nav aria-label="Main" className="flex gap-9 max-lg:hidden">
          {nav.map((n) => n.guest && !user ? (
            <button key={n.to} type="button" onClick={() => go(n.to)} className="relative py-2.5 text-xs font-semibold text-charcoal">{t(`nav.${n.key}`)}</button>
          ) : (
            <NavLink key={n.to} to={n.to} end={"end" in n} className={({ isActive }) => cn("relative py-2.5 text-xs font-semibold text-charcoal", isActive && "text-gold after:absolute after:inset-x-0 after:-bottom-[17px] after:h-0.5 after:bg-gold")}>
              {t(`nav.${n.key}`)}{n.badge ? <i className="ms-1 inline-grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[8px] font-bold not-italic text-white">{n.badge}</i> : null}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-5 max-md:gap-3">
          <Link to="/search" className="text-charcoal max-md:hidden" aria-label={t("nav.search")}><Search className="size-[17px]" /></Link>
          <button type="button" onClick={() => setLocale(locale === "en" ? "ar" : "en")} className="flex items-center gap-1.5 text-xs font-semibold text-charcoal max-lg:hidden" aria-label="Switch language"><Globe2 className="size-[17px]" /> {t("nav.language")}</button>
          <button type="button" onClick={() => setCurrency(currency === "EGP" ? "USD" : "EGP")} className="flex items-center gap-1 text-xs font-semibold text-charcoal max-md:hidden" aria-label={`${t("nav.currency")}: ${currency}`}>{currency} <ChevronDown className="size-3.5" /></button>
          {!user && <Link to="/auth/sign-up?role=HOST" className="border-b border-gold py-2 text-xs font-semibold text-charcoal max-lg:hidden">{t("nav.listHotel")}</Link>}
          {user && !isGuest && <Button size="sm" variant="outline" onClick={() => navigate(roleHome(user.role))} className="max-md:hidden"><LayoutDashboard /> {t(user.role === "HOST" ? "nav.hostDashboard" : "nav.adminConsole")}</Button>}
          {user && (
            <Link to={user.role === "GUEST" ? "/notifications" : `${roleHome(user.role)}/notifications`} className="relative text-charcoal" aria-label={`${t("nav.notifications")} (${unread})`}>
              <Bell className="size-[18px]" />
              {unread > 0 && <i className="absolute -end-1.5 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-gold text-[8px] font-bold not-italic text-white">{unread}</i>}
            </Link>
          )}
          {!user && <Button size="sm" onClick={() => navigate(`/auth/sign-in?next=${encodeURIComponent(loc.pathname + loc.search)}`)} className="max-md:hidden"><LogIn /> {t("nav.signIn")}</Button>}
          <DropdownMenu>
            <DropdownMenuTrigger aria-label={t("nav.account")} className={cn("grid size-[38px] place-items-center rounded-full text-xs font-bold max-md:size-[34px]", user ? "bg-navy text-white" : "border border-line bg-paper text-navy")}>
              {user ? initials(user.name) : <User className="size-4" />}
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
