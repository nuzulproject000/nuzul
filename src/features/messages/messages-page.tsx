/* Messaging (§34): conversation list, booking context, automated messages, images, read status, unsend.
 * Delivery is via the mock API (polling-ready); real-time transport (WebSocket) is backend-dependent. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, Bell, Clock3, Hotel as HotelIcon, Image as ImageIcon, MessageCircle, Paperclip, Search, Send, ShieldCheck, Undo2 } from "lucide-react";
import type { Conversation } from "@/types/models";
import { useSession } from "@/stores/session.store";
import { useAuthGate } from "@/components/auth/auth-gate";

/** Which workspace the inbox is shown in (affects avatars and links only — data is the same shared conversations). */
export type InboxScope = "guest" | "host" | "admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookingStateBadge, EmptyState, ErrorState } from "@/components/common";
import { useBooking, useConversations, useHotel, useMarkConversationRead, useMessages, useSendMessage, useStartConversation, useUnsend } from "@/hooks/queries";
import { useDates, useMoney } from "@/hooks/use-format";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/forms";

export default function MessagesPage() { return <Inbox scope="guest" basePath="/messages" />; }

/** One inbox for every role: the API returns the signed-in user's conversations (guest ↔ host, or support). */
export function Inbox({ scope, basePath, className }: { scope: InboxScope; basePath: string; className?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [q, setQ] = useState("");
  const { data, isLoading, error, refetch } = useConversations();
  const markRead = useMarkConversationRead();
  const start = useStartConversation();
  const gate = useAuthGate();
  const { date } = useDates();
  const list = (data ?? []).filter((c) => c.title.toLowerCase().includes(q.toLowerCase()) || c.lastMessage.toLowerCase().includes(q.toLowerCase()));
  const active = data?.find((c) => c.id === id);
  const go = () => start.mutate({ kind: "SUPPORT" }, { onSuccess: (c) => navigate(`${basePath}/${c.id}`) });
  useEffect(() => { if (active?.unread) markRead.mutate(active.id); }, [active?.id, active?.unread]); // eslint-disable-line react-hooks/exhaustive-deps
  // Desktop opens the first conversation automatically; mobile keeps the list until one is picked.
  useEffect(() => { if (!id && data?.length && window.matchMedia("(min-width: 768px)").matches) navigate(`${basePath}/${data[0].id}`, { replace: true }); }, [id, data, navigate, basePath]);

  return (
    <div className={cn("grid h-[calc(100dvh-78px)] grid-cols-[360px_1fr] border-t border-line max-md:h-[calc(100dvh-64px-64px)] max-md:grid-cols-1", className)}>
      <aside className={cn("flex min-h-0 flex-col border-e border-line bg-paper", id && "max-md:hidden")}>
        <div className="px-5 pt-6 pb-3"><div className="mb-4 flex items-center justify-between gap-2"><h1 className="m-0 text-[32px]">{scope === "admin" ? t("admin.nav.support") : t("messages.title")}</h1>{scope !== "admin" && <Button size="xs" variant="outline" disabled={start.isPending} onClick={() => (scope === "guest" ? gate("message", go) : go())}>{t("messages.support")}</Button>}</div>
          <label className="relative block"><Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" /><span className="sr-only">{t("messages.search")}</span><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("messages.search")} className="min-h-10 ps-9" /></label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {error ? <ErrorState error={error} onRetry={() => void refetch()} className="m-4" />
            : isLoading ? [0, 1, 2].map((i) => <div key={i} className="skeleton mx-5 my-3 h-14" />)
            : list.length === 0 ? <EmptyState className="m-4" icon={<MessageCircle />} title={t("messages.empty")} text={t(scope === "host" ? "messages.emptyHost" : scope === "admin" ? "messages.emptyAdmin" : "messages.emptyText")} />
            : list.map((c) => (
              <button key={c.id} type="button" onClick={() => navigate(`${basePath}/${c.id}`)} aria-current={c.id === id} className={cn("flex w-full items-center gap-3 border-b border-line px-5 py-4 text-start", c.id === id ? "bg-soft" : "hover:bg-soft/50")}>
                <Avatar c={c} scope={scope} />
                <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[13px] text-navy">{c.title}</b><small className={cn("truncate text-[12px]", c.unread ? "font-semibold text-charcoal" : "text-ink-muted")}>{c.lastMessage}</small></span>
                <span className="flex flex-col items-end gap-1"><time className="text-[10px] text-ink-muted">{date(c.lastAt, "d MMM")}</time>{c.unread > 0 && <i className="grid size-[18px] place-items-center rounded-full bg-gold text-[10px] font-bold text-white not-italic" aria-label={`${c.unread} unread`}>{c.unread}</i>}</span>
              </button>
            ))}
        </div>
      </aside>
      <section className={cn("flex min-h-0 flex-col bg-ivory", !id && "max-md:hidden")}>
        {active ? <Thread key={active.id} c={active} scope={scope} onBack={() => navigate(basePath)} /> : id && data ? <EmptyState className="m-6" icon={<MessageCircle />} title={t("messages.notFound")} text={t("messages.notFoundText")} /> : <div className="grid flex-1 place-items-center text-[13px] text-ink-muted">{t("messages.select")}</div>}
      </section>
    </div>
  );
}

