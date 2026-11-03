/* Match Score visual identity (§59) — Nuzul's own mark: a progress ring
 * around a centre point ("a stay that fits"). Replaces the generic sparkle
 * from v1. Every prominent score offers "Why?" (§10, §66). */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, CircleHelp } from "lucide-react";
import type { HotelWithMatch } from "@/types/api";
import type { MatchProfile, MatchResult, Reason } from "@/lib/match-engine";
import { useHotel, useMatchConfig, useMatchProfile } from "@/hooks/queries";
import { useUi } from "@/stores/ui.store";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bar, Rating } from "@/components/common";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";

export function MatchRing({ score, size = 18, stroke = 2.5, dark = false, dot = size < 40 }: { score: number; size?: number; stroke?: number; dark?: boolean; dot?: boolean }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = dark ? "var(--sand)" : "var(--gold)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? "rgb(255 255 255 / .18)" : "rgb(184 148 91 / .25)"} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(score / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      {dot && <circle cx={size / 2} cy={size / 2} r={Math.max(1.4, size * 0.11)} fill={color} />}
    </svg>
  );
}

/** Pill used on cards, comparisons, lists. Distinct from star ratings by design. */
export function MatchPill({ score, hotelId, dark = false, className }: { score: number; hotelId?: string; dark?: boolean; className?: string }) {
  const { t } = useTranslation();
  const openWhy = useUi((s) => s.openWhy);
  return (
    <span title={t("match.personal")} className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border py-[5px] ps-[7px] pe-1.5 text-[11px]", dark ? "border-sand/35 bg-sand/12 text-sand" : "border-gold/40 bg-sand/18 text-gold-ink", !hotelId && "pe-2.5", className)}>
      <MatchRing score={score} size={16} stroke={2.4} dark={dark} />
      <b className="tracking-tight">{t("match.match", { score })}</b>
      {hotelId && (
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); openWhy(hotelId); }} aria-label={`${t("match.whyThis")} (${score}%)`}
          className={cn("rounded-full border px-2 py-[3px] text-[9px] font-bold", dark ? "cursor-pointer border-sand/40 text-sand hover:opacity-80" : "cursor-pointer border-gold/35 bg-paper text-navy hover:opacity-80")}>
          {t("match.why")}
        </button>
      )}
    </span>
  );
}

export function MatchLarge({ match, hotelId, dark = false }: { match: MatchResult; hotelId?: string; dark?: boolean }) {
  const { t } = useTranslation();
  const openWhy = useUi((s) => s.openWhy);
  return (
    <div className="flex items-center gap-4">
      <div className="relative grid place-items-center">
        <MatchRing score={match.score} size={92} stroke={6} dark={dark} />
        <b className={cn("absolute text-[26px] font-bold tracking-tighter", dark ? "text-white" : "text-navy")}>{match.score}<small className="text-[13px]">%</small></b>
      </div>
      <span className="flex flex-col gap-1">
        <small className="text-[10px] font-bold tracking-[0.12em] text-gold uppercase">{match.label}</small>
        <b className={cn("text-[15px]", dark ? "text-ivory" : "text-navy")}>{t("match.forYou")}</b>
        {hotelId && <button type="button" onClick={() => openWhy(hotelId)} className={cn("inline-flex items-center gap-1 py-1 text-[11px] font-bold", dark ? "text-sand" : "text-gold")}>{t("match.whyThis")} <ArrowRight className="size-3 rtl:rotate-180" /></button>}
      </span>
    </div>
  );
}

/** Localises the engine's structured reasons. */
export function useReasonText() {
  const { t } = useTranslation();
  return useCallback((r: Reason) => {
    const p = { ...(r.params ?? {}) } as Record<string, string | number>;
    if (typeof p.room === "string") p.room = t(`match.room.${p.room}`);
    if (typeof p.factor === "string") p.factor = t(`match.factor.${p.factor}`);
    return t(`match.reason.${r.code}`, p);
  }, [t]);
}

export function useMatchSummary() {
  const { t } = useTranslation();
  const reason = useReasonText();
  return useCallback((m: MatchResult, p?: MatchProfile) => {
    const lead = t("match.summaryLead", { purpose: t(`match.purpose.${p?.purpose ?? "COUPLE"}`), facilities: (p?.facilities ?? []).slice(0, 2).join(" & ") || "comfort" });
    return m.negatives.length ? `${lead} ${t("match.summaryHowever", { reason: reason(m.negatives[0]) })}` : `${lead} ${t("match.summaryNone")}`;
  }, [t, reason]);
}

