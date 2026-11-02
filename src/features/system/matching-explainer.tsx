/* "How matching works" (§8–12, §66): rating vs Match Score, live factor weights from the Match Engine config. */
import { useTranslation } from "react-i18next";
import { Rating } from "@/components/common";
import { Bar } from "@/components/common";
import { MatchPill } from "@/components/match";
import { useMatchConfig } from "@/hooks/queries";
import { DEFAULT_CONFIG, FACTOR_KEYS } from "@/lib/match-engine";

export function MatchingExplainer() {
  const { t } = useTranslation();
  const { data: cfg = DEFAULT_CONFIG } = useMatchConfig();
  return (
    <div>
      <div className="grid grid-cols-2 gap-px bg-line max-md:grid-cols-1">
        <div className="bg-paper p-7"><span className="text-[9px] font-bold tracking-[0.14em] text-ink-muted uppercase">{t("match.rating")}</span><h3 className="mt-2 text-xl">{t("system.hotelRatingQ")}</h3><p className="m-0 text-[13px] text-ink-muted">{t("system.hotelRatingA")}</p></div>
        <div className="bg-[#fbf6ec] p-7"><span className="text-[9px] font-bold tracking-[0.14em] text-gold uppercase">{t("match.score")}</span><h3 className="mt-2 text-xl">{t("system.matchQ")}</h3><p className="m-0 text-[13px] text-ink-muted">{t("system.matchA")}</p></div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <div className="flex flex-col gap-2 border border-line bg-paper p-5"><b className="text-navy">Hotel A</b><Rating rating={4.9} /><MatchPill score={76} /></div>
        <div className="flex flex-col gap-2 border border-gold bg-paper p-5 shadow-[inset_0_0_0_1px_var(--gold)]"><b className="text-navy">Hotel B</b><Rating rating={4.7} /><MatchPill score={95} /><small className="text-[11px] font-bold text-gold">{t("system.recommendedFirst")}</small></div>
      </div>
      <h3 className="mt-10 mb-4 text-lg">{t("system.weights")}</h3>
      <ul className="flex max-w-2xl flex-col gap-3">
        {FACTOR_KEYS.map((k) => <li key={k} className="grid grid-cols-[180px_1fr_44px] items-center gap-3 text-[13px] text-navy"><span>{t(`match.factor.${k}`)}</span><Bar value={cfg.weights[k]} max={25} label={t(`match.factor.${k}`)} /><b className="text-end">{cfg.weights[k]}%</b></li>)}
      </ul>
      <p className="mt-5 max-w-2xl text-[12px] text-ink-muted">{t("system.weightsNote")}</p>
    </div>
  );
}
