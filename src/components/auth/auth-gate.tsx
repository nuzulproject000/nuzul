/* Guest-only actions for visitors: instead of failing, explain and offer sign-in, then return the user
 * to where they were (the `next` URL). Non-guest accounts are asked to switch to a guest account. */
import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSession } from "@/stores/session.store";
import { useUi, type AuthReason } from "@/stores/ui.store";

/** Runs `action` for an active guest; otherwise opens the sign-in prompt. */
export function useAuthGate() {
  const { t } = useTranslation();
  const user = useSession((s) => s.user);
  const open = useUi((s) => s.openAuthPrompt);
  const loc = useLocation();
  return useCallback((reason: AuthReason, action: () => void, next?: string) => {
    if (user?.role === "GUEST") {
      if (user.status === "SUSPENDED" && reason !== "account") { toast.error(t("access.suspendedAction")); return; }
      action();
      return;
    }
    open({ reason, next: next ?? loc.pathname + loc.search });
  }, [user, open, loc.pathname, loc.search, t]);
}

export function AuthPromptDialog() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const prompt = useUi((s) => s.authPrompt);
  const close = () => useUi.getState().openAuthPrompt(null);
  const { user, signOut } = useSession();
  const q = prompt ? `?next=${encodeURIComponent(prompt.next)}&reason=${prompt.reason}` : "";
  return (
    <Dialog open={!!prompt} onOpenChange={(o) => !o && close()}>
      {prompt && (user ? (
        <DialogContent title={t("gate.wrongRoleTitle")} description={t("gate.wrongRoleText", { role: t(`auth.role.${user.role}`), action: t(`gate.reason.${prompt.reason}`) })}>
          <DialogFooter>
            <Button variant="outline" onClick={close}>{t("common.cancel")}</Button>
            <Button onClick={() => { close(); signOut(); navigate(`/auth/sign-in${q}`); }}>{t("access.switch")}</Button>
          </DialogFooter>
        </DialogContent>
      ) : (
        <DialogContent title={t("gate.title", { action: t(`gate.reason.${prompt.reason}`) })} description={t("gate.text")}>
          <ul className="mb-2 flex flex-col gap-1.5 text-[13px] text-charcoal">{(["b1", "b2", "b3"] as const).map((k) => <li key={k}>· {t(`gate.${k}`)}</li>)}</ul>
          <DialogFooter className="justify-between max-sm:justify-stretch">
            <Button variant="text" onClick={close}>{t("gate.browse")}</Button>
            <span className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => { close(); navigate(`/auth/sign-up${q}`); }}><UserPlus /> {t("auth.createAccount")}</Button>
              <Button variant="gold" onClick={() => { close(); navigate(`/auth/sign-in${q}`); }}><LogIn /> {t("auth.signIn")}</Button>
            </span>
          </DialogFooter>
        </DialogContent>
      ))}
    </Dialog>
  );
}
