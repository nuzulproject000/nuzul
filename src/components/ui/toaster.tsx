import { Toaster as Sonner } from "sonner";
import { usePreferences } from "@/stores/preferences.store";

/** Sonner, themed (§35 in-app notifications, success/error feedback). */
export function Toaster() {
  const locale = usePreferences((s) => s.locale);
  return (
    <Sonner
      position={locale === "ar" ? "top-left" : "top-right"}
      dir={locale === "ar" ? "rtl" : "ltr"}
      toastOptions={{
        classNames: {
          toast: "!rounded-none !border-0 !shadow-lift !font-sans !text-[13px]",
          success: "!bg-success !text-white",
          error: "!bg-error !text-white",
          info: "!bg-navy !text-white",
        },
      }}
    />
  );
}
