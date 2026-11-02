/* Authentication & role routing (§60). Mock auth service — no real accounts or credentials are stored. */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Clock3, Mail, Settings, ShieldCheck, TriangleAlert, User as UserIcon } from "lucide-react";
import type { Role } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CheckRow } from "@/components/ui/controls";
import { Logo, SegButtons } from "@/components/common";
import { authService } from "@/services/account.service";
import { useSession } from "@/stores/session.store";
import { applyFieldErrors, errorMessage } from "@/lib/forms";
import { cn } from "@/lib/utils";

const MODES = ["sign-in", "sign-up", "forgot", "verify", "expired"] as const;
type Mode = (typeof MODES)[number] | "sent";
const HOME: Record<Role, string> = { GUEST: "/", HOST: "/host", ADMIN: "/admin" };
const HERO = "https://images.unsplash.com/photo-1694968433606-df475600d7b6?auto=format&fit=crop&w=1400&q=85";

const strengthOf = (pw: string) => [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;

export default function AuthPage() {
  const { t } = useTranslation();
  const mode = (useParams().mode ?? "sign-in") as Mode;
  const navigate = useNavigate();
  const go = (m: Mode) => navigate(`/auth/${m}${window.location.search}`, { replace: true });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("GUEST");

  return (
    <div className="grid min-h-screen grid-cols-2 max-md:block">
      <section className="flex flex-col items-start justify-between bg-cover bg-center p-11 text-white max-md:min-h-[230px] max-md:p-5" style={{ backgroundImage: `linear-gradient(rgb(15 28 46 / .3), rgb(15 28 46 / .8)), url(${HERO})` }}>
        <Link to="/" aria-label="Nuzul home"><Logo light /></Link>
        <div className="max-md:mt-8">
          <span className="eyebrow eyebrow-light">{t("auth.eyebrow")}</span>
          <h1 className="text-white max-md:text-[32px]">{t("auth.title1")}<br />{t("auth.title2")}</h1>
          <p className="text-[#d7dce2]">{t("auth.lead")}</p>
        </div>
        <small className="text-[#d7dce2] max-md:hidden">{t("auth.note")}</small>
      </section>

      <div className="mx-auto flex w-full max-w-[480px] flex-col self-center px-12 py-12 max-md:px-5 max-md:py-7">
        {mode !== "sent" && (
          <div className="mb-7 self-start">
            <SegButtons<Mode> ariaLabel="Auth" value={mode} onChange={go} options={MODES.map((m) => ({ value: m, label: t(`auth.${{ "sign-in": "signIn", "sign-up": "signUp", forgot: "reset", verify: "verify", expired: "session" }[m]}`) }))} />
          </div>
        )}
        {(mode === "sign-in" || mode === "sign-up") && <Credentials key={mode} mode={mode} role={role} setRole={setRole} onEmail={setEmail} go={go} />}
        {mode === "forgot" && <Forgot onSent={(e) => { setEmail(e); go("sent"); }} go={go} />}
        {mode === "sent" && (
          <State icon={<Mail />} title={t("auth.sentTitle")} text={t("auth.sentText", { email: email || "you@example.com" })}>
            <Button variant="outline" className="w-full" onClick={() => go("sign-in")}>{t("auth.backToSignIn")}</Button>
          </State>
        )}
        {mode === "verify" && <Verify email={email} role={role} />}
        {mode === "expired" && (
          <State icon={<Clock3 />} title={t("auth.expiredTitle")} text={t("auth.expiredText")}>
            <Button variant="gold" className="w-full" onClick={() => go("sign-in")}>{t("auth.again")}</Button>
          </State>
        )}
      </div>
    </div>
  );
}

function State({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2.5 [&>svg]:size-9 [&>svg]:text-gold">
      {icon}
      <h1 className="mt-1.5 mb-0 text-[35px]">{title}</h1>
      <p className="text-[13px] text-ink-muted">{text}</p>
      {children}
    </div>
  );
}

function Credentials({ mode, role, setRole, onEmail, go }: { mode: "sign-in" | "sign-up"; role: Role; setRole: (r: Role) => void; onEmail: (e: string) => void; go: (m: Mode) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const signIn = useSession((s) => s.signIn);
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState(true);
  const signUp = mode === "sign-up";
  const schema = yup.object({
    name: signUp ? yup.string().trim().required("auth.v.name") : yup.string().default(""),
    email: yup.string().trim().required("auth.v.email").matches(/^\S+@\S+\.\S+$/, "auth.v.email"),
    password: yup.string().required("auth.v.password").min(8, "auth.v.password"),
  });
  type V = yup.InferType<typeof schema>;
  const { register, handleSubmit, watch, setError, formState: { errors } } = useForm<V>({ resolver: yupResolver(schema), defaultValues: { name: "", email: "", password: "" } });
  const pw = watch("password") ?? "";
  const strength = strengthOf(pw);

  const m = useMutation({
    mutationFn: (v: V): Promise<unknown> => (signUp ? authService.register({ name: v.name ?? "", email: v.email, password: v.password, role }) : authService.login({ email: v.email, password: v.password, role })),
    onSuccess: (res, v) => {
      if (signUp) { onEmail(v.email); go("verify"); return; }
      const s = res as Awaited<ReturnType<typeof authService.login>>;
      signIn({ ...s.user, role }, s.token);
      toast.success(t("auth.signedIn", { role: t(`auth.role.${role}`) }));
      navigate(params.get("next") ?? HOME[role], { replace: true });
    },
    onError: (e) => { if (!applyFieldErrors(e, setError)) setError("root", { message: errorMessage(e, t("errors.generic")) }); },
  });
  const err = (k: keyof V) => (errors[k]?.message ? t(errors[k]!.message as string, { defaultValue: errors[k]!.message as string }) : undefined);
  const roles: [Role, typeof UserIcon][] = [["GUEST", UserIcon], ["HOST", Building2], ["ADMIN", Settings]];

  return (
    <form noValidate onSubmit={handleSubmit((v) => m.mutate(v))} className="flex flex-col">
      <span className="eyebrow">{signUp ? t("auth.create") : t("auth.welcome")}</span>
      <h1 className="mb-5 text-[35px]">{signUp ? t("auth.joinTitle") : t("auth.signInTitle")}</h1>
      <div role="radiogroup" aria-label={t("auth.accountType")} className="mb-1 grid grid-cols-3 gap-2">
        {roles.map(([r, I]) => (
          <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)} className={cn("flex flex-col items-start gap-1 border bg-paper p-3 text-start text-navy", role === r ? "border-gold shadow-[inset_0_0_0_1px_var(--gold)]" : "border-line")}>
            <I className="size-[18px]" /><b className="text-[12px]">{t(`auth.role.${r}`)}</b><small className="text-[10px] text-ink-muted">{t(`auth.roleSub.${r}`)}</small>
          </button>
        ))}
      </div>
      {signUp && <Field className="mt-4" label={t("auth.name")} htmlFor="a-name" error={err("name")}><Input id="a-name" autoComplete="name" placeholder="Nadia Amin" aria-invalid={!!errors.name} {...register("name")} /></Field>}
      <Field className="mt-4" label={t("auth.email")} htmlFor="a-email" error={err("email")}><Input id="a-email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register("email")} /></Field>
      <Field className="mt-4" label={t("auth.password")} htmlFor="a-pw" error={err("password")}>
        <div className="relative">
          <Input id="a-pw" type={show ? "text" : "password"} autoComplete={signUp ? "new-password" : "current-password"} placeholder={t("auth.pwPh")} aria-invalid={!!errors.password} className="pe-16" {...register("password")} />
          <button type="button" onClick={() => setShow(!show)} className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gold">{show ? t("auth.hide") : t("auth.show")}</button>
        </div>
      </Field>
      {signUp && (
        <div className="mt-2 flex items-center gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength} aria-label={t("auth.password")}>
          {[0, 1, 2, 3].map((i) => <i key={i} className={cn("h-1 flex-1", i < strength ? "bg-success" : "bg-line")} />)}
          <small className="ms-1.5 w-16 text-[10px] text-ink-muted">{(t("auth.strength", { returnObjects: true }) as string[])[strength]}</small>
        </div>
      )}
      {errors.root && <p role="alert" className="mt-4 flex items-center gap-2 bg-error-bg px-3 py-2.5 text-[12px] font-semibold text-error"><TriangleAlert className="size-4" /> {errors.root.message}</p>}
      {!signUp && (
        <div className="my-4 flex items-center justify-between">
          <CheckRow id="a-keep" label={<span className="text-[11px]">{t("auth.keep")}</span>} checked={keep} onCheckedChange={setKeep} />
          <button type="button" onClick={() => go("forgot")} className="text-[11px] font-bold text-gold">{t("auth.forgot")}</button>
        </div>
      )}
      <Button type="submit" variant="gold" size="lg" className={cn("w-full", signUp && "mt-6")} disabled={m.isPending}>{m.isPending ? t("common.loading") : signUp ? t("auth.createAccount") : t("auth.signInAs", { role: t(`auth.role.${role}`) })}</Button>
      <div className="my-6 border-t border-line text-center"><span className="relative -top-2.5 bg-ivory px-2.5 text-[10px] text-ink-muted">{t("common.or")}</span></div>
      <Button type="button" variant="outline" className="w-full" onClick={() => toast.info(t("auth.oauthNote"))}>{t("auth.google")} <small className="ms-2 bg-soft px-1.5 py-1 text-[9px]">{t("auth.oauth")}</small></Button>
      <p className="mt-5 text-center text-[11px]">{signUp ? t("auth.have") : t("auth.newTo")} <button type="button" onClick={() => go(signUp ? "sign-in" : "sign-up")} className="font-bold text-gold">{signUp ? t("auth.signIn") : t("auth.createAccount")}</button></p>
    </form>
  );
}

