import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/account.service";
import { useSession } from "@/stores/session.store";

/** Restores the shared demo dataset (all roles) to its seed. Frontend demo utility. */
export function DemoResetButton({ className }: { className?: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    setBusy(true);
    try { await authService.resetDemoData(); useSession.getState().signOut(); qc.removeQueries(); toast.success(t("demo.resetDone")); setOpen(false); window.location.assign("/"); }
    catch { toast.error(t("errors.generic")); } finally { setBusy(false); }
  };
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{t("demo.reset")}</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("demo.resetTitle")} description={t("demo.resetText")}>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button><Button variant="destructive" disabled={busy} onClick={() => void reset()}>{t("demo.reset")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
