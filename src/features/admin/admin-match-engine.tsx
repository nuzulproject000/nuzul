/* Match Engine configuration (§9, §11, §49): factor weights (must total 100), priority boost, labels &
 * thresholds, explanation rules, questionnaire editor, live preview against real hotels, audit log. */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Slider } from "@/components/ui/controls";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { ErrorState } from "@/components/common";
import { MatchPill } from "@/components/match";
import { DataTable, Panel, Toolbar } from "@/components/dashboard";
import { useAudit, useCollection, useMatchConfig, useMatchProfile, useQuestions, useSaveMatchConfig, useSaveQuestions } from "@/hooks/queries";
import { useDates } from "@/hooks/use-format";
import { computeMatch, DEFAULT_CONFIG, FACTOR_KEYS, weightsTotal, type MatchConfig } from "@/lib/match-engine";
import type { Question } from "@/services/questions";
import { errorMessage } from "@/lib/forms";
import { cn } from "@/lib/utils";

export default function AdminMatchEngine() {
  const { t } = useTranslation();
  const { data: cfg, error, refetch } = useMatchConfig();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!cfg) return <div className="skeleton h-[600px]" />;
  return (
    <Tabs defaultValue="scoring">
      <TabsList>{(["scoring", "questions", "audit"] as const).map((k) => <TabsTrigger key={k} value={k}>{t(`admin.me.tabs.${k}`)}</TabsTrigger>)}</TabsList>
      <TabsContent value="scoring"><Scoring saved={cfg} /></TabsContent>
      <TabsContent value="questions"><Questions /></TabsContent>
      <TabsContent value="audit"><Audit /></TabsContent>
    </Tabs>
  );
}