function Forgot({ onSent, go }: { onSent: (email: string) => void; go: (m: Mode) => void }) {
  const { t } = useTranslation();
  const schema = yup.object({ email: yup.string().trim().required("auth.v.email").matches(/^\S+@\S+\.\S+$/, "auth.v.email") });
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });
  const m = useMutation({ mutationFn: (email: string) => authService.forgotPassword(email), onSuccess: (_r, email) => onSent(email) });
  return (
    <form noValidate onSubmit={handleSubmit((v) => m.mutate(v.email))} className="flex flex-col">
      <span className="eyebrow">{t("auth.reset")}</span>
      <h1 className="mb-3 text-[35px]">{t("auth.forgotTitle")}</h1>
      <p className="text-[13px] text-ink-muted">{t("auth.forgotText")}</p>
      <Field className="mt-2" label={t("auth.email")} htmlFor="f-email" error={errors.email && t(errors.email.message as string)}><Input id="f-email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register("email")} /></Field>
      <Button type="submit" variant="gold" size="lg" className="mt-6 w-full" disabled={m.isPending}>{t("auth.sendLink")}</Button>
      <Button type="button" variant="text" className="mt-2" onClick={() => go("sign-in")}>{t("auth.backToSignIn")}</Button>
    </form>
  );
}

