/* Guest profile (§53–56): personal info, persistent Match Profile with live preview, trips, reviews,
 * language & currency, notifications, privacy & security. */
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, Bell, CalendarDays, Check, DollarSign, Globe2, Heart, KeyRound, LogOut, MonitorSmartphone, Download, MapPin, Pencil, ShieldCheck, Sparkles, Star, Trash2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/controls";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BookingStateBadge, Chip, EmptyState, SegButtons, VerifiedStay } from "@/components/common";
import { MatchPill } from "@/components/match";
import { useCollection, useMatchConfig, useMatchProfile, useMe, useMyBookings, useMyReviews, useResetProfile, useSaveProfile, useUpdateMe, useWishlists, useHotel } from "@/hooks/queries";
import { useDates } from "@/hooks/use-format";
import { usePreferences } from "@/stores/preferences.store";
import { useSession } from "@/stores/session.store";
import { BUDGET_BANDS, computeMatch, type Budget, type MatchProfile, type Priority, type TripPurpose } from "@/lib/match-engine";
import { ATMOSPHERES } from "@/lib/icons";
import { applyFieldErrors } from "@/lib/forms";
import { bookingService, meService } from "@/services/account.service";
import type { RoomType } from "@/types/models";
import { cn, initials } from "@/lib/utils";

const SECTIONS = [["personal", UserIcon], ["preferences", Sparkles], ["trips", CalendarDays], ["reviews", Star], ["locale", Globe2], ["notifications", Bell], ["privacy", ShieldCheck]] as const;
type Section = (typeof SECTIONS)[number][0];
const PRIORITIES: Priority[] = ["PRICE", "LOCATION", "CLEANLINESS", "ROOM_QUALITY", "FACILITIES", "VALUE", "OVERALL_RATING", "GUEST_EXPERIENCE"];
const FACILITIES = ["Pool", "Spa", "Gym", "Room service", "Workspace", "Wi-Fi", "Beach access", "Parking", "Kitchen", "Restaurant"];
const PURPOSES: TripPurpose[] = ["HONEYMOON", "COUPLE", "FAMILY", "BUSINESS", "SOLO", "GROUP"];
const BUDGETS: Budget[] = ["BUDGET", "MODERATE", "PREMIUM", "LUXURY"];
const ROOMS: RoomType[] = ["SINGLE", "DOUBLE", "TRIPLE", "SUITE", "FAMILY", "APARTMENT"];

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const param = useParams().section;
  const section = (SECTIONS.some(([k]) => k === param) ? param : "personal") as Section;
  const { data: me } = useMe();
  const { data: wishlists } = useWishlists();
  const signOut = useSession((s) => s.signOut);
  const go = (s: Section) => navigate(`/profile/${s}`);

  return (
    <div className="container-page py-12">
      <div className="mb-10 flex items-center gap-5 max-md:flex-wrap">
        <div className="relative grid size-20 shrink-0 place-items-center rounded-full bg-navy text-2xl font-bold text-sand">{initials(me?.name ?? "")}
          <button type="button" aria-label={t("profile.changePhoto")} onClick={() => toast.info(t("profile.photoNote"))} className="absolute end-0 bottom-0 grid size-7 place-items-center rounded-full border border-line bg-paper text-navy"><Pencil className="size-3" /></button></div>
        <div className="flex-1"><span className="eyebrow">{t("profile.eyebrow")}</span><h1 className="mb-1 text-[40px] max-md:text-[30px]">{me?.name ?? "—"}</h1>
          <p className="m-0 flex flex-wrap items-center gap-2 text-[12px] text-ink-muted"><MapPin className="size-3.5" /> {me?.city} · {t("profile.memberSince", { year: me?.joinedAt.slice(0, 4) ?? "" })} · <span className="inline-flex items-center gap-1 text-success"><BadgeCheck className="size-3.5" /> {t("profile.emailVerified")}</span></p></div>
        <Button variant="outline" onClick={() => { signOut(); navigate("/", { replace: true }); }}><LogOut /> {t("nav.signOut")}</Button>
      </div>
      <div className="grid grid-cols-[250px_1fr] gap-12 max-md:grid-cols-1 max-md:gap-6">
        <nav aria-label={t("nav.profile")} className="flex flex-col gap-1 self-start max-md:hidden">
          {SECTIONS.map(([k, I]) => <button key={k} type="button" aria-current={section === k ? "page" : undefined} onClick={() => go(k)} className={cn("flex items-center gap-3 rounded-md px-3.5 py-3 text-start text-[13px]", section === k ? "bg-navy text-white" : "text-navy hover:opacity-80")}><I className="size-4" /> {t(`profile.nav.${k}`)}</button>)}
          <Link to="/wishlists" className="flex items-center gap-3 rounded-md px-3.5 py-3 text-[13px] text-navy hover:opacity-80"><Heart className="size-4" /> {t("nav.wishlists")} ({wishlists?.length ?? 0})</Link>
        </nav>
        <div className="md:hidden"><Select ariaLabel={t("nav.profile")} value={section} onValueChange={(v) => go(v as Section)} options={SECTIONS.map(([k]) => ({ value: k, label: t(`profile.nav.${k}`) }))} /></div>
        <div className="min-w-0">
          {section === "personal" && <Personal />}
          {section === "preferences" && <Preferences />}
          {section === "trips" && <PastTrips />}
          {section === "reviews" && <MyReviews />}
          {section === "locale" && <LocaleSettings />}
          {section === "notifications" && <section><h2>{t("profile.nav.notifications")}</h2><p className="text-ink-muted">{t("profile.notificationsText")}</p><Button onClick={() => navigate("/notifications")}>{t("profile.openNotifications")}</Button></section>}
          {section === "privacy" && <Privacy />}
        </div>
      </div>
    </div>
  );
}

