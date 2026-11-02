import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/common";
import { MatchingExplainer } from "./matching-explainer";

export default function HowMatchingPage() {
  const { t } = useTranslation();
  return (
    <div className="container-page py-12">
      <PageHeader eyebrow="Nuzul Match" title={t("system.tabs.matching")} lead={t("match.weightNote", { boost: 1.5 })} />
      <MatchingExplainer />
    </div>
  );
}
