import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header } from "./header";
import { Footer } from "./footer";
import { MobileNav } from "./mobile-nav";
import { WhyMatchDialog } from "@/components/match";

const NO_FOOTER = ["/search", "/messages"];

export function GuestLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const footer = !NO_FOOTER.some((p) => pathname.startsWith(p));
  return (
    <div className="min-h-screen overflow-x-clip max-md:pb-[66px]">
      <a href="#main" className="fixed start-2 -top-16 z-[400] bg-navy px-3.5 py-2.5 text-xs text-white focus:top-2">{t("nav.skip")}</a>
      <Header />
      <main id="main"><Outlet /></main>
      {footer && <Footer />}
      <MobileNav />
      <WhyMatchDialog />
    </div>
  );
}

/** Minimal chrome for checkout and auth. */
export function FocusLayout() {
  return (
    <div className="min-h-screen">
      <main id="main"><Outlet /></main>
      <WhyMatchDialog />
    </div>
  );
}