function Personal() {
  const { t } = useTranslation();
  const { data: me } = useMe();
  const update = useUpdateMe();
  const [editing, setEditing] = useState(false);
  const schema = yup.object({ name: yup.string().trim().required("auth.v.name"), email: yup.string().trim().required("auth.v.email").matches(/^\S+@\S+\.\S+$/, "auth.v.email"), phone: yup.string().trim().required("booking.v.phone").test("p", "booking.v.phone", (v) => (v ?? "").replace(/\D/g, "").length >= 8), city: yup.string().trim().default("") });
  type V = yup.InferType<typeof schema>;
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<V>({ resolver: yupResolver(schema) });
  useEffect(() => { if (me) reset({ name: me.name, email: me.email, phone: me.phone, city: me.city }); }, [me, reset]);
  const fe = (k: keyof V) => errors[k]?.message && t(errors[k]!.message as string, { defaultValue: errors[k]!.message as string });
  const submit = handleSubmit((v) => update.mutate(v, { onSuccess: () => { toast.success(t("profile.saved")); setEditing(false); }, onError: (e) => applyFieldErrors(e, setError) }));
  return (
    <form noValidate onSubmit={submit}>
      <div className="mb-6 flex items-center justify-between gap-3"><h2 className="m-0">{t("profile.nav.personal")}</h2>
        {editing ? <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); if (me) reset({ name: me.name, email: me.email, phone: me.phone, city: me.city }); }}>{t("common.cancel")}</Button><Button type="submit" size="sm" disabled={update.isPending}>{t("common.save")}</Button></div>
          : <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil /> {t("common.edit")}</Button>}
      </div>
      <fieldset disabled={!editing} className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
        <Field label={t("profile.fullName")} htmlFor="p-name" error={fe("name") || undefined}><Input id="p-name" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} /></Field>
        <Field label={t("profile.email")} htmlFor="p-email" error={fe("email") || undefined}><Input id="p-email" type="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
        <Field label={t("profile.phone")} htmlFor="p-phone" error={fe("phone") || undefined}><Input id="p-phone" type="tel" autoComplete="tel" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
        <Field label={t("profile.location")} htmlFor="p-city"><Input id="p-city" autoComplete="address-level2" {...register("city")} /></Field>
      </fieldset>
    </form>
  );
}

