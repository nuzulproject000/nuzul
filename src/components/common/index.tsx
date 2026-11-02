import * as React from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Award, BadgeCheck, RefreshCw, Star, TriangleAlert } from "lucide-react";
import type { ApiError } from "@/types/api";
import type { BookingState } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/controls";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/nuzul-mark.jpg";

export function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", light ? "text-ivory" : "text-navy")}>
      <img src={logoMark} alt="" aria-hidden className="h-10 w-11 object-contain max-md:h-8 max-md:w-9" />
      {!compact && (
        <span className="flex flex-col items-center leading-none">
          <b className="ms-[0.35em] text-[15px] tracking-[0.35em] max-md:text-xs">NUZUL</b>
          <small className="mt-1 font-arabic text-[13px] max-md:text-[11px]">نُزُل</small>
        </span>
      )}
      <span className="sr-only">Nuzul</span>
    </span>
  );
}

export function SectionHeading({ eyebrow, title, sub, action, onAction, className }: { eyebrow?: string; title: string; sub?: string; action?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cn("mb-7 flex items-end justify-between gap-4 max-md:flex-col max-md:items-start", className)}>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="mb-0">{title}</h2>
        {sub && <p className="mt-2.5 mb-0 max-w-2xl text-[13px] text-ink-muted">{sub}</p>}
      </div>
      {action && <Button variant="text" onClick={onAction} className="shrink-0">{action} <ArrowRight className="rtl:rotate-180" /></Button>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, lead, actions }: { eyebrow?: string; title: string; lead?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-10 flex items-end justify-between gap-5 max-md:flex-col max-md:items-start">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mb-2.5 text-[48px] max-md:text-[36px]">{title}</h1>
        {lead && <p className="m-0 text-ink-muted">{lead}</p>}
      </div>
      {actions}
    </div>
  );
}

export function EmptyState({ icon, title, text, action, onAction, className }: { icon?: React.ReactNode; title: string; text: string; action?: string; onAction?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center border border-dashed border-line bg-paper px-6 py-14 text-center", className)}>
      {icon && <span className="grid size-14 place-items-center rounded-full bg-soft text-gold [&_svg]:size-6">{icon}</span>}
      <h3 className="mt-3.5 mb-1.5 text-xl">{title}</h3>
      <p className="max-w-sm text-[13px] text-ink-muted">{text}</p>
      {action && <Button onClick={onAction} className="mt-2">{action}</Button>}
    </div>
  );
}

export function ErrorState({ error, title, onRetry, className }: { error?: ApiError | Error | null; title?: string; onRetry?: () => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className={cn("flex flex-col items-center border border-dashed border-line bg-paper px-6 py-14 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-full bg-error-bg text-error"><TriangleAlert className="size-6" /></span>
      <h3 className="mt-3.5 mb-1.5 text-xl">{title ?? t("errors.generic")}</h3>
      <p className="max-w-sm text-[13px] text-ink-muted">{error?.message ?? t("errors.network")}</p>
      {onRetry && <Button variant="outline" onClick={onRetry}><RefreshCw /> {t("common.retry")}</Button>}
    </div>
  );
}

export function CardSkeleton() {
  return <div className="flex flex-col gap-2.5" aria-hidden><Skeleton className="aspect-[4/3]" /><Skeleton className="h-3 w-3/5" /><Skeleton className="h-3 w-11/12" /><Skeleton className="h-3 w-2/5" /></div>;
}

const STATE_TONE: Record<string, "success" | "warn" | "danger" | "neutral"> = {
  CONFIRMED: "success", COMPLETED: "success", CHECKED_IN: "success", PENDING: "warn", EXPIRED: "warn", CANCELLED: "danger", FAILED: "danger", NO_SHOW: "danger", REFUNDED: "neutral",
};
export function BookingStateBadge({ state }: { state: BookingState }) {
  const { t } = useTranslation();
  return <Badge tone={STATE_TONE[state]}>{t(`states.bookingState.${state}`)}</Badge>;
}
export function StatusBadge({ label, tone }: { label: string; tone: "success" | "warn" | "danger" | "neutral" | "navy" }) {
  return <Badge tone={tone}>{label}</Badge>;
}

export function Rating({ rating, reviews, compact = false, className }: { rating: number; reviews?: number; compact?: boolean; className?: string }) {
  const { t } = useTranslation();
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold text-navy", className)} title={t("match.ratingQ")}>
      <Star className="size-3.5 fill-current" aria-hidden /> {rating.toFixed(1)}
      {reviews !== undefined && <span className="font-medium text-ink-muted">· {compact ? reviews.toLocaleString() : t("common.review", { count: reviews })}</span>}
      <span className="sr-only">{t("match.rating")}</span>
    </span>
  );
}

export function GuestFavoriteBadge({ small = false }: { small?: boolean }) {
  const { t } = useTranslation();
  return <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line bg-paper font-bold text-navy", small ? "px-2 py-1 text-[9px] shadow-[0_2px_8px_rgb(15_28_46/.15)]" : "px-2.5 py-1.5 text-[10px]")}><Award className={cn("text-gold", small ? "size-3" : "size-3.5")} /> {t("card.guestFavorite")}</span>;
}

export function VerifiedStay({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success"><BadgeCheck className="size-3.5" /> {label}</span>;
}

export function Bar({ value, max = 100, tone = "gold", className, label }: { value: number; max?: number; tone?: "gold" | "sand" | "danger" | "navy"; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label} className={cn("block h-1 overflow-hidden rounded-full bg-soft", className)}>
      <span className={cn("block h-full rounded-full", { gold: "bg-gold", sand: "bg-sand", danger: "bg-[#c97a6c]", navy: "bg-navy" }[tone])} style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Counter({ label, sub, value, min = 0, max = 16, onChange }: { label: string; sub?: string; value: number; min?: number; max?: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-3 last:border-0">
      <span className="flex flex-col text-[13px] text-navy"><b>{label}</b>{sub && <small className="mt-0.5 text-[11px] text-ink-muted">{sub}</small>}</span>
      <div className="flex items-center gap-3">
        <button type="button" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`− ${label}`} className="grid size-8 place-items-center rounded-full border border-line bg-paper text-navy disabled:opacity-30">−</button>
        <b aria-live="polite" className="min-w-4 text-center text-navy">{value}</b>
        <button type="button" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`+ ${label}`} className="grid size-8 place-items-center rounded-full border border-line bg-paper text-navy disabled:opacity-30">+</button>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-3 text-[13px] text-navy">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>{t("results.prev")}</Button>
      <span>{t("results.page", { page, total: totalPages })}</span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>{t("results.next")}</Button>
    </nav>
  );
}

/** Chip used for quick filters / preferences. */
export function Chip({ active, onClick, children, className, ...rest }: { active?: boolean; onClick?: () => void; children: React.ReactNode; className?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-line px-3 py-2 text-[11px] text-navy transition-colors", active ? "bg-navy text-white" : "bg-transparent hover:bg-soft/60", className)} {...rest}>
      {children}
    </button>
  );
}

export function SegButtons<T extends string | number>({ value, options, onChange, dark = false, ariaLabel }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; dark?: boolean; ariaLabel?: string }) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex flex-wrap gap-0.5 rounded-lg p-[3px]", dark ? "bg-white/10" : "bg-soft")}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={cn("rounded-md px-3 py-2 text-[12px] font-semibold", dark ? "text-[#cfd5dc]" : "text-navy", value === o.value && (dark ? "bg-white text-navy" : "bg-paper shadow-[0_1px_4px_rgb(15_28_46/.12)]"))}>{o.label}</button>
      ))}
    </div>
  );
}
