import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Compass, Heart, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", key: "explore", icon: Compass, end: true },
  { to: "/wishlists", key: "wishlists", icon: Heart },
  { to: "/trips", key: "trips", icon: CalendarDays },
  { to: "/messages", key: "messages", icon: MessageCircle },
  { to: "/profile", key: "profile", icon: User },
];

/** Mobile bottom navigation (§57). */
export function MobileNav() {
  const { t } = useTranslation();
  return (
    <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-50 hidden h-[66px] items-center justify-around border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] max-md:flex">
      {ITEMS.map(({ to, key, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => cn("flex min-h-12 min-w-14 flex-col items-center justify-center gap-1 text-[10px]", isActive ? "text-gold" : "text-ink-muted")}>
          <Icon className="size-5" /> {t(`nav.${key}`)}
        </NavLink>
      ))}
    </nav>
  );
}
