/* Shared building blocks for Host & Admin dashboards (§39–52): metric tiles, chart cards, tables, Recharts wrappers. */
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Bar as RBar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const CHART = { gold: "#b8945b", navy: "#0f1c2e", sand: "#d8b98a", grid: "#e8e2d6", ink: "#73716d" } as const;

export function SampleBanner({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-3 border border-line bg-paper px-4 py-3 text-[12px]" role="note">
      <span className="flex flex-wrap gap-x-2"><b className="text-navy">{t("dash.sample")}</b><span className="text-ink-muted">{text ?? t("dash.sampleText")}</span></span>
      <ShieldCheck className="size-4 shrink-0 text-gold" />
    </div>
  );
}

export function MetricGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 | 6 }) {
  return <div className={cn("grid gap-3 max-md:grid-cols-2", cols === 6 ? "grid-cols-6 max-xl:grid-cols-3" : cols === 4 ? "grid-cols-4 max-lg:grid-cols-2" : "grid-cols-3")}>{children}</div>;
}

export function Metric({ label, value, delta, sub }: { label: string; value: React.ReactNode; delta?: number; sub?: string }) {
  const { t } = useTranslation();
  return (
    <article className="flex flex-col gap-1.5 border border-line bg-paper p-4">
      <span className="text-[10px] font-bold tracking-[0.1em] text-ink-muted uppercase">{label}</span>
      <b className="text-[24px] leading-tight tracking-tight text-navy">{value}</b>
      {delta !== undefined ? <small className={cn("flex items-center gap-1 text-[11px]", delta >= 0 ? "text-success" : "text-error")}>{delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} {delta > 0 ? "+" : ""}{delta}% {t("dash.vsLast")}</small> : sub ? <small className="text-[11px] text-ink-muted">{sub}</small> : null}
    </article>
  );
}

export function Panel({ title, sub, action, children, className }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("min-w-0 border border-line bg-paper p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="m-0 text-[15px]">{title}</h3>{sub && <p className="m-0 mt-1 text-[11px] text-ink-muted">{sub}</p>}</div>{action}</div>
      {children}
    </section>
  );
}

export function Toolbar({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="m-0 text-[22px]">{title}</h2>{sub && <p className="m-0 mt-1 text-[12px] text-ink-muted">{sub}</p>}</div>{children && <div className="flex flex-wrap items-center gap-2">{children}</div>}</div>;
}

/** Semantic table that scrolls horizontally on small screens. */
export function DataTable<T>({ rows, cols, empty, rowKey, caption }: { rows: T[]; cols: { head: string; cell: (r: T) => React.ReactNode; className?: string }[]; empty?: React.ReactNode; rowKey: (r: T) => string; caption: string }) {
  if (!rows.length && empty) return <>{empty}</>;
  return (
    <div className="overflow-x-auto border border-line bg-paper">
      <table className="w-full min-w-[720px] border-collapse text-[12px]">
        <caption className="sr-only">{caption}</caption>
        <thead><tr className="border-b border-line bg-soft/50">{cols.map((c) => <th key={c.head} scope="col" className={cn("px-4 py-3 text-start text-[10px] font-bold tracking-[0.08em] text-ink-muted uppercase", c.className)}>{c.head}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={rowKey(r)} className="border-b border-line last:border-0 hover:bg-soft/30">{cols.map((c) => <td key={c.head} className={cn("px-4 py-3 align-middle text-charcoal", c.className)}>{c.cell(r)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return <span className={cn("inline-grid size-8 shrink-0 place-items-center rounded-full bg-soft text-[10px] font-bold text-navy", className)} aria-hidden>{name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>;
}

type Datum = Record<string, string | number>;
const tooltipStyle = { contentStyle: { background: "#fffdf8", border: "1px solid #ded8cc", fontSize: 12, borderRadius: 4 }, cursor: { fill: "rgb(184 148 91 / .08)" } };

export function BarSeries({ data, x, y, height = 220, color = CHART.gold, format, label }: { data: Datum[]; x: string; y: string; height?: number; color?: string; format?: (v: number) => string; label: string }) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  return (
    <figure className="m-0" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={x} reversed={rtl} tick={{ fontSize: 10, fill: CHART.ink }} tickLine={false} axisLine={false} />
          <YAxis orientation={rtl ? "right" : "left"} tick={{ fontSize: 10, fill: CHART.ink }} tickLine={false} axisLine={false} width={44} tickFormatter={format ? (v) => format(Number(v)) : undefined} />
          <Tooltip {...tooltipStyle} formatter={(v) => (format ? format(Number(v)) : String(v))} />
          <RBar dataKey={y} fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function LineSeries({ data, x, lines, height = 220, label, format }: { data: Datum[]; x: string; lines: { key: string; color: string; name: string }[]; height?: number; label: string; format?: (v: number) => string }) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  return (
    <figure className="m-0" aria-label={label}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey={x} reversed={rtl} tick={{ fontSize: 10, fill: CHART.ink }} tickLine={false} axisLine={false} />
          <YAxis orientation={rtl ? "right" : "left"} tick={{ fontSize: 10, fill: CHART.ink }} tickLine={false} axisLine={false} width={44} tickFormatter={format ? (v) => format(Number(v)) : undefined} />
          <Tooltip {...tooltipStyle} />
          {lines.map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
      <figcaption className="mt-2 flex gap-4 text-[11px] text-ink-muted">{lines.map((l) => <span key={l.key} className="flex items-center gap-1.5"><i className="block h-0.5 w-4" style={{ background: l.color }} />{l.name}</span>)}</figcaption>
    </figure>
  );
}

/** Horizontal labelled bars (funnels, segments). */
export function HBars({ rows, format, tone = "gold" }: { rows: { label: string; value: number; max?: number; note?: string }[]; format?: (v: number) => string; tone?: "gold" | "navy" }) {
  const max = Math.max(...rows.map((r) => r.max ?? r.value), 1);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[130px_1fr_64px] items-center gap-3 text-[12px] text-navy max-sm:grid-cols-[100px_1fr_56px]">
          <span className="truncate">{r.label}{r.note && <small className="block truncate text-[10px] text-ink-muted">{r.note}</small>}</span>
          <span className="h-2 overflow-hidden rounded-full bg-soft" role="meter" aria-valuenow={r.value} aria-valuemin={0} aria-valuemax={max} aria-label={r.label}><span className={cn("block h-full rounded-full", tone === "gold" ? "bg-gold" : "bg-navy")} style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <b className="text-end">{format ? format(r.value) : r.value}</b>
        </li>
      ))}
    </ul>
  );
}

export const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 2)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