function Preferences() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: saved } = useMatchProfile();
  const { data: cfg } = useMatchConfig();
  const { data: picks } = useCollection("high-match");
  const save = useSaveProfile();
  const reset = useResetProfile();
  const [p, setP] = useState<MatchProfile>();
  useEffect(() => { if (saved) setP(saved); }, [saved]);
  const previewHotels = useMemo(() => (picks ?? []).slice(0, 3), [picks]);
  if (!p) return <div className="skeleton h-96" />;
  const tog = <K extends "priorities" | "atmosphere" | "facilities">(k: K, v: string, max?: number) => setP((x) => { if (!x) return x; const list = x[k] as string[]; if (list.includes(v)) return { ...x, [k]: list.filter((y) => y !== v) }; if (max && list.length >= max) { toast.info(t("profile.maxPriorities", { n: max })); return x; } return { ...x, [k]: [...list, v] }; });
  const dirty = JSON.stringify(p) !== JSON.stringify(saved);
  const [lo, hi] = BUDGET_BANDS[p.budget];
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><span className="eyebrow">{t("profile.matchEyebrow")}</span><h2 className="m-0">{t("profile.matchTitle")}</h2></div><Badge tone={saved?.saved && !dirty ? "success" : "warn"}>{saved?.saved && !dirty ? t("profile.active") : t("profile.draft")}</Badge></div>
      <p className="text-[13px] text-ink-muted">{t("profile.matchText")}</p>
      <div className="mt-5 grid grid-cols-3 gap-4 border border-line bg-paper p-5 max-md:grid-cols-1">
        <Field label={t("profile.tripStyle")} htmlFor="mp-purpose"><Select id="mp-purpose" value={p.purpose} onValueChange={(v) => setP({ ...p, purpose: v as TripPurpose })} options={PURPOSES.map((x) => ({ value: x, label: t(`profile.purposeLabel.${x}`) }))} /></Field>
        <Field label={t("profile.budget")} htmlFor="mp-budget" hint={`EGP ${lo.toLocaleString()}–${hi.toLocaleString()}`}><Select id="mp-budget" value={p.budget} onValueChange={(v) => setP({ ...p, budget: v as Budget })} options={BUDGETS.map((x) => ({ value: x, label: t(`profile.budgetLabel.${x}`) }))} /></Field>
        <Field label={t("profile.roomPref")} htmlFor="mp-room"><Select id="mp-room" value={p.room} onValueChange={(v) => setP({ ...p, room: v as RoomType })} options={ROOMS.map((x) => ({ value: x, label: t(`match.room.${x}`) }))} /></Field>
      </div>
      <h4 className="mt-6 mb-2.5 text-[13px]">{t("profile.priorities")} <small className="font-normal text-ink-muted">{t("profile.prioritiesNote")}</small></h4>
      <div className="flex flex-wrap gap-2">{PRIORITIES.map((x) => <Chip key={x} active={p.priorities.includes(x)} onClick={() => tog("priorities", x, 3)}>{p.priorities.includes(x) && <Check className="size-3" />} {t(`profile.priorityLabel.${x}`)}</Chip>)}</div>
      <h4 className="mt-6 mb-2.5 text-[13px]">{t("profile.atmosphere")}</h4>
      <div className="flex flex-wrap gap-2">{ATMOSPHERES.map((x) => <Chip key={x} active={p.atmosphere.includes(x)} onClick={() => tog("atmosphere", x)}>{p.atmosphere.includes(x) && <Check className="size-3" />} {x}</Chip>)}</div>
      <h4 className="mt-6 mb-2.5 text-[13px]">{t("profile.facilities")}</h4>
      <div className="flex flex-wrap gap-2">{FACILITIES.map((x) => <Chip key={x} active={p.facilities.includes(x)} onClick={() => tog("facilities", x)}>{p.facilities.includes(x) && <Check className="size-3" />} {x}</Chip>)}</div>

      <div className="mt-7 border border-gold/40 bg-[#fbf6ec] p-5" aria-live="polite">
        <span className="text-[9px] font-bold tracking-[0.14em] text-gold uppercase">{t("profile.livePreview")}</span>
        <ul className="mt-3 flex flex-col gap-2.5">
          {previewHotels.map((h) => { const now = computeMatch(h, p, cfg); return (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-navy"><b>{h.name}</b><span className="flex items-center gap-2">{now.score !== h.match.score && <s className="text-[11px] text-ink-muted">{h.match.score}%</s>}<MatchPill score={now.score} /></span></li>
          ); })}
        </ul>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <Button variant="gold" disabled={save.isPending} onClick={() => save.mutate({ ...p, saved: true }, { onSuccess: () => toast.success(t("profile.prefsSaved")) })}>{t("profile.savePrefs")}</Button>
        <Button variant="outline" disabled={reset.isPending} onClick={() => reset.mutate(undefined, { onSuccess: () => toast.info(t("profile.prefsReset")) })}>{t("profile.resetPrefs")}</Button>
        <Button variant="text" onClick={() => navigate("/#match")}>{t("profile.retake")} <ArrowRight className="rtl:rotate-180" /></Button>
      </div>
    </section>
  );
}