/** Global "Why this match?" dialog, opened from any MatchPill. */
export function WhyMatchDialog() {
  const id = useUi((s) => s.whyMatchHotelId);
  const openWhy = useUi((s) => s.openWhy);
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && openWhy(null)}>
      {id && <WhyMatchBody hotelId={id} onClose={() => openWhy(null)} />}
    </Dialog>
  );
}

function WhyMatchBody({ hotelId, onClose }: { hotelId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: hotel } = useHotel(hotelId);
  const { data: profile } = useMatchProfile();
  const { data: cfg } = useMatchConfig();
  const reason = useReasonText();
  const summary = useMatchSummary();
  if (!hotel) return <DialogContent size="lg" title={t("common.loading")}><div className="skeleton h-64" /></DialogContent>;
  const m = (hotel as HotelWithMatch).match;
  const selected = profile ? [t(`profile.purposeLabel.${profile.purpose}`), t(`profile.budgetLabel.${profile.budget}`), ...profile.atmosphere, ...profile.facilities, ...profile.priorities.map((p) => t(`profile.priorityLabel.${p}`))] : [];
  return (
    <DialogContent size="lg" title={t("match.title", { score: m.score })}>
      <div className="flex items-center gap-5 border border-line bg-paper p-4 max-sm:flex-col max-sm:items-start">
        <MatchLarge match={m} />
        <div><b className="text-base text-navy">{hotel.name}</b><p className="mt-1.5 mb-0 text-[13px] text-ink-muted">{summary(m, profile)}</p></div>
      </div>
      <div className="mt-5 grid gap-7 md:grid-cols-[1fr_1.2fr]">
        <section>
          <h4 className="text-[13px]">{t("match.youSelected")}</h4>
          <ul className="mt-2 flex flex-wrap gap-1.5">{selected.map((s) => <li key={s} className="rounded-full bg-soft px-2.5 py-1 text-[11px] text-navy">{s}</li>)}</ul>
          <h4 className="mt-5 text-[13px]">{t("match.matches")}</h4>
          <ul className="mt-2 space-y-1.5 text-[13px]">{m.positives.map((p, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" /> {reason(p)}</li>)}</ul>
          <h4 className="mt-5 text-[13px]">{t("match.mayNot")}</h4>
          {m.negatives.length ? <ul className="mt-2 space-y-1.5 text-[13px]">{m.negatives.map((n, i) => <li key={i} className="flex gap-2"><CircleHelp className="mt-0.5 size-4 shrink-0 text-warn" /> <span className="first-letter:uppercase">{reason(n)}</span></li>)}</ul> : <p className="mt-2 text-[13px] text-ink-muted">{t("match.nothingConflicts")}</p>}
        </section>
        <section>
          <h4 className="text-[13px]">{t("match.breakdown")}</h4>
          {m.factors.map((f) => (
            <div key={f.key} className="grid grid-cols-[1.2fr_1fr_40px] items-center gap-2.5 border-b border-line py-2">
              <span className="flex flex-col text-[12px] font-semibold text-navy">{t(`match.factor.${f.key}`)}<small className="text-[10px] font-normal text-ink-muted">{reason(f.note)}</small></span>
              <Bar value={f.score} tone={f.score < (cfg?.weakFactor ?? 76) ? "danger" : "gold"} label={t(`match.factor.${f.key}`)} />
              <b className="text-end text-[12px] text-navy">{f.score}%</b>
            </div>
          ))}
          <p className="mt-3 text-[11px] text-ink-muted">{t("match.weightNote", { boost: cfg?.priorityBoost ?? 1.5 })}</p>
        </section>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-px bg-line max-sm:grid-cols-1">
        <div className="flex flex-col gap-1 bg-paper p-4"><span className="text-[9px] font-bold tracking-[0.14em] text-ink-muted uppercase">{t("match.rating")}</span><Rating rating={hotel.rating} reviews={hotel.reviewCount} /><small className="text-[11px] text-ink-muted">{t("match.ratingQ")}</small></div>
        <div className="flex flex-col gap-1 bg-[#fbf6ec] p-4"><span className="text-[9px] font-bold tracking-[0.14em] text-ink-muted uppercase">{t("match.score")}</span><b className="text-xl text-gold">{m.score}%</b><small className="text-[11px] text-ink-muted">{t("match.scoreQ")}</small></div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => { onClose(); navigate("/profile/preferences"); }}>{t("match.editPrefs")}</Button>
        <Button onClick={() => { onClose(); navigate(hotelPath(hotel)); }}>{t("match.viewStay")} <ArrowRight className="rtl:rotate-180" /></Button>
      </DialogFooter>
    </DialogContent>
  );
}