function Avatar({ c, scope }: { c: Conversation; scope: InboxScope }) {
  if (scope !== "guest") return <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sand text-[12px] font-bold text-navy">{c.title.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>;
  return <span className="grid size-10 shrink-0 place-items-center rounded-full bg-navy text-sand [&_svg]:size-[18px]">{c.kind === "SUPPORT" ? <ShieldCheck /> : <HotelIcon />}</span>;
}

function Thread({ c, scope, onBack }: { c: Conversation; scope: InboxScope; onBack: () => void }) {
  const self = useSession((s) => s.user?.id ?? "");
  const suspended = useSession((s) => s.user?.status === "SUSPENDED");
  const { t } = useTranslation();
  const money = useMoney();
  const { date, range } = useDates();
  const { data: messages, isLoading } = useMessages(c.id);
  const { data: booking } = useBooking(c.bookingId ?? "");
  const { data: hotel } = useHotel(c.hotelId ?? "");
  const send = useSendMessage(c.id);
  const unsend = useUnsend(c.id);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages?.length]);
  const submit = () => { const text = draft.trim(); if (!text || send.isPending) return; send.mutate(text, { onSuccess: () => setDraft(""), onError: (e) => toast.error(errorMessage(e, t("errors.generic"))) }); };
  const lastSentId = useMemo(() => [...(messages ?? [])].reverse().find((m) => m.senderId === self)?.id, [messages, self]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line bg-paper px-6 py-4 max-md:px-4">
        <Button variant="ghost" size="icon-sm" className="md:hidden" onClick={onBack} aria-label={t("messages.back")}><ArrowLeft className="rtl:rotate-180" /></Button>
        <Avatar c={c} scope={scope} />
        <div className="flex flex-col"><b className="text-[14px] text-navy">{c.title}</b><small className="flex items-center gap-1 text-[11px] text-ink-muted"><Clock3 className="size-3" /> {c.responseTime}</small></div>
      </header>
      {booking && hotel && (
        <div className="flex items-center gap-3 border-b border-line bg-[#fbf6ec] px-6 py-3 max-md:px-4">
          <img src={hotel.images[0]} alt="" className="h-11 w-14 object-cover" />
          <span className="flex min-w-0 flex-1 flex-col"><b className="truncate text-[12px] text-navy">{t("messages.stay", { status: t(`states.bookingState.${booking.state}`), dates: range(booking.checkIn, booking.checkOut) })}</b><small className="text-[11px] text-ink-muted">{booking.id} · {money(booking.price.total, booking.currency)}</small></span>
          <BookingStateBadge state={booking.state} />
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4" aria-live="polite" aria-label={t("messages.history")}>
        <p className="mb-5 text-center text-[10px] font-bold tracking-[0.12em] text-ink-muted uppercase">{t("messages.history")}</p>
        {isLoading && <div className="skeleton h-32" />}
        <div className="flex flex-col gap-3">
          {messages?.map((m) => m.senderId === "system" ? (
            <div key={m.id} className="mx-auto flex max-w-md flex-col items-center gap-1 rounded-md border border-line bg-paper px-4 py-3 text-center text-[12px] text-charcoal"><Bell className="size-3.5 text-gold" />{m.text}<small className="text-[10px] text-ink-muted">{t("messages.automated")} · {date(m.sentAt, "d MMM HH:mm")}</small></div>
          ) : (
            <div key={m.id} className={cn("group flex max-w-[72%] flex-col gap-1 max-md:max-w-[86%]", m.senderId === self ? "items-end self-end" : "items-start self-start")}>
              {m.unsent ? <em className="rounded-xl border border-dashed border-line px-3.5 py-2 text-[12px] text-ink-muted">{t("messages.unsent")}</em> : <>
                <div className={cn("rounded-2xl px-4 py-2.5 text-[13px]", m.senderId === self ? "rounded-ee-sm bg-navy text-white" : "rounded-es-sm border border-line bg-paper text-charcoal")}>
                  {m.imageUrl && <img src={m.imageUrl} alt={t("messages.photo")} className="mb-2 max-h-56 w-full rounded-lg object-cover" />}
                  {m.text}
                </div>
                <small className="flex items-center gap-2 text-[10px] text-ink-muted">{date(m.sentAt, "d MMM HH:mm")}{m.senderId === self && m.id === lastSentId && <> · {m.read ? t("messages.read") : t("messages.sent")}</>}
                  {m.senderId === self && <button type="button" onClick={() => unsend.mutate(m.id)} className="inline-flex items-center gap-1 font-bold text-gold opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 focus:opacity-100 max-md:opacity-100"><Undo2 className="size-3" /> {t("messages.unsend")}</button>}
                </small>
              </>}
            </div>
          ))}
        </div>
        <div ref={end} />
      </div>
      {suspended ? <p className="m-0 border-t border-line bg-error-bg px-4 py-3 text-center text-[12px] text-error">{t("access.suspendedMessaging")}</p> :
      <form className="flex items-center gap-2 border-t border-line bg-paper px-4 py-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("messages.attachImage")} onClick={() => toast.info(t("messages.attachNote"))}><ImageIcon /></Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={t("messages.attachFile")} onClick={() => toast.info(t("messages.attachNote"))}><Paperclip /></Button>
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t("messages.placeholder")} aria-label={t("messages.placeholder")} className="min-h-11 flex-1 rounded-full" maxLength={2000} />
        <Button type="submit" size="icon" aria-label={t("messages.send")} disabled={!draft.trim() || send.isPending}><Send className="rtl:-scale-x-100" /></Button>
      </form>}
    </>
  );
}
