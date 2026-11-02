/* Role-aware route protection (§60). FRONTEND DEMO ONLY: real authorisation must be enforced by the API
 * (the mock API does enforce it — a guarded page also gets 401/403 from every endpoint it calls). */
import type { ReactNode } from "react";
import { Link, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldAlert } from "lucide-react";
import type { Role } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common";
import { roleHome, useSession } from "@/stores/session.store";

export const signInPath = (next: string, reason?: string) => `/auth/sign-in?next=${encodeURIComponent(next)}${reason ? `&reason=${reason}` : ""}`;

export function RequireRole({ roles, children }: { roles?: Role[]; children?: ReactNode }) {
  const user = useSession((s) => s.user);
  const loc = useLocation();
  if (!user) return <Navigate to={signInPath(loc.pathname + loc.search)} replace />;
  if (roles && !roles.includes(user.role)) return <AccessDenied roles={roles} />;
  return <>{children ?? <Outlet />}</>;
}

/** Shown when a signed-in account opens an area that belongs to another role. */
export function AccessDenied({ roles }: { roles: Role[] }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loc = useLocation();
  const { user, signOut } = useSession();
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center bg-ivory px-5 py-16 text-center">
      <Link to="/" aria-label="Nuzul home" className="mb-10"><Logo /></Link>
      <span className="grid size-16 place-items-center rounded-full bg-warn-bg text-warn"><ShieldAlert className="size-7" /></span>
      <span className="eyebrow mt-6">403</span>
      <h1 className="max-w-xl text-[40px] max-md:text-[30px]">{t("access.title")}</h1>
      <p className="max-w-md text-ink-muted">{t("access.text", { area: roles.map((r) => t(`auth.role.${r}`)).join(" / "), name: user?.name, role: t(`auth.role.${user?.role ?? "GUEST"}`) })}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
        <Button onClick={() => navigate(roleHome(user?.role))}>{t("access.home")}</Button>
        <Button variant="outline" onClick={() => { signOut(); navigate(signInPath(loc.pathname)); }}>{t("access.switch")}</Button>
      </div>
      <p className="mt-6 max-w-md text-[11px] text-ink-muted">{t("auth.mockNote")}</p>
    </main>
  );
}
