/* Platform settings (§52, §55, §61, §62). Values are persisted in this browser until a settings service exists;
 * the page says so instead of pretending they apply platform-wide. */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/controls";
import { Panel, SampleBanner, Toolbar } from "@/components/dashboard";
import { FEES } from "@/lib/pricing";

type Settings = { commissionPct: number; servicePct: number; taxPct: number; defaultCurrency: "EGP" | "USD"; defaultLocale: "en" | "ar"; reviewWindowDays: number; holdExpiryMinutes: number; provider: "STRIPE" | "PAYMOB"; maintenance: boolean; requireVerifiedHosts: boolean };
const KEY = "nuzul.admin-settings";
const DEFAULTS: Settings = { commissionPct: 15, servicePct: FEES.servicePct * 100, taxPct: FEES.taxPct * 100, defaultCurrency: "EGP", defaultLocale: "en", reviewWindowDays: 14, holdExpiryMinutes: 15, provider: "STRIPE", maintenance: false, requireVerifiedHosts: true };
const load = (): Settings => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") }; } catch { return DEFAULTS; } };

export default function AdminSettings() {
  const { t } = useTranslation();
  const [s, setS] = useState<Settings>(load);
  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: Number(e.target.value) });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage unavailable */ } toast.success(t("admin.set.saved")); };
  return (
    <>
      <SampleBanner text={t("admin.set.note")} />
      <Toolbar title={t("admin.nav.settings")}><Button variant="outline" onClick={() => setS(DEFAULTS)}>{t("common.reset")}</Button><Button variant="gold" onClick={save}>{t("common.saveChanges")}</Button></Toolbar>
      <div className="grid grid-cols-2 gap-4 max-lg:grid-cols-1">
        <Panel title={t("admin.set.fees")}><div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
          <Field label={t("admin.set.commission")} htmlFor="s-com"><Input id="s-com" type="number" min={0} max={40} value={s.commissionPct} onChange={num("commissionPct")} /></Field>
          <Field label={t("admin.set.service")} htmlFor="s-svc"><Input id="s-svc" type="number" step={0.1} value={s.servicePct} onChange={num("servicePct")} /></Field>
          <Field label={t("admin.set.tax")} htmlFor="s-tax"><Input id="s-tax" type="number" value={s.taxPct} onChange={num("taxPct")} /></Field>
        </div></Panel>
        <Panel title={t("admin.set.locale")}><div className="grid grid-cols-2 gap-3">
          <Field label={t("profile.currencyLabel")} htmlFor="s-cur"><Select id="s-cur" value={s.defaultCurrency} onValueChange={(v) => setS({ ...s, defaultCurrency: v as Settings["defaultCurrency"] })} options={[{ value: "EGP", label: "EGP" }, { value: "USD", label: "USD" }]} /></Field>
          <Field label={t("profile.languageLabel")} htmlFor="s-loc"><Select id="s-loc" value={s.defaultLocale} onValueChange={(v) => setS({ ...s, defaultLocale: v as Settings["defaultLocale"] })} options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} /></Field>
        </div></Panel>
        <Panel title={t("admin.set.bookings")}><div className="grid grid-cols-2 gap-3">
          <Field label={t("admin.set.reviewWindow")} htmlFor="s-rw"><Input id="s-rw" type="number" value={s.reviewWindowDays} onChange={num("reviewWindowDays")} /></Field>
          <Field label={t("admin.set.hold")} htmlFor="s-hold"><Input id="s-hold" type="number" value={s.holdExpiryMinutes} onChange={num("holdExpiryMinutes")} /></Field>
          <Field label={t("admin.set.provider")} htmlFor="s-prov"><Select id="s-prov" value={s.provider} onValueChange={(v) => setS({ ...s, provider: v as Settings["provider"] })} options={[{ value: "STRIPE", label: "Stripe" }, { value: "PAYMOB", label: "Paymob" }]} /></Field>
        </div></Panel>
        <Panel title={t("admin.set.platform")}><div className="flex flex-col gap-4">
          <label className="flex items-center justify-between gap-3 text-[13px] text-navy">{t("admin.set.verifiedHosts")}<Switch checked={s.requireVerifiedHosts} onCheckedChange={(v) => setS({ ...s, requireVerifiedHosts: v })} /></label>
          <label className="flex items-center justify-between gap-3 text-[13px] text-navy">{t("admin.set.maintenance")}<Switch checked={s.maintenance} onCheckedChange={(v) => setS({ ...s, maintenance: v })} /></label>
        </div></Panel>
      </div>
    </>
  );
}
