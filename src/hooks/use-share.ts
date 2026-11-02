import { useCallback } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

/** Native share sheet when available, otherwise copy the link. */
export function useShare() {
  const { t } = useTranslation();
  return useCallback(async (title: string, path: string) => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url);
      toast.success(t("common.copied"));
    } catch { /* user dismissed the share sheet */ }
  }, [t]);
}
