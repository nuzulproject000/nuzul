import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <section className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="grid size-16 place-items-center rounded-full bg-soft text-gold"><Compass className="size-7" /></span>
      <span className="eyebrow mt-6">404</span>
      <h1 className="text-5xl">{t("errors.notFound")}</h1>
      <p className="text-ink-muted">{t("errors.notFoundText")}</p>
      <Button asChild className="mt-4"><Link to="/">{t("errors.goHome")}</Link></Button>
    </section>
  );
}
