/* Host account settings: business details (shown on every listing), notifications, security, sign-out. */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { toast } from "sonner";
import { Bell, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Panel } from "@/components/dashboard";
import { useMe, useUpdateMe } from "@/hooks/queries";
import { useSession } from "@/stores/session.store";
import { applyFieldErrors } from "@/lib/forms";

export default function HostSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: me } = useMe();
  const update = useUpdateMe();
  const signOut = useSession((s) => s.signOut);
  const [closeOpen, setCloseOpen] = useState(false);
  const schema = yup.object({ name: yup.string().trim().required("auth.v.name"), email: yup.string().trim().required("auth.v.email").matches(/^\S+@\S+\.\S+$/, "auth.v.email"), phone: yup.string().trim().required("booking.v.phone").test("p", "booking.v.phone", (v) => (v ?? "").replace(/\D/g, "").length >= 8), city: yup.string().trim().default("") });
  type V = yup.InferType<typeof schema>;
  const { register, handleSubmit, reset, setError, formState: { errors, isDirty } } = useForm<V>({ resolver: yupResolver(schema) });
  useEffect(() => { if (me) reset({ name: me.name, email: me.email, phone: me.phone, city: me.city }); }, [me, reset]);
  const fe = (k: keyof V) => (errors[k]?.message ? t(errors[k]!.message as string, { defaultValue: errors[k]!.message as string }) : undefined);
  if (!me) return <div className="skeleton h-96" />;
  return (
    <>
      <div className="grid grid-cols-[1.4fr_1fr] gap-4 max-lg:grid-cols-1">
        <Panel title={t("host.settings.business")} sub={t("host.settings.businessSub")}>
          <form noValidate onSubmit={handleSubmit((v) => update.mutate(v, { onSuccess: (u) => { toast.success(t("host.saved")); reset({ name: u.name, email: u.email, phone: u.phone, city: u.city }); }, onError: (e) => applyFieldErrors(e, setError) }))} className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Field label={t("auth.businessName")} htmlFor="hs-name" error={fe("name")}><Input id="hs-name" aria-invalid={!!errors.name} {...register("name")} /></Field>
            <Field label={t("profile.email")} htmlFor="hs-email" error={fe("email")}><Input id="hs-email" type="email" aria-invalid={!!errors.email} {...register("email")} /></Field>
            <Field label={t("profile.phone")} htmlFor="hs-phone" error={fe("phone")}><Input id="hs-phone" type="tel" aria-invalid={!!errors.phone} {...register("phone")} /></Field>
            <Field label={t("profile.location")} htmlFor="hs-city"><Input id="hs-city" {...register("city")} /></Field>
            <div className="col-span-2 flex gap-2 max-sm:col-span-1"><Button type="submit" variant="gold" disabled={!isDirty || update.isPending}>{t("common.saveChanges")}</Button><Button type="button" variant="outline" disabled={!isDirty} onClick={() => reset()}>{t("common.reset")}</Button></div>
          </form>
        </Panel>
        <Panel title={t("host.settings.account")}>
          <dl className="m-0 grid grid-cols-[120px_1fr] gap-y-2 text-[13px]">
            <dt className="text-ink-muted">{t("common.status")}</dt><dd className="m-0"><Badge tone={me.status === "ACTIVE" ? "success" : "danger"}>{t(`admin.status.${me.status}`)}</Badge></dd>
            <dt className="text-ink-muted">{t("admin.col.verification")}</dt><dd className="m-0"><Badge tone={me.verification === "VERIFIED" ? "success" : "warn"}>{t(`admin.status.${me.verification}`)}</Badge></dd>
            <dt className="text-ink-muted">{t("admin.col.joined")}</dt><dd className="m-0 text-navy">{me.joinedAt}</dd>
          </dl>
          {me.statusReason && <p className="mt-3 bg-error-bg p-3 text-[12px] text-error">{me.statusReason}</p>}
        </Panel>
      </div>
      <Panel title={t("host.settings.more")}>
        <ul className="flex flex-col">
          <li className="flex items-center gap-3 border-b border-line py-3"><Bell className="size-5 text-gold" /><span className="flex-1 text-[13px] text-navy">{t("profile.notificationsText")}</span><Button size="sm" variant="outline" asChild><Link to="/host/notifications">{t("profile.openNotifications")}</Link></Button></li>
          <li className="flex items-center gap-3 border-b border-line py-3"><KeyRound className="size-5 text-gold" /><span className="flex-1 text-[13px] text-navy">{t("profile.privacy.password")}</span><Button size="sm" variant="outline" onClick={() => { signOut(); navigate("/auth/forgot"); }}>{t("profile.privacy.change")}</Button></li>
          <li className="flex items-center gap-3 border-b border-line py-3"><ShieldCheck className="size-5 text-gold" /><span className="flex-1 text-[13px] text-navy">{t("host.settings.close")}</span><Button size="sm" variant="destructive" onClick={() => setCloseOpen(true)}>{t("host.settings.closeCta")}</Button></li>
          <li className="flex items-center gap-3 py-3"><LogOut className="size-5 text-gold" /><span className="flex-1 text-[13px] text-navy">{t("nav.signOut")}</span><Button size="sm" onClick={() => { signOut(); navigate("/", { replace: true }); }}>{t("nav.signOut")}</Button></li>
        </ul>
      </Panel>
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent title={t("host.settings.closeTitle")} description={t("host.settings.closeText")}>
          <DialogFooter><Button variant="outline" onClick={() => setCloseOpen(false)}>{t("common.cancel")}</Button><Button variant="destructive" onClick={() => { setCloseOpen(false); toast.success(t("profile.privacy.requested")); }}>{t("host.settings.closeCta")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
