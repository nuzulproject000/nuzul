import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import { useSession } from "@/stores/session.store";

/** Shown to a signed-in account that an admin has suspended: read-only access (§51–52). */
export function SuspendedBanner() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  if (user?.status !== "SUSPENDED") return null;
  return (
    <div role="alert" className="flex items-start justify-center gap-2 bg-error-bg px-4 py-2.5 text-center text-[12px] text-error">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" /> <span><b>{t("access.suspendedTitle")}</b> {user.statusReason ? `· ${user.statusReason}. ` : ""}{t("access.suspendedText")}</span>
    </div>
  );
}

/** Thin strip that makes the demo nature of the session explicit. */
export function DemoStrip() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  if (!user) return null;
  return <p className="m-0 bg-navy py-1 text-center text-[10px] tracking-wide text-sand">{t("auth.demoStrip", { name: user.name, role: t(`auth.role.${user.role}`) })}</p>;
}
