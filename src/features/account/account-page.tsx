/* Guest dashboard: one place to see the next trip, messages, notifications, saved stays and the Match Profile. */
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Bell, CalendarDays, Heart, LifeBuoy, MessageCircle, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingStateBadge, EmptyState, PageHeader } from "@/components/common";
import { MatchPill } from "@/components/match";
import { useConversations, useHotel, useMatchProfile, useMyBookings, useNotifications, useStartConversation, useWishlists } from "@/hooks/queries";
import { useDates } from "@/hooks/use-format";
import { useSession } from "@/stores/session.store";
import { tabOf } from "@/features/trips/trip-state";
import { cn } from "@/lib/utils";

export default function AccountPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { date } = useDates();
  const user = useSession((s) => s.user)!;
  const { data: bookings, isLoading } = useMyBookings();
  const { data: convos } = useConversations();
  const { data: notes } = useNotifications();
  const { data: lists } = useWishlists();
  const { data: profile } = useMatchProfile();
  const start = useStartConversation();
  const upcoming = (bookings ?? []).filter((b) => tabOf(b.state) === "UPCOMING" || tabOf(b.state) === "ACTIVE").sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const toReview = (bookings ?? []).filter((b) => b.state === "COMPLETED" && !b.reviewed);
  const unreadMsgs = convos?.reduce((n, c) => n + c.unread, 0) ?? 0;
  const unreadNotes = notes?.filter((n) => !n.read).length ?? 0;
  const saved = new Set((lists ?? []).flatMap((l) => l.hotelIds)).size;
  const tiles = [
    { to: "/trips", icon: CalendarDays, label: t("nav.trips"), value: upcoming.length, sub: t("account.upcoming") },
    { to: "/messages", icon: MessageCircle, label: t("nav.messages"), value: unreadMsgs, sub: t("account.unread") },
    { to: "/notifications", icon: Bell, label: t("nav.notifications"), value: unreadNotes, sub: t("account.unread") },
    { to: "/wishlists", icon: Heart, label: t("nav.wishlists"), value: saved, sub: t("account.savedStays") },
  ];

  return (
    <div className="container-page py-12">
      <PageHeader eyebrow={t("account.eyebrow")} title={t("account.title", { name: user.name.split(" ")[0] })} lead={t("account.lead")} actions={<Button variant="outline" onClick={() => navigate("/profile")}><User /> {t("nav.profile")}</Button>} />
      <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2">
        {tiles.map(({ to, icon: I, label, value, sub }) => (
          <Link key={to} to={to} className="flex items-center gap-3 border border-line bg-paper p-4 hover:border-gold">
            <span className="grid size-10 place-items-center rounded-full bg-soft text-gold"><I className="size-5" /></span>
            <span className="flex flex-col"><b className="text-xl text-navy">{value}</b><small className="text-[11px] text-ink-muted">{label} · {sub}</small></span>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-[1.4fr_1fr] gap-6 max-lg:grid-cols-1">
        <section aria-labelledby="next-h" className="border border-line bg-paper p-5">
          <div className="mb-4 flex items-center justify-between"><h2 id="next-h" className="m-0 text-xl">{t("account.nextTrip")}</h2><Link to="/trips" className="text-[12px] font-bold text-gold">{t("account.allTrips")}</Link></div>
          {isLoading ? <div className="skeleton h-40" /> : upcoming[0] ? <NextTrip id={upcoming[0].id} hotelId={upcoming[0].hotelId} checkIn={upcoming[0].checkIn} checkOut={upcoming[0].checkOut} state={upcoming[0].state} />
            : <EmptyState icon={<CalendarDays />} title={t("account.noTrip")} text={t("trips.emptyUpcoming")} action={t("trips.find")} onAction={() => navigate("/search")} />}
          {toReview.length > 0 && <p className="mt-4 mb-0 flex items-center justify-between gap-3 bg-[#fbf6ec] px-3 py-2.5 text-[12px] text-navy">{t("account.toReview", { count: toReview.length })}<Button size="xs" variant="gold" onClick={() => navigate(`/trips?tab=COMPLETED&review=${toReview[0].id}`)}>{t("trips.review")}</Button></p>}
        </section>
        <section aria-labelledby="notes-h" className="border border-line bg-paper p-5">
          <div className="mb-3 flex items-center justify-between"><h2 id="notes-h" className="m-0 text-xl">{t("nav.notifications")}</h2><Link to="/notifications" className="text-[12px] font-bold text-gold">{t("common.viewAll")}</Link></div>
          {notes?.length ? <ul className="flex flex-col">{notes.slice(0, 4).map((n) => (
            <li key={n.id}><button type="button" onClick={() => n.link && navigate(n.link)} className="flex w-full items-start gap-2.5 border-b border-line py-2.5 text-start last:border-0">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-line" : "bg-gold")} />
              <span className="flex min-w-0 flex-col"><b className="truncate text-[12px] text-navy">{n.title}</b><small className="truncate text-[11px] text-ink-muted">{n.body} · {date(n.createdAt, "d MMM")}</small></span>
            </button></li>
          ))}</ul> : <p className="text-[13px] text-ink-muted">{t("notifications.empty")}</p>}
        </section>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 max-lg:grid-cols-1">
        <section aria-labelledby="mp-h" className="border border-line bg-paper p-5">
          <div className="mb-2 flex items-center justify-between"><h2 id="mp-h" className="m-0 flex items-center gap-2 text-xl"><Sparkles className="size-4 text-gold" /> {t("profile.matchTitle")}</h2><Link to="/profile/preferences" className="text-[12px] font-bold text-gold">{t("common.edit")}</Link></div>
          {profile && <p className="m-0 text-[13px] text-charcoal">{[t(`profile.purposeLabel.${profile.purpose}`), t(`profile.budgetLabel.${profile.budget}`), t(`match.room.${profile.room}`), ...profile.atmosphere, ...profile.facilities].join(" · ")}</p>}
          {profile && !profile.saved && <p className="mt-2 mb-0 text-[12px] text-warn">{t("account.profileUnsaved")}</p>}
        </section>
        <section aria-labelledby="help-h" className="border border-line bg-paper p-5">
          <h2 id="help-h" className="mb-2 flex items-center gap-2 text-xl"><LifeBuoy className="size-4 text-gold" /> {t("account.help")}</h2>
          <p className="text-[13px] text-ink-muted">{t("account.helpText")}</p>
          <Button variant="outline" disabled={start.isPending} onClick={() => start.mutate({ kind: "SUPPORT" }, { onSuccess: (c) => navigate(`/messages/${c.id}`) })}>{t("messages.support")} <ArrowRight className="rtl:rotate-180" /></Button>
        </section>
      </div>
    </div>
  );
}

function NextTrip({ id, hotelId, checkIn, checkOut, state }: { id: string; hotelId: string; checkIn: string; checkOut: string; state: Parameters<typeof BookingStateBadge>[0]["state"] }) {
  const { t } = useTranslation();
  const { range } = useDates();
  const { data: h } = useHotel(hotelId);
  if (!h) return <div className="skeleton h-40" />;
  return (
    <div className="grid grid-cols-[180px_1fr] gap-4 max-sm:grid-cols-1">
      <img src={h.images[0]} alt="" className="h-32 w-full object-cover" />
      <div className="flex flex-col items-start gap-1.5">
        <span className="flex flex-wrap items-center gap-2"><BookingStateBadge state={state} /><MatchPill score={h.match.score} /></span>
        <b className="text-lg text-navy">{h.name}</b>
        <small className="text-[12px] text-ink-muted">{range(checkIn, checkOut)} · {id}</small>
        <div className="mt-1 flex gap-2"><Button size="sm" asChild><Link to={`/trips/${id}`}>{t("trips.view")}</Link></Button></div>
      </div>
    </div>
  );
}
