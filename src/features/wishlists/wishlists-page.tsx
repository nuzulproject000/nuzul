/* Wishlists & collaboration (§21–22): multiple lists, create / rename / delete, move items, share link,
 * invite collaborators, privacy, availability filter for saved dates, compare saved. */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowRight, Copy, Globe2, Heart, Lock, MoreHorizontal, Pencil, Plus, Share2, Trash2, Users } from "lucide-react";
import type { Wishlist } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/controls";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlay";
import { CardSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/common";
import { HotelCard } from "@/components/hotel/hotel-card";
import { useCreateWishlist, useDeleteWishlist, useHotelsByIds, useInviteCollaborator, useMoveWishlistItem, useUpdateWishlist, useWishlists } from "@/hooks/queries";
import { useDates } from "@/hooks/use-format";
import { useCompare } from "@/stores/compare.store";
import { errorMessage } from "@/lib/forms";
import { cn, initials } from "@/lib/utils";

type DialogKind = "new" | "rename" | "delete" | "share" | { move: string };

export default function WishlistsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: lists, isLoading, error, refetch } = useWishlists();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const active = lists?.find((w) => w.id === id) ?? lists?.[0];
  const select = (wid: string) => navigate(`/wishlists/${wid}`, { replace: true });

  const header = <PageHeader eyebrow={t("wishlists.eyebrow")} title={t("wishlists.title")} lead={t("wishlists.lead")} actions={<Button onClick={() => setDialog("new")}><Plus /> {t("wishlists.new")}</Button>} />;
  if (error) return <div className="container-page py-12">{header}<ErrorState error={error} onRetry={() => void refetch()} /></div>;
  if (isLoading) return <div className="container-page py-12">{header}<div className="skeleton h-80" /></div>;

  return (
    <div className="container-page py-12">
      {header}
      {!lists?.length ? <EmptyState icon={<Heart />} title={t("wishlists.emptyTitle")} text={t("wishlists.emptyText")} action={t("wishlists.findStays")} onAction={() => navigate("/search")} /> : <>
        <div role="tablist" aria-label={t("wishlists.title")} className="scrollbar-none mb-8 flex gap-3 overflow-x-auto pb-1">
          {lists.map((w) => (
            <button key={w.id} role="tab" type="button" aria-selected={w.id === active?.id} onClick={() => select(w.id)} className={cn("flex min-w-[220px] items-center gap-3 border p-2.5 text-start", w.id === active?.id ? "border-gold bg-paper shadow-[inset_0_0_0_1px_var(--gold)]" : "border-line hover:opacity-80")}>
              <Thumb ids={w.hotelIds} />
              <span className="flex flex-col"><b className="text-[13px] text-navy">{w.name}</b><small className="text-[11px] text-ink-muted">{t("wishlists.stays", { count: w.hotelIds.length })} · {w.privacy === "SHARED" ? t("wishlists.shared") : t("wishlists.private")}</small></span>
            </button>
          ))}
        </div>
        {active && <ListView key={active.id} w={active} onDialog={setDialog} />}
      </>}
      <WishlistDialogs dialog={dialog} active={active} lists={lists ?? []} onClose={() => setDialog(null)} onCreated={select} />
    </div>
  );
}

function Thumb({ ids }: { ids: string[] }) {
  const { data } = useHotelsByIds(ids.slice(0, 1));
  return <span className="grid size-12 shrink-0 place-items-center overflow-hidden bg-soft text-gold">{ids.length && data?.[0] ? <img src={data[0].images[0]} alt="" className="h-full w-full object-cover" /> : <Heart className="size-4" />}</span>;
}