function Verify({ email, role }: { email: string; role: Role }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>();
  const [wait, setWait] = useState(42);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { if (wait <= 0) return; const id = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(id); }, [wait]);
  const m = useMutation({
    mutationFn: () => authService.verifyEmail(digits.join("")),
    onSuccess: () => { toast.success(t("auth.verified")); navigate(role === "HOST" ? "/host/listings/new" : "/", { replace: true }); },
    onError: (e) => setError(errorMessage(e, t("auth.v.code"))),
  });
  const setAt = (i: number, v: string) => {
    const chars = v.replace(/\D/g, "").split("");
    if (chars.length > 1) { const next = [...digits]; chars.slice(0, 6 - i).forEach((c, k) => (next[i + k] = c)); setDigits(next); refs.current[Math.min(5, i + chars.length)]?.focus(); return; }
    const next = [...digits]; next[i] = chars[0] ?? ""; setDigits(next); setError(undefined);
    if (chars[0] && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <State icon={<ShieldCheck />} title={t("auth.verifyTitle")} text={t("auth.verifyText", { email: email || "you@example.com" })}>
      <form noValidate className="w-full" onSubmit={(e) => { e.preventDefault(); if (digits.join("").length !== 6) setError(t("auth.v.code")); else m.mutate(); }}>
        <div className="my-2 flex gap-2" dir="ltr">
          {digits.map((d, i) => (
            <input key={i} ref={(el) => { refs.current[i] = el; }} value={d} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={t("auth.digit", { n: i + 1 })} aria-invalid={!!error}
              onChange={(e) => setAt(i, e.target.value)} onKeyDown={(e) => e.key === "Backspace" && !d && i > 0 && refs.current[i - 1]?.focus()}
              className="h-14 w-12 border border-line bg-paper text-center text-xl text-navy aria-[invalid=true]:border-error" />
          ))}
        </div>
        {error && <p role="alert" className="text-[12px] font-semibold text-error">{error}</p>}
        <p className="text-[11px] text-ink-muted">{t("auth.codeHint")}</p>
        <Button type="submit" variant="gold" size="lg" className="mt-3 w-full" disabled={m.isPending}>{t("auth.verifyCta")}</Button>
        <Button type="button" variant="text" className="mt-2" disabled={wait > 0} onClick={() => { setWait(42); toast.success(t("auth.resent")); }}>{t("auth.resend")}{wait > 0 ? ` · 0:${String(wait).padStart(2, "0")}` : ""}</Button>
      </form>
    </State>
  );
}