function PastTrips() {
  const { t } = useTranslation();
  const { data } = useMyBookings();
  const past = (data ?? []).filter((b) => b.state === "COMPLETED");
  return (
    <section><h2>{t("profile.nav.trips")}</h2>
      {past.length === 0 ? <EmptyState icon={<CalendarDays />} title={t("trips.empty", { tab: t("trips.tabs.COMPLETED").toLowerCase() })} text={t("trips.emptyOther")} />
        : <div className="flex flex-col gap-3">{past.map((b) => <PastTrip key={b.id} id={b.id} hotelId={b.hotelId} checkIn={b.checkIn} checkOut={b.checkOut} />)}</div>}
      <Button variant="text" className="mt-4" asChild><Link to="/trips">{t("profile.allTrips")} <ArrowRight className="rtl:rotate-180" /></Link></Button>
    </section>
  );
}
function PastTrip({ id, hotelId, checkIn, checkOut }: { id: string; hotelId: string; checkIn: string; checkOut: string }) {
  const { data: h } = useHotel(hotelId);
  const { range } = useDates();
  return (
    <Link to={`/trips/${id}`} className="flex items-center gap-4 border border-line bg-paper p-3 hover:opacity-80">
      {h ? <img src={h.images[0]} alt="" className="h-14 w-20 object-cover" /> : <div className="skeleton h-14 w-20" />}
      <span className="flex flex-1 flex-col"><b className="text-[13px] text-navy">{h?.name}</b><small className="text-[11px] text-ink-muted">{range(checkIn, checkOut)} · {id}</small></span>
      <BookingStateBadge state="COMPLETED" />
    </Link>
  );
}

function MyReviews() {
  const { t } = useTranslation();
  const { date } = useDates();
  const { data } = useMyReviews();
  return (
    <section><h2>{t("profile.nav.reviews")}</h2>
      {!data?.length ? <EmptyState icon={<Star />} title={t("hotel.noReviews")} text={t("profile.noReviewsText")} />
        : data.map((r) => <ReviewRow key={r.id} hotelId={r.hotelId} when={date(r.createdAt, "MMM yyyy")} trip={r.tripType} text={r.text} cats={r.categories} overall={r.overall} />)}
    </section>
  );
}
function ReviewRow({ hotelId, when, trip, text, cats, overall }: { hotelId: string; when: string; trip: string; text: string; cats: Record<string, number>; overall: number }) {
  const { t } = useTranslation();
  const { data: h } = useHotel(hotelId);
  return (
    <article className="mb-4 border border-line bg-paper p-5">
      <header className="flex flex-wrap items-center gap-3"><b className="text-navy">{h?.name}</b><small className="text-[11px] text-ink-muted">{when} · {trip}</small><span className="ms-auto inline-flex items-center gap-1 text-[12px] font-bold text-navy"><Star className="size-3.5 fill-current" /> {overall.toFixed(1)}</span><VerifiedStay label={t("hotel.verifiedStay")} /></header>
      <p className="my-3 text-[13px]">{text}</p>
      <div className="flex flex-wrap gap-2">{Object.entries(cats).map(([k, v]) => <span key={k} className="rounded-full bg-soft px-2.5 py-1 text-[11px] text-navy">{t(`categories.${k}`)} <b>{v}</b></span>)}</div>
    </article>
  );
}

