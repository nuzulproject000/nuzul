import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Compass, Heart, LayoutDashboard, LogIn, MessageCircle, Search, User } from "lucide-react";
import { useConversations } from "@/hooks/queries";
import { roleHome, useSession } from "@/stores/session.store";
import { cn } from "@/lib/utils";

/** Mobile bottom navigation (§57) — items depend on who is signed in. */
export function MobileNav() {
  const { t } = useTranslation();
  const loc = useLocation();
  const user = useSession((s) => s.user);
  const { data: convos } = useConversations(user?.role === "GUEST");
  const unread = convos?.reduce((n, c) => n + c.unread, 0) ?? 0;
  const items = !user
    ? [{ to: "/", key: "explore", icon: Compass, end: true }, { to: "/search", key: "search", icon: Search }, { to: `/auth/sign-in?next=${encodeURIComponent(loc.pathname + loc.search)}`, key: "signIn", icon: LogIn }]
    : user.role === "GUEST"
      ? [{ to: "/", key: "explore", icon: Compass, end: true }, { to: "/wishlists", key: "wishlists", icon: Heart }, { to: "/trips", key: "trips", icon: CalendarDays }, { to: "/messages", key: "messages", icon: MessageCircle, badge: unread }, { to: "/account", key: "dashboard", icon: User }]
      : [{ to: "/", key: "explore", icon: Compass, end: true }, { to: "/search", key: "search", icon: Search }, { to: roleHome(user.role), key: user.role === "HOST" ? "hostDashboard" : "adminConsole", icon: LayoutDashboard }];
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 hidden h-[66px] items-center justify-around border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] max-md:flex">
      {items.map(({ to, key, icon: Icon, ...rest }) => (
        <NavLink key={key} to={to} end={"end" in rest} className={({ isActive }) => cn("relative flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 text-[10px]", isActive ? "text-gold" : "text-ink-muted")}>
          <Icon className="size-5" /> <span className="max-w-20 truncate">{t(`nav.${key}`)}</span>
          {"badge" in rest && rest.badge ? <i className="absolute end-2 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[8px] font-bold not-italic text-white">{rest.badge}</i> : null}
        </NavLink>
      ))}
    </nav>
  );
}
