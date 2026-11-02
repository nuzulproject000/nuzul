/* Notifications (§35): filter by type, read state, deep links, per-type channel preferences. */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Bell, Mail, Smartphone } from "lucide-react";
import type { NotificationChannel, NotificationPrefs, NotificationType } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/controls";
import { Chip, EmptyState, ErrorState, PageHeader } from "@/components/common";
import { useMarkNotificationRead, useNotificationPrefs, useNotifications, useSaveNotificationPrefs } from "@/hooks/queries";
import { useDates } from "@/hooks/use-format";
import { cn } from "@/lib/utils";

const TYPES: NotificationType[] = ["BOOKING_CONFIRMATION", "PAYMENT", "CANCELLATION", "RESERVATION_CHANGE", "MESSAGE", "AVAILABILITY", "REVIEW_REMINDER", "MATCH_RECOMMENDATION", "PROMOTION"];
const CHANNELS: { c: NotificationChannel; icon: typeof Bell }[] = [{ c: "IN_APP", icon: Bell }, { c: "EMAIL", icon: Mail }, { c: "PUSH", icon: Smartphone }];

export default function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { date } = useDates();
  const [filter, setFilter] = useState<NotificationType | "ALL">("ALL");
  const { data, isLoading, error, refetch } = useNotifications();
  const mark = useMarkNotificationRead();
  const list = (data ?? []).filter((n) => filter === "ALL" || n.type === filter);
  const unread = (data ?? []).filter((n) => !n.read).length;

  return (
    <div className="container-page py-12">
      <PageHeader eyebrow={t("notifications.eyebrow")} title={t("notifications.title")} actions={<Button variant="outline" disabled={!unread || mark.isPending} onClick={() => mark.mutate("all")}>{t("notifications.markAll")}</Button>} />
      <div className="grid grid-cols-[1fr_400px] gap-10 max-lg:grid-cols-1">
        <div>
          <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto pb-1 lg:flex-wrap" role="toolbar" aria-label={t("results.filters")}>
            <Chip active={filter === "ALL"} onClick={() => setFilter("ALL")}>{t("notifications.all")}</Chip>
            {TYPES.map((k) => <Chip key={k} active={filter === k} onClick={() => setFilter(k)}>{t(`notifications.type.${k}`)}</Chip>)}
          </div>
          {error ? <ErrorState error={error} onRetry={() => void refetch()} />
            : isLoading ? [0, 1, 2, 3].map((i) => <div key={i} className="skeleton mb-2 h-20" />)
            : list.length === 0 ? <EmptyState icon={<Bell />} title={t("notifications.empty")} text={t("notifications.emptyText")} />
            : <ul className="flex flex-col border border-line bg-paper">
              {list.map((n) => (
                <li key={n.id} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => { if (!n.read) mark.mutate(n.id); if (n.link) navigate(n.link); }} className={cn("grid w-full grid-cols-[10px_1fr_auto] items-start gap-4 px-5 py-4 text-start hover:bg-soft/50", !n.read && "bg-[#fbf6ec]")}>
                    <span className={cn("mt-1.5 size-2 rounded-full", n.read ? "bg-transparent" : "bg-gold")} aria-label={n.read ? undefined : "unread"} />
                    <span className="flex flex-col gap-0.5"><small className="text-[9px] font-bold tracking-[0.12em] text-gold uppercase">{t(`notifications.type.${n.type}`)}</small><b className="text-[13px] text-navy">{n.title}</b><span className="text-[12px] text-ink-muted">{n.body}</span></span>
                    <span className="flex flex-col items-end gap-1 text-[10px] text-ink-muted"><time>{date(n.createdAt, "d MMM")}</time><em className="not-italic">{n.channels.map((c) => t(`notifications.channel.${c}`)).join(" · ")}</em></span>
                  </button>
                </li>
              ))}
            </ul>}
        </div>
        <PrefsCard />
      </div>
    </div>
  );
}

function PrefsCard() {
  const { t } = useTranslation();
  const { data } = useNotificationPrefs();
  const save = useSaveNotificationPrefs();
  const [prefs, setPrefs] = useState<NotificationPrefs>({});
  useEffect(() => { if (data) setPrefs(data); }, [data]);
  const dirty = JSON.stringify(prefs) !== JSON.stringify(data);
  const toggle = (type: string, c: NotificationChannel) => setPrefs((p) => ({ ...p, [type]: (p[type] ?? []).includes(c) ? p[type].filter((x) => x !== c) : [...(p[type] ?? []), c] }));
  return (
    <aside className="self-start border border-line bg-paper p-6">
      <h3 className="mb-1 text-lg">{t("notifications.prefs")}</h3>
      <p className="text-[12px] text-ink-muted">{t("notifications.prefsText")}</p>
      <table className="mt-3 w-full text-[12px]">
        <thead><tr><th className="sr-only">Type</th>{CHANNELS.map(({ c, icon: I }) => <th key={c} scope="col" className="pb-2 text-center text-[10px] font-bold text-navy"><span className="flex flex-col items-center gap-1"><I className="size-3.5" />{t(`notifications.channel.${c}`)}</span></th>)}</tr></thead>
        <tbody>
          {TYPES.map((type) => (
            <tr key={type} className="border-t border-line">
              <th scope="row" className="py-2.5 text-start font-normal text-charcoal">{t(`notifications.type.${type}`)}</th>
              {CHANNELS.map(({ c }) => <td key={c} className="text-center"><Checkbox checked={(prefs[type] ?? []).includes(c)} onCheckedChange={() => toggle(type, c)} aria-label={`${t(`notifications.type.${type}`)} · ${t(`notifications.channel.${c}`)}`} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <Button className="mt-5 w-full" disabled={!dirty || save.isPending} onClick={() => save.mutate(prefs, { onSuccess: () => toast.success(t("notifications.saved")) })}>{t("common.saveChanges")}</Button>
    </aside>
  );
}