function LocaleSettings() {
  const { t } = useTranslation();
  const { locale, setLocale, currency, setCurrency } = usePreferences();
  return (
    <section><h2>{t("profile.nav.locale")}</h2>
      {[{ i: Globe2, title: t("profile.languageLabel"), sub: t("profile.languageSub"), control: <SegButtons ariaLabel={t("profile.languageLabel")} value={locale} onChange={setLocale} options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} /> },
        { i: DollarSign, title: t("profile.currencyLabel"), sub: t("profile.currencySub"), control: <SegButtons ariaLabel={t("profile.currencyLabel")} value={currency} onChange={setCurrency} options={[{ value: "EGP", label: "EGP" }, { value: "USD", label: "USD" }]} /> },
      ].map(({ i: I, title, sub, control }) => (
        <div key={title} className="flex items-center gap-4 border-b border-line py-5 max-sm:flex-wrap"><I className="size-5 shrink-0 text-gold" /><span className="flex flex-1 flex-col"><b className="text-[14px] text-navy">{title}</b><small className="text-[12px] text-ink-muted">{sub}</small></span>{control}</div>
      ))}
    </section>
  );
}

function Privacy() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { useLocation, personalised, setPrivacy } = usePreferences();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const exportData = async () => {
    const [me, profile, bookings, reviews] = await Promise.all([meService.get(), meService.profile(), bookingService.mine(), meService.reviews()]);
    const url = URL.createObjectURL(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), me, matchProfile: profile, bookings, reviews }, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "nuzul-my-data.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(t("profile.privacy.exported"));
  };
  const rows: { i: typeof KeyRound; title: string; sub: string; control: React.ReactNode }[] = [
    { i: KeyRound, title: t("profile.privacy.password"), sub: t("profile.privacy.passwordSub"), control: <Button size="sm" variant="outline" onClick={() => navigate("/auth/forgot")}>{t("profile.privacy.change")}</Button> },
    { i: MonitorSmartphone, title: t("profile.privacy.sessions"), sub: t("profile.privacy.sessionsSub"), control: <Button size="sm" variant="outline" onClick={() => toast.success(t("profile.privacy.requested"))}>{t("profile.privacy.signOutOthers")}</Button> },
    { i: MapPin, title: t("profile.privacy.location"), sub: t("profile.privacy.locationSub"), control: <Switch checked={useLocation} onCheckedChange={(v) => setPrivacy({ useLocation: v })} aria-label={t("profile.privacy.location")} /> },
    { i: Sparkles, title: t("profile.privacy.personalised"), sub: t("profile.privacy.personalisedSub"), control: <Switch checked={personalised} onCheckedChange={(v) => setPrivacy({ personalised: v })} aria-label={t("profile.privacy.personalised")} /> },
    { i: Download, title: t("profile.privacy.data"), sub: t("profile.privacy.dataSub"), control: <Button size="sm" variant="outline" onClick={() => void exportData()}>{t("profile.privacy.request")}</Button> },
    { i: Trash2, title: t("profile.privacy.deleteAccount"), sub: t("profile.privacy.deleteSub"), control: <Button size="sm" variant="destructive" onClick={() => setConfirmDelete(true)}>{t("common.delete")}</Button> },
  ];
  return (
    <section><h2>{t("profile.nav.privacy")}</h2>
      {rows.map(({ i: I, title, sub, control }) => <div key={title} className="flex items-center gap-4 border-b border-line py-4 max-sm:flex-wrap"><I className="size-5 shrink-0 text-gold" /><span className="flex flex-1 flex-col"><b className="text-[14px] text-navy">{title}</b><small className="text-[12px] text-ink-muted">{sub}</small></span>{control}</div>)}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title={t("profile.privacy.deleteTitle")} description={t("profile.privacy.deleteText")}>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmDelete(false)}>{t("common.cancel")}</Button><Button variant="destructive" onClick={() => { setConfirmDelete(false); toast.success(t("profile.privacy.requested")); }}>{t("profile.privacy.deleteAccount")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
