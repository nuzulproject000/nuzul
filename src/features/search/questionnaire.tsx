/* Match Questionnaire (§6–7). Questions come from the Admin-configured set. */
import { track } from "@/lib/analytics";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Building2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/controls";
import { MatchRing } from "@/components/match";
import { useMatchProfile, useQuestions, useSaveProfile } from "@/hooks/queries";
import type { MatchProfile } from "@/lib/match-engine";
import { cn } from "@/lib/utils";

/** Compact action buttons (≈40px tall, 14px text). */
const QUIZ_BTN = "h-10 min-h-10 cursor-pointer gap-1.5 rounded-md px-4 text-[14px] [&_svg]:size-4";

export function Questionnaire() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: questions = [], isLoading } = useQuestions();
  const { data: profile } = useMatchProfile();
  const save = useSaveProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!profile || !questions.length) return;
    const init: Record<string, string[]> = {};
    questions.forEach((q) => {
      const v = profile[q.field];
      const vals = Array.isArray(v) ? (v as string[]) : [String(v)];
      init[q.id] = vals.filter((x) => q.options.some((o) => o.value === x));
    });
    setAnswers(init);
  }, [profile, questions]);

  if (isLoading || !questions.length) return <div className="skeleton h-[500px]" aria-busy />;
  const q = questions[Math.min(step, questions.length - 1)];
  const picked = answers[q.id] ?? [];
  const pct = ((step + 1) / questions.length) * 100;

  const choose = (v: string) => setAnswers((a) => {
    const cur = a[q.id] ?? [];
    if (q.type === "SINGLE") return { ...a, [q.id]: [v] };
    if (cur.includes(v)) return { ...a, [q.id]: cur.filter((x) => x !== v) };
    if (q.maxPicks && cur.length >= q.maxPicks) return a;
    return { ...a, [q.id]: [...cur, v] };
  });

  const finish = () => {
    const patch: Partial<MatchProfile> = { saved: true };
    questions.forEach((qq) => {
      const v = answers[qq.id] ?? [];
      if (qq.type === "MULTI") (patch as Record<string, unknown>)[qq.field] = v;
      else if (v[0]) (patch as Record<string, unknown>)[qq.field] = v[0];
    });
    save.mutate(patch, { onSuccess: () => { track("questionnaire_complete"); toast.success(t("profile.prefsSaved")); navigate("/search?sort=MATCH"); } });
  };

  return (
    <section aria-labelledby="quiz-title" className="grid min-h-[500px] grid-cols-[1fr_1.08fr] bg-navy p-[clamp(40px,4vw,88px)] max-lg:p-10 max-md:block max-md:min-h-0 max-md:p-0">
      <div className="py-8 ps-2 pe-[clamp(32px,4vw,96px)] max-lg:pe-8 max-md:px-5 max-md:pt-10 max-md:pb-8">
        <span className="eyebrow eyebrow-light">{t("quiz.eyebrow", { count: questions.length })}</span>
        <h2 id="quiz-title" className="text-ivory max-md:text-[28px]">{t("quiz.title1")}<br />{t("quiz.title2")}</h2>
        <p className="max-w-md text-[#b6bdc7]">{t("quiz.lead")}</p>
        <div className="mt-11 flex items-center gap-3.5 border-t border-white/15 pt-6 text-sand max-md:mt-6">
          <MatchRing score={72} size={22} dark />
          <span className="flex flex-col"><b className="text-[13px] text-ivory">{t("quiz.proof1")}</b><small className="mt-1 text-[11px] text-[#9da5af]">{t("quiz.proof1Sub")}</small></span>
        </div>
        <div className="mt-4 flex items-center gap-3.5 border-t border-white/15 pt-4 text-sand">
          <Building2 className="size-[18px] shrink-0" />
          <span className="flex flex-col"><b className="text-[13px] text-ivory">{t("quiz.proof2")}</b><small className="mt-1 text-[11px] text-[#9da5af]">{t("quiz.proof2Sub")}</small></span>
        </div>
      </div>
      <div className="bg-ivory px-10 py-9 max-md:px-5 max-md:pt-7 max-md:pb-8">
        <div className="flex justify-between text-[10px] font-bold tracking-[0.08em] text-ink-muted"><span>{t("quiz.progress", { n: step + 1, total: questions.length, category: q.category })}</span><span>{Math.round(pct)}%</span></div>
        <Progress value={pct} className="mt-3 mb-8" label={t("quiz.progress", { n: step + 1, total: questions.length, category: q.category })} />
        <h3 className="mb-2 text-2xl" aria-live="polite">{q.title}</h3>
        <p className="text-[13px] text-ink-muted">{q.helper}{q.maxPicks ? ` · ${t("quiz.picks", { n: picked.length, max: q.maxPicks })}` : ""}</p>
        <div role={q.type === "SINGLE" ? "radiogroup" : "group"} aria-label={q.title} className="mt-6 mb-8 grid grid-cols-3 gap-2.5 max-md:grid-cols-2">
          {q.options.map((o) => { const on = picked.includes(o.value); return (
            <button key={o.value} type="button" role={q.type === "SINGLE" ? "radio" : undefined} aria-checked={q.type === "SINGLE" ? on : undefined} aria-pressed={q.type === "MULTI" ? on : undefined}
              onClick={() => choose(o.value)} className={cn("flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-1.5 border px-2 text-[12px] text-navy transition-colors duration-150", on ? "border-gold bg-sand font-bold" : "border-line hover:bg-soft/60")}>
              {on && <Check className="size-4" />} {o.label}
            </button>
          ); })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="text" disabled={step === 0} className="cursor-pointer gap-1.5 text-[12px] [&_svg]:size-3.5" onClick={() => setStep(step - 1)}><ArrowLeft className="rtl:rotate-180" /> {t("common.back")}</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className={QUIZ_BTN + " font-semibold text-ink-muted hover:text-navy"} onClick={() => (step < questions.length - 1 ? setStep(step + 1) : finish())}>{t("quiz.skip")}</Button>
            {step < questions.length - 1
              ? <Button variant="gold" className={QUIZ_BTN} disabled={!picked.length} onClick={() => setStep(step + 1)}>{t("common.continue")} <ArrowRight className="rtl:rotate-180" /></Button>
              : <Button variant="gold" className={QUIZ_BTN} disabled={save.isPending} onClick={finish}>{t("quiz.show")} <ArrowRight className="rtl:rotate-180" /></Button>}
          </div>
        </div>
      </div>
    </section>
  );
}