function ListView({ w, onDialog }: { w: Wishlist; onDialog: (d: DialogKind) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { range } = useDates();
  const [availOnly, setAvailOnly] = useState(false);
  const { data: hotels, isLoading } = useHotelsByIds(w.hotelIds);
  const update = useUpdateWishlist();
  const setCompare = useCompare((s) => s.set);
  const items = (w.hotelIds.length ? hotels ?? [] : []).filter((h) => !availOnly || h.available);
  const dates = w.dates ? range(w.dates.checkIn, w.dates.checkOut) : undefined;

  return (
    <>
      <section className="mb-12 grid grid-cols-[1.2fr_1fr] items-center gap-10 border border-line bg-paper p-6 max-md:grid-cols-1 max-md:gap-6 max-md:p-4">
        <div className="grid h-60 grid-cols-[2fr_1fr] grid-rows-2 gap-1.5 max-md:h-48">
          {(hotels ?? []).slice(0, 3).map((h, i) => <img key={h.id} src={h.images[0]} alt="" className={cn("h-full w-full object-cover", i === 0 && "row-span-2", (hotels?.length ?? 0) === 1 && "col-span-2")} />)}
          {!w.hotelIds.length && <div className="col-span-2 row-span-2 grid place-items-center bg-soft text-gold"><Heart className="size-8" /></div>}
        </div>
        <div>
          <Badge tone={w.privacy === "SHARED" ? "success" : "neutral"}>{w.privacy === "SHARED" ? <><Globe2 className="size-3" /> {t("wishlists.shared")}</> : <><Lock className="size-3" /> {t("wishlists.private")}</>}</Badge>
          <h2 className="mt-3 mb-1.5">{w.name}</h2>
          <p className="text-[13px] text-ink-muted">{t("wishlists.stays", { count: w.hotelIds.length })}{dates ? ` · ${t("wishlists.savedFor", { dates })}` : ""}</p>
          {w.collaborators.length > 0 && <p className="flex flex-wrap items-center gap-2 text-[12px] text-navy"><Users className="size-4 text-gold" /> {t("wishlists.planning", { names: w.collaborators.join(", ") })}<span className="flex -space-x-2 rtl:space-x-reverse">{w.collaborators.map((c) => <span key={c} className="grid size-7 place-items-center rounded-full border-2 border-paper bg-sand text-[10px] font-bold text-navy">{initials(c)}</span>)}</span></p>}
          <div className="mt-5 flex items-center gap-2">
            <Button variant="gold" disabled={w.hotelIds.length < 2} onClick={() => { setCompare(w.hotelIds); navigate("/compare"); }}>{t("wishlists.compareSaved")}</Button>
            <Button size="icon" variant="outline" aria-label={t("wishlists.shareTitle")} onClick={() => onDialog("share")}><Share2 /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon" variant="outline" aria-label={t("wishlists.more")}><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onDialog("rename")}><Pencil /> {t("wishlists.rename")}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => update.mutate({ id: w.id, patch: { privacy: w.privacy === "PRIVATE" ? "SHARED" : "PRIVATE" } })}><Lock /> {w.privacy === "PRIVATE" ? t("wishlists.makeShared") : t("wishlists.makePrivate")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-error" onSelect={() => onDialog("delete")}><Trash2 /> {t("common.delete")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 text-[28px]">{t("wishlists.inside")}</h2>
        <label className="flex items-center gap-2.5 text-[12px] text-navy"><Switch checked={availOnly} onCheckedChange={setAvailOnly} /> {t("wishlists.onlyAvailable")}{dates ? ` · ${dates}` : ""}</label>
      </div>
      {isLoading && w.hotelIds.length ? <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-2 max-sm:grid-cols-1">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
        : items.length === 0 ? <EmptyState icon={<Heart />} title={availOnly && w.hotelIds.length ? t("wishlists.noneAvailable") : t("wishlists.emptyList")} text={availOnly && w.hotelIds.length ? t("wishlists.noneAvailableText") : t("wishlists.emptyListText")} action={t("wishlists.findStays")} onAction={() => navigate("/search")} />
        : <div className="grid grid-cols-3 gap-x-6 gap-y-10 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {items.map((h) => <div key={h.id} className="flex flex-col gap-2"><HotelCard hotel={h} showCompare className="flex-1" /><Button variant="text" size="sm" className="self-start" onClick={() => onDialog({ move: h.id })}>{t("wishlists.move")} <ArrowRight className="rtl:rotate-180" /></Button></div>)}
        </div>}
    </>
  );
}

function WishlistDialogs({ dialog, active, lists, onClose, onCreated }: { dialog: DialogKind | null; active?: Wishlist; lists: Wishlist[]; onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const create = useCreateWishlist();
  const update = useUpdateWishlist();
  const remove = useDeleteWishlist();
  const move = useMoveWishlistItem();
  const invite = useInviteCollaborator();
  const open = dialog !== null;
  const shareUrl = active ? `${window.location.origin}/wishlists/${active.id}` : "";
  const kind = typeof dialog === "object" && dialog ? "move" : dialog;
  const nameErr = create.error ?? update.error;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); else setName(dialog === "rename" ? active?.name ?? "" : ""); }}>
      {(kind === "new" || kind === "rename") && (
        <DialogContent title={kind === "new" ? t("wishlists.create") : t("wishlists.rename")} onOpenAutoFocus={() => setName(kind === "rename" ? active?.name ?? "" : "")}>
          <form noValidate onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return;
            if (kind === "new") create.mutate(name, { onSuccess: (w) => { toast.success(t("wishlists.created")); onCreated(w.id); onClose(); } });
            else if (active) update.mutate({ id: active.id, patch: { name: name.trim() } }, { onSuccess: onClose }); }}>
            <Field label={t("wishlists.name")} htmlFor="wl-name" hint={`${name.length}/50`} error={nameErr ? errorMessage(nameErr, "") : undefined}><Input id="wl-name" autoFocus maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("wishlists.namePh")} /></Field>
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" disabled={!name.trim() || create.isPending || update.isPending}>{kind === "new" ? t("wishlists.create") : t("common.save")}</Button></DialogFooter>
          </form>
        </DialogContent>
      )}
      {kind === "delete" && active && (
        <DialogContent title={t("wishlists.deleteTitle")} description={t("wishlists.deleteText", { name: active.name, count: active.hotelIds.length })}>
          <DialogFooter><Button variant="outline" onClick={onClose}>{t("wishlists.keep")}</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(active.id, { onSuccess: () => { toast.info(t("wishlists.deleted")); onClose(); const next = lists.find((w) => w.id !== active.id); if (next) onCreated(next.id); } })}>{t("common.delete")}</Button></DialogFooter>
        </DialogContent>
      )}
      {kind === "share" && active && (
        <DialogContent title={t("wishlists.shareTitle")} description={t("wishlists.shareText")}>
          <div className="flex items-center gap-2 border border-line bg-paper p-2"><code className="min-w-0 flex-1 truncate px-2 text-[12px] text-navy">{shareUrl}</code><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard?.writeText(shareUrl); toast.success(t("common.copied")); if (active.privacy === "PRIVATE") update.mutate({ id: active.id, patch: { privacy: "SHARED" } }); }}><Copy /> {t("wishlists.copy")}</Button></div>
          <form noValidate className="mt-5" onSubmit={(e) => { e.preventDefault(); invite.mutate({ id: active.id, email }, { onSuccess: () => { toast.success(t("wishlists.invited")); setEmail(""); } }); }}>
            <Field label={t("wishlists.inviteLabel")} htmlFor="wl-invite" error={invite.error ? errorMessage(invite.error, "") : undefined}>
              <div className="flex gap-2"><Input id="wl-invite" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" /><Button type="submit" disabled={!email || invite.isPending}>{t("wishlists.invite")}</Button></div>
            </Field>
          </form>
          <ul className="mt-5 flex flex-col gap-2">
            {active.collaborators.length ? active.collaborators.map((c) => <li key={c} className="flex items-center gap-3 text-[13px]"><span className="grid size-8 place-items-center rounded-full bg-sand text-[11px] font-bold text-navy">{initials(c)}</span><b className="flex-1 text-navy">{c}</b><small className="text-ink-muted">{t("wishlists.canEdit")}</small></li>) : <li className="text-[13px] text-ink-muted">{t("wishlists.noCollaborators")}</li>}
          </ul>
        </DialogContent>
      )}
      {kind === "move" && active && typeof dialog === "object" && dialog && (
        <DialogContent title={t("wishlists.moveTo")}>
          <div className="flex flex-col">
            {lists.filter((w) => w.id !== active.id).map((w) => (
              <button key={w.id} type="button" disabled={move.isPending} onClick={() => move.mutate({ id: active.id, hotelId: dialog.move, toId: w.id }, { onSuccess: () => { toast.success(t("wishlists.moved", { name: w.name })); onClose(); } })} className="flex items-center justify-between border-b border-line py-3.5 text-start hover:text-gold">
                <span className="flex flex-col"><b className="text-[13px] text-navy">{w.name}</b><small className="text-[11px] text-ink-muted">{t("wishlists.stays", { count: w.hotelIds.length })}</small></span><ArrowRight className="size-4 rtl:rotate-180" />
              </button>
            ))}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
