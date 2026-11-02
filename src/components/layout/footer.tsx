import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "@/components/common";
import { usePreferences } from "@/stores/preferences.store";
import { useSearch } from "@/stores/search.store";

export function Footer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { locale, setLocale, currency, setCurrency } = usePreferences();
  const setSearch = useSearch((s) => s.set);
  const city = (c: string) => { setSearch({ destination: c }); navigate("/search"); };
  const linkCls = "text-start text-[11px] text-[#aeb7c2] hover:text-white";
  return (
    <footer className="mt-28 bg-navy px-[max(48px,calc((100vw-1400px)/2))] pt-16 pb-6 text-white max-md:mt-16 max-md:px-6 max-md:pt-11">
      <div className="grid grid-cols-[2fr_repeat(3,1fr)] gap-12 max-md:grid-cols-2 max-md:gap-7">
        <div className="max-md:col-span-2"><Logo light /><p className="mt-5 text-xs text-[#aeb7c2]">{t("home.lead")}</p><span className="text-[11px] text-sand">{t("brand.tagline")}</span></div>
        <div className="flex flex-col items-start gap-3"><b className="mb-1.5 text-[11px] tracking-widest text-sand uppercase">{t("nav.explore")}</b>{["Cairo", "Sharm El Sheikh", "Dubai", "Paris", "London"].map((c) => <button key={c} type="button" className={linkCls} onClick={() => city(c)}>{c}</button>)}</div>
        <div className="flex flex-col items-start gap-3"><b className="mb-1.5 text-[11px] tracking-widest text-sand uppercase">Nuzul</b><Link className={linkCls} to="/how-matching-works">{t("nav.howMatching")}</Link><Link className={linkCls} to="/wishlists">{t("nav.wishlists")}</Link><Link className={linkCls} to="/trips">{t("nav.trips")}</Link><Link className={linkCls} to="/messages/c-2">Help</Link></div>
        <div className="flex flex-col items-start gap-3"><b className="mb-1.5 text-[11px] tracking-widest text-sand uppercase">Partners</b><Link className={linkCls} to="/host/listings/new">{t("nav.listHotel")}</Link><Link className={linkCls} to="/host">{t("nav.hostDashboard")}</Link><Link className={linkCls} to="/admin">{t("nav.adminConsole")}</Link></div>
      </div>
      <div className="mt-12 flex justify-between gap-4 border-t border-white/12 pt-5 text-[10px] text-[#7e8996] max-md:flex-col">
        <span>© 2026 Nuzul. {t("brand.sample")}</span>
        <div className="flex gap-5"><Link className={linkCls} to="/system">{t("nav.designSystem")}</Link><button type="button" className={linkCls} onClick={() => setLocale(locale === "en" ? "ar" : "en")}>English / العربية</button><button type="button" className={linkCls} onClick={() => setCurrency(currency === "EGP" ? "USD" : "EGP")}>{currency}</button></div>
      </div>
    </footer>
  );
}
