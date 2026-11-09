import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Header, HERO_ROUTES } from "./header";
import { Footer } from "./footer";
import { MobileNav } from "./mobile-nav";
import { WhyMatchDialog } from "@/components/match";
import { AuthPromptDialog } from "@/components/auth/auth-gate";
import { DemoStrip, SuspendedBanner } from "./account-banner";

const NO_FOOTER = ["/search", "/messages"];

export function GuestLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const footer = !NO_FOOTER.some((p) => pathname.startsWith(p));
  const hero = HERO_ROUTES.includes(pathname);
  return (
    <div className="min-h-screen overflow-x-clip max-md:pb-[calc(56px+env(safe-area-inset-bottom))]">
      <a href="#main" className="fixed start-2 top-2 z-[400] -translate-y-[300%] bg-navy px-3.5 py-2.5 text-xs text-white focus:translate-y-0">{t("nav.skip")}</a>
      <DemoStrip />
      {hero && <SuspendedBanner />}
      <Header />
      {!hero && <SuspendedBanner />}
      <main id="main" className="min-h-[100svh]"><Outlet /></main>
      {footer && <Footer />}
      <MobileNav />
      <WhyMatchDialog />
      <AuthPromptDialog />
    </div>
  );
}

/** Minimal chrome for checkout and auth. */
export function FocusLayout() {
  return (
    <div className="min-h-screen">
      <SuspendedBanner />
      <main id="main" className="min-h-[100svh]"><Outlet /></main>
      <WhyMatchDialog />
      <AuthPromptDialog />
    </div>
  );
}