function Scoring({ saved }: { saved: MatchConfig }) {
  const { t } = useTranslation();
  const [c, setC] = useState<MatchConfig>(saved);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => setC(saved), [saved]);
  const save = useSaveMatchConfig();
  const { data: hotels } = useCollection("popular");
  const { data: profile } = useMatchProfile();
  const total = weightsTotal(c.weights);
  const thresholdsOk = c.thresholds.every((th, i, a) => i === 0 || th.min < a[i - 1].min);
  const valid = total === 100 && thresholdsOk && c.minScore < c.maxScore && c.weakFactor < c.strongFactor;
  const dirty = JSON.stringify(c) !== JSON.stringify(saved);
  const preview = useMemo(() => (hotels && profile ? hotels.slice(0, 6).map((h) => ({ h, before: computeMatch(h, profile, saved).score, after: computeMatch(h, profile, c).score })) : []), [hotels, profile, saved, c]);
  const num = (k: keyof MatchConfig) => (e: React.ChangeEvent<HTMLInputElement>) => setC({ ...c, [k]: Number(e.target.value) });

  return (
    <div className="flex flex-col gap-4">
      <Toolbar title={t("admin.me.title")} sub={t("admin.me.sub")}>
        <Button variant="outline" onClick={() => setC(DEFAULT_CONFIG)}><RotateCcw /> {t("admin.me.defaults")}</Button>
        <Button variant="outline" disabled={!dirty} onClick={() => setC(saved)}>{t("common.reset")}</Button>
        <Button variant="gold" disabled={!dirty || !valid || save.isPending} onClick={() => setConfirm(true)}>{t("admin.me.publish")}</Button>
      </Toolbar>
      <div className="grid grid-cols-[1.3fr_1fr] gap-4 max-lg:grid-cols-1">
        <Panel title={t("admin.me.weights")} sub={t("admin.me.weightsSub")} action={<b className={cn("rounded px-2 py-1 text-[12px]", total === 100 ? "bg-success-bg text-success" : "bg-error-bg text-error")} role="status">{t("admin.me.total", { n: total })}</b>}>
          <ul className="flex flex-col gap-4">
            {FACTOR_KEYS.map((k) => (
              <li key={k} className="grid grid-cols-[150px_1fr_64px] items-center gap-3 max-sm:grid-cols-[1fr_64px]">
                <span className="text-[12px] text-navy">{t(`match.factor.${k}`)}</span>
                <Slider className="max-sm:col-span-2 max-sm:row-start-2" min={0} max={40} step={1} value={[c.weights[k]]} onValueChange={([v]) => setC({ ...c, weights: { ...c.weights, [k]: v } })} thumbLabels={[t(`match.factor.${k}`)]} />
                <Input type="number" min={0} max={100} aria-label={t(`match.factor.${k}`)} value={c.weights[k]} onChange={(e) => setC({ ...c, weights: { ...c.weights, [k]: Number(e.target.value) } })} className="min-h-9 text-center" />
              </li>
            ))}
          </ul>
          {total !== 100 && <p role="alert" className="mt-3 text-[12px] font-semibold text-error">{t("admin.me.mustTotal", { n: total })}</p>}
        </Panel>
        <Panel title={t("admin.me.preview")} sub={t("admin.me.previewSub")}>
          <ul className="flex flex-col">
            {preview.map(({ h, before, after }) => (
              <li key={h.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[12px] last:border-0">
                <b className="truncate text-navy">{h.name}</b>
                <span className="flex items-center gap-2">{after !== before && <s className="text-ink-muted">{before}%</s>}<MatchPill score={after} />{after !== before && <small className={after > before ? "text-success" : "text-error"}>{after > before ? "+" : ""}{after - before}</small>}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Panel title={t("admin.me.scoring")}>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("admin.me.boost")} htmlFor="me-boost" hint={t("admin.me.boostHint")}><Input id="me-boost" type="number" step={0.1} min={1} max={3} value={c.priorityBoost} onChange={num("priorityBoost")} /></Field>
            <Field label={t("admin.me.noise")} htmlFor="me-noise" hint={t("admin.me.noiseHint")}><Input id="me-noise" type="number" step={0.1} min={0} value={c.noisePenaltyPerPct} onChange={num("noisePenaltyPerPct")} /></Field>
            <Field label={t("admin.me.min")} htmlFor="me-min"><Input id="me-min" type="number" min={0} max={99} value={c.minScore} onChange={num("minScore")} /></Field>
            <Field label={t("admin.me.max")} htmlFor="me-max" error={c.minScore >= c.maxScore ? t("admin.me.minMax") : undefined}><Input id="me-max" type="number" min={1} max={100} value={c.maxScore} onChange={num("maxScore")} /></Field>
          </div>
        </Panel>
        <Panel title={t("admin.me.explain")} sub={t("admin.me.explainSub")}>
          <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1">
            <Field label={t("admin.me.strong")} htmlFor="me-strong"><Input id="me-strong" type="number" value={c.strongFactor} onChange={num("strongFactor")} /></Field>
            <Field label={t("admin.me.weak")} htmlFor="me-weak" error={c.weakFactor >= c.strongFactor ? t("admin.me.weakStrong") : undefined}><Input id="me-weak" type="number" value={c.weakFactor} onChange={num("weakFactor")} /></Field>
            <Field label={t("admin.me.alert")} htmlFor="me-alert"><Input id="me-alert" type="number" value={c.noiseMentionAlertPct} onChange={num("noiseMentionAlertPct")} /></Field>
          </div>
          <h4 className="mt-5 mb-2 text-[12px]">{t("admin.me.labels")}</h4>
          {c.thresholds.map((th, i) => (
            <div key={i} className="mb-2 grid grid-cols-[1fr_90px] gap-2">
              <Input aria-label={t("admin.me.label")} value={th.label} onChange={(e) => setC({ ...c, thresholds: c.thresholds.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className="min-h-9" />
              <Input aria-label={t("admin.me.from")} type="number" disabled={i === c.thresholds.length - 1} value={th.min} onChange={(e) => setC({ ...c, thresholds: c.thresholds.map((x, j) => (j === i ? { ...x, min: Number(e.target.value) } : x)) })} className="min-h-9" />
            </div>
          ))}
          {!thresholdsOk && <p role="alert" className="text-[12px] text-error">{t("admin.me.thresholdOrder")}</p>}
        </Panel>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title={t("admin.me.confirmTitle")} description={t("admin.me.confirmText")}>
          {save.error && <p role="alert" className="text-[12px] text-error">{errorMessage(save.error, "")}</p>}
          <DialogFooter><Button variant="outline" onClick={() => setConfirm(false)}>{t("common.cancel")}</Button><Button variant="gold" disabled={save.isPending} onClick={() => save.mutate(c, { onSuccess: () => { toast.success(t("admin.me.published")); setConfirm(false); } })}>{t("admin.me.publish")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Questions() {
  const { t } = useTranslation();
  const { data } = useQuestions();
  const save = useSaveQuestions();
  const [qs, setQs] = useState<Question[]>([]);
  useEffect(() => { if (data) setQs(data); }, [data]);
  const upd = (i: number, patch: Partial<Question>) => setQs(qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const move = (i: number, d: -1 | 1) => { const n = [...qs]; [n[i], n[i + d]] = [n[i + d], n[i]]; setQs(n); };
  const invalid = qs.some((q) => !q.title.trim() || q.options.length < 2 || q.options.some((o) => !o.label.trim()));
  return (
    <div className="flex flex-col gap-4">
      <Toolbar title={t("admin.me.questions")} sub={t("admin.me.questionsSub")}>
        <Button variant="outline" disabled={JSON.stringify(qs) === JSON.stringify(data)} onClick={() => data && setQs(data)}>{t("common.reset")}</Button>
        <Button variant="gold" disabled={invalid || save.isPending || JSON.stringify(qs) === JSON.stringify(data)} onClick={() => save.mutate(qs, { onSuccess: () => toast.success(t("admin.me.questionsSaved")) })}>{t("common.saveChanges")}</Button>
      </Toolbar>
      {invalid && <p role="alert" className="text-[12px] font-semibold text-error">{t("admin.me.questionInvalid")}</p>}
      {qs.map((q, i) => (
        <Panel key={q.id} title={`${i + 1}. ${q.category}`} action={<span className="flex gap-1"><Button size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("admin.cat.up")}><ArrowUp /></Button><Button size="icon-sm" variant="ghost" disabled={i === qs.length - 1} onClick={() => move(i, 1)} aria-label={t("admin.cat.down")}><ArrowDown /></Button></span>}>
          <div className="grid grid-cols-[2fr_1fr_110px_90px] gap-3 max-md:grid-cols-2">
            <Field label={t("admin.me.qTitle")} htmlFor={`q-${q.id}`}><Input id={`q-${q.id}`} value={q.title} onChange={(e) => upd(i, { title: e.target.value })} className="min-h-10" /></Field>
            <Field label={t("admin.me.qHelper")} htmlFor={`qh-${q.id}`}><Input id={`qh-${q.id}`} value={q.helper} onChange={(e) => upd(i, { helper: e.target.value })} className="min-h-10" /></Field>
            <Field label={t("admin.me.qType")} htmlFor={`qt-${q.id}`}><Select id={`qt-${q.id}`} value={q.type} onValueChange={(v) => upd(i, { type: v as Question["type"] })} className="min-h-10" options={[{ value: "SINGLE", label: t("admin.me.single") }, { value: "MULTI", label: t("admin.me.multi") }]} /></Field>
            <Field label={t("admin.me.qWeight")} htmlFor={`qw-${q.id}`}><Input id={`qw-${q.id}`} type="number" min={0} max={100} value={q.weight} onChange={(e) => upd(i, { weight: Number(e.target.value) })} className="min-h-10" /></Field>
          </div>
          <h4 className="mt-4 mb-2 text-[12px]">{t("admin.me.options")}</h4>
          <div className="flex flex-wrap gap-2">
            {q.options.map((o, j) => <span key={o.value + j} className="flex items-center gap-1 border border-line bg-paper ps-2"><Input aria-label={t("admin.me.option")} value={o.label} onChange={(e) => upd(i, { options: q.options.map((x, k) => (k === j ? { ...x, label: e.target.value } : x)) })} className="min-h-8 w-36 border-0 px-1 text-[12px]" /><Button size="icon-sm" variant="ghost" aria-label={t("common.remove")} onClick={() => upd(i, { options: q.options.filter((_, k) => k !== j) })}><Trash2 /></Button></span>)}
            <Button size="sm" variant="outline" onClick={() => upd(i, { options: [...q.options, { value: `OPT_${Date.now()}`, label: "" }] })}><Plus /> {t("admin.me.addOption")}</Button>
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Audit() {
  const { t } = useTranslation();
  const { date } = useDates();
  const { data } = useAudit();
  return <DataTable caption={t("admin.me.tabs.audit")} rows={data ?? []} rowKey={(a) => a.at + a.action} cols={[
    { head: t("host.col.date"), cell: (a) => date(a.at, "d MMM yyyy HH:mm") },
    { head: t("admin.me.actor"), cell: (a) => a.actor },
    { head: t("admin.me.action"), cell: (a) => <span className="text-navy">{a.action}</span> },
  ]} />;
}
