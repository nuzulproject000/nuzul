/* Authentication workflow (§60). Sign in, sign up, verify email, forgot → reset password and session
 * expiry are STATES of one flow (not navigation tabs). MOCK AUTHENTICATION — demo accounts only. */
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Building2, CheckCircle2, Clock3, KeyRound, Loader2, Mail, Settings, ShieldCheck, TriangleAlert, User as UserIcon } from "lucide-react";
import type { Role } from "@/types/models";
import type { Session } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { CheckRow } from "@/components/ui/controls";
import { Logo } from "@/components/common";
import { authService } from "@/services/account.service";
import { roleHome, useSession } from "@/stores/session.store";
import { applyFieldErrors, errorMessage } from "@/lib/forms";
import { cn } from "@/lib/utils";

type Mode = "sign-in" | "sign-up" | "verify" | "forgot" | "sent" | "reset" | "reset-done" | "expired";
const MODES: Mode[] = ["sign-in", "sign-up", "verify", "forgot", "sent", "reset", "reset-done", "expired"];
const HERO = "/images/city.webp";
const GUEST_ONLY = ["/account", "/trips", "/wishlists", "/messages", "/profile", "/book", "/booking"];

/** Where to go after signing in: the requested page if this role may open it, otherwise the role's home. */
export function safeNext(next: string | null, role: Role) {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/auth")) return roleHome(role);
  if (next.startsWith("/host") && role !== "HOST") return roleHome(role);
  if (next.startsWith("/admin") && role !== "ADMIN") return roleHome(role);
  if (GUEST_ONLY.some((p) => next.startsWith(p)) && role !== "GUEST") return roleHome(role);
  return next;
}
const strengthOf = (pw: string) => [pw.length >= 8, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
const emailRule = yup.string().trim().required("auth.v.email").matches(/^\S+@\S+\.\S+$/, "auth.v.email");

export default function AuthPage() {
  const { t } = useTranslation();
  const param = useParams().mode as Mode;
  const mode: Mode = MODES.includes(param) ? param : "sign-in";
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useSession((s) => s.user);
  /** Moves between states, keeping `next` / `reason` so the user lands where they started. */
  const go = (m: Mode, extra: Record<string, string> = {}) => {
    const q = new URLSearchParams();
    ["next", "reason", "role"].forEach((k) => params.get(k) && q.set(k, params.get(k)!));
    Object.entries(extra).forEach(([k, v]) => q.set(k, v));
    navigate(`/auth/${m}${q.toString() ? `?${q}` : ""}`);
  };
  const reason = params.get("reason");

  return (
    <div className="grid min-h-screen grid-cols-2 max-md:block">
      <section className="flex flex-col items-start justify-between bg-cover bg-center p-11 text-white max-md:min-h-[200px] max-md:p-5" style={{ backgroundImage: `linear-gradient(rgb(15 28 46 / .3), rgb(15 28 46 / .8)), url(${HERO})` }}>
        <Link to="/" aria-label="Nuzul home"><Logo light /></Link>
        <div className="max-md:mt-6">
          <span className="eyebrow eyebrow-light">{t("auth.eyebrow")}</span>
          <h1 className="text-white max-md:text-[30px]">{t("auth.title1")}<br />{t("auth.title2")}</h1>
          <p className="text-[#d7dce2] max-md:hidden">{t("auth.lead")}</p>
        </div>
        <small className="text-[#d7dce2] max-md:hidden">{t("auth.mockNote")}</small>
      </section>

      <div className="mx-auto flex w-full max-w-[480px] flex-col self-center px-12 py-12 max-md:px-5 max-md:py-7">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 self-start text-[12px] font-bold text-navy hover:text-gold"><ArrowLeft className="size-3.5 rtl:rotate-180" /> {t("auth.browse")}</Link>
        {user && ["sign-in", "sign-up"].includes(mode) && (
          <p className="mb-5 flex items-center justify-between gap-2 bg-soft p-3 text-[12px] text-navy">{t("auth.alreadyIn", { name: user.name })}<Button size="xs" onClick={() => navigate(roleHome(user.role))}>{t("access.home")}</Button></p>
        )}
        {reason && ["sign-in", "sign-up"].includes(mode) && <p className="mb-5 border-s-2 border-gold bg-[#fbf6ec] px-3 py-2.5 text-[12px] text-navy">{t("auth.reasonBanner", { action: t(`gate.reason.${reason}`, { defaultValue: reason }) })}</p>}
        {mode === "sign-in" && <SignIn go={go} />}
        {mode === "sign-up" && <SignUp go={go} />}
        {mode === "verify" && <Verify email={params.get("email") ?? ""} />}
        {mode === "forgot" && <Forgot go={go} />}
        {mode === "sent" && (
          <State icon={<Mail />} title={t("auth.sentTitle")} text={t("auth.sentText", { email: params.get("email") ?? "" })}>
            <p className="w-full border border-dashed border-gold bg-[#fbf6ec] p-3 text-[12px] text-navy">{t("auth.demoLinkNote")}</p>
            <Button variant="gold" className="w-full" onClick={() => go("reset", { token: params.get("token") ?? "" })}><KeyRound /> {t("auth.openResetLink")}</Button>
            <Button variant="text" onClick={() => go("sign-in")}>{t("auth.backToSignIn")}</Button>
          </State>
        )}
        {mode === "reset" && <Reset token={params.get("token") ?? ""} go={go} />}
        {mode === "reset-done" && (
          <State icon={<CheckCircle2 />} title={t("auth.resetDoneTitle")} text={t("auth.resetDoneText")}>
            <Button variant="gold" className="w-full" onClick={() => go("sign-in")}>{t("auth.signIn")}</Button>
          </State>
        )}
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
    <div className="flex flex-col items-start gap-3 [&>svg]:size-9 [&>svg]:text-gold">
      {icon}
      <h1 className="mt-1 mb-0 text-[34px]">{title}</h1>
      <p className="text-[13px] text-ink-muted">{text}</p>
      {children}
    </div>
  );
}

/** Completes sign-in for any flow and routes by role. */
function useFinishSignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const signIn = useSession((s) => s.signIn);
  return (s: Session, keep = false) => {
    signIn(s, keep);
    toast.success(t("auth.signedIn", { name: s.user.name, role: t(`auth.role.${s.user.role}`) }));
    navigate(safeNext(params.get("next"), s.user.role), { replace: true });
  };
}

function SignIn({ go }: { go: (m: Mode, extra?: Record<string, string>) => void }) {
  const { t } = useTranslation();
  const finish = useFinishSignIn();
  const [show, setShow] = useState(false);
  const [keep, setKeep] = useState(false);
  const schema = yup.object({ email: emailRule, password: yup.string().required("auth.v.password").min(8, "auth.v.password") });
  type V = yup.InferType<typeof schema>;
  const { register, handleSubmit, setValue, setError, formState: { errors } } = useForm<V>({ resolver: yupResolver(schema), defaultValues: { email: "", password: "" } });
  const { data: demos } = useQuery({ queryKey: ["auth", "demo-accounts"], queryFn: authService.demoAccounts });
  const m = useMutation({
    mutationFn: authService.login,
    onSuccess: (s) => finish(s, keep),
    onError: (e) => { if (!applyFieldErrors(e, setError)) setError("root", { message: errorMessage(e, t("errors.generic")) }); },
  });
  const err = (k: keyof V) => (errors[k]?.message ? t(errors[k]!.message as string) : undefined);
  const ICON: Record<Role, typeof UserIcon> = { GUEST: UserIcon, HOST: Building2, ADMIN: Settings };
  const demo = (email: string) => { setValue("email", email); setValue("password", "demo-pass-2026"); m.mutate({ email, password: "demo-pass-2026" }); };

  return (
    <div className="flex flex-col">
      <span className="eyebrow">{t("auth.welcome")}</span>
      <h1 className="mb-5 text-[34px]">{t("auth.signInTitle")}</h1>

      <section aria-labelledby="demo-h" className="mb-6 border border-line bg-paper p-4">
        <h2 id="demo-h" className="mb-1 text-[13px]">{t("auth.demoTitle")}</h2>
        <p className="mb-3 text-[11px] text-ink-muted">{t("auth.demoText")}</p>
        <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
          {(demos ?? []).map((d) => { const I = ICON[d.role]; return (
            <button key={d.id} type="button" disabled={m.isPending} onClick={() => demo(d.email)} className="flex flex-col items-start gap-1 border border-line bg-ivory p-3 text-start text-navy hover:opacity-80 disabled:opacity-60" aria-label={t("auth.continueAs", { role: t(`auth.role.${d.role}`), name: d.name })}>
              <I className="size-[18px] text-gold" /><b className="text-[12px]">{t("auth.continueAsShort", { role: t(`auth.role.${d.role}`) })}</b><small className="truncate text-[10px] text-ink-muted">{d.name}</small>
            </button>
          ); })}
          {!demos && [0, 1, 2].map((i) => <div key={i} className="skeleton h-20" />)}
        </div>
      </section>

      <form noValidate onSubmit={handleSubmit((v) => m.mutate(v))} className="flex flex-col">
        <Field label={t("auth.email")} htmlFor="a-email" error={err("email")}><Input id="a-email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register("email")} /></Field>
        <Field className="mt-4" label={t("auth.password")} htmlFor="a-pw" error={err("password")}>
          <div className="relative">
            <Input id="a-pw" type={show ? "text" : "password"} autoComplete="current-password" aria-invalid={!!errors.password} className="pe-16" {...register("password")} />
            <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gold">{show ? t("auth.hide") : t("auth.show")}</button>
          </div>
        </Field>
        {errors.root && <p role="alert" className="mt-4 flex items-start gap-2 bg-error-bg px-3 py-2.5 text-[12px] font-semibold text-error"><TriangleAlert className="size-4 shrink-0" /> {errors.root.message}</p>}
        <div className="my-4 flex items-center justify-between">
          <CheckRow id="a-keep" label={<span className="text-[11px]">{t("auth.keep")}</span>} checked={keep} onCheckedChange={setKeep} />
          <button type="button" onClick={() => go("forgot")} className="text-[11px] font-bold text-gold">{t("auth.forgot")}</button>
        </div>
        <Button type="submit" variant="gold" size="lg" className="w-full" disabled={m.isPending}>{m.isPending ? <><Loader2 className="animate-spin" /> {t("common.loading")}</> : t("auth.signIn")}</Button>
      </form>
      <div className="my-6 border-t border-line text-center"><span className="relative -top-2.5 bg-ivory px-2.5 text-[10px] text-ink-muted">{t("common.or")}</span></div>
      <Button type="button" variant="outline" className="w-full" onClick={() => toast.info(t("auth.oauthNote"))}>{t("auth.google")} <small className="ms-2 bg-soft px-1.5 py-1 text-[9px]">{t("auth.oauth")}</small></Button>
      <p className="mt-5 text-center text-[12px]">{t("auth.newTo")} <button type="button" onClick={() => go("sign-up")} className="font-bold text-gold">{t("auth.createAccount")}</button></p>
    </div>
  );
}

function SignUp({ go }: { go: (m: Mode, extra?: Record<string, string>) => void }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const [role, setRole] = useState<"GUEST" | "HOST">(params.get("role") === "HOST" ? "HOST" : "GUEST");
  const [show, setShow] = useState(false);
  const schema = yup.object({ name: yup.string().trim().required("auth.v.name"), email: emailRule, password: yup.string().required("auth.v.password").min(8, "auth.v.password"), terms: yup.boolean().oneOf([true], "auth.v.terms").required() });
  type V = yup.InferType<typeof schema>;
  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<V>({ resolver: yupResolver(schema), defaultValues: { name: "", email: "", password: "", terms: false } });
  const strength = strengthOf(watch("password") ?? "");
  const m = useMutation({
    mutationFn: (v: V) => authService.register({ name: v.name, email: v.email, password: v.password, role }),
    onSuccess: (r) => go("verify", { email: r.email }),
    onError: (e) => { if (!applyFieldErrors(e, setError)) setError("root", { message: errorMessage(e, t("errors.generic")) }); },
  });
  const err = (k: keyof V) => (errors[k]?.message ? t(errors[k]!.message as string, { defaultValue: errors[k]!.message as string }) : undefined);
  return (
    <form noValidate onSubmit={handleSubmit((v) => m.mutate(v))} className="flex flex-col">
      <span className="eyebrow">{t("auth.create")}</span>
      <h1 className="mb-5 text-[34px]">{t("auth.joinTitle")}</h1>
      <div role="radiogroup" aria-label={t("auth.accountType")} className="mb-1 grid grid-cols-2 gap-2">
        {([["GUEST", UserIcon], ["HOST", Building2]] as const).map(([r, I]) => (
          <button key={r} type="button" role="radio" aria-checked={role === r} onClick={() => setRole(r)} className={cn("flex flex-col items-start gap-1 border bg-paper p-3 text-start text-navy", role === r ? "border-gold shadow-[inset_0_0_0_1px_var(--gold)]" : "border-line")}>
            <I className="size-[18px]" /><b className="text-[12px]">{t(`auth.role.${r}`)}</b><small className="text-[10px] text-ink-muted">{t(`auth.roleSub.${r}`)}</small>
          </button>
        ))}
      </div>
      <p className="mb-1 text-[10px] text-ink-muted">{t("auth.adminNote")}</p>
      <Field className="mt-3" label={role === "HOST" ? t("auth.businessName") : t("auth.name")} htmlFor="s-name" error={err("name")}><Input id="s-name" autoComplete={role === "HOST" ? "organization" : "name"} aria-invalid={!!errors.name} {...register("name")} /></Field>
      <Field className="mt-4" label={t("auth.email")} htmlFor="s-email" error={err("email")}><Input id="s-email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register("email")} /></Field>
      <Field className="mt-4" label={t("auth.password")} htmlFor="s-pw" error={err("password")}>
        <div className="relative">
          <Input id="s-pw" type={show ? "text" : "password"} autoComplete="new-password" placeholder={t("auth.pwPh")} aria-invalid={!!errors.password} className="pe-16" {...register("password")} />
          <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gold">{show ? t("auth.hide") : t("auth.show")}</button>
        </div>
      </Field>
      <div className="mt-2 flex items-center gap-1" role="meter" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength} aria-label={t("auth.password")}>
        {[0, 1, 2, 3].map((i) => <i key={i} className={cn("h-1 flex-1", i < strength ? "bg-success" : "bg-line")} />)}
        <small className="ms-1.5 w-16 text-[10px] text-ink-muted">{(t("auth.strength", { returnObjects: true }) as string[])[strength]}</small>
      </div>
      <CheckRow id="s-terms" className="mt-4" label={<span className="text-[11px]">{t("auth.terms")}</span>} checked={!!watch("terms")} onCheckedChange={(v) => setValue("terms", v, { shouldValidate: true })} />
      {errors.terms && <p role="alert" className="text-[11px] font-semibold text-error">{err("terms")}</p>}
      {errors.root && <p role="alert" className="mt-4 flex items-center gap-2 bg-error-bg px-3 py-2.5 text-[12px] font-semibold text-error"><TriangleAlert className="size-4" /> {errors.root.message}</p>}
      <Button type="submit" variant="gold" size="lg" className="mt-6 w-full" disabled={m.isPending}>{m.isPending ? <><Loader2 className="animate-spin" /> {t("common.loading")}</> : t("auth.createAccount")}</Button>
      <p className="mt-5 text-center text-[12px]">{t("auth.have")} <button type="button" onClick={() => go("sign-in")} className="font-bold text-gold">{t("auth.signIn")}</button></p>
    </form>
  );
}

function Forgot({ go }: { go: (m: Mode, extra?: Record<string, string>) => void }) {
  const { t } = useTranslation();
  const schema = yup.object({ email: emailRule });
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: yupResolver(schema) });
  const m = useMutation({ mutationFn: (email: string) => authService.forgotPassword(email), onSuccess: (r, email) => go("sent", { email, token: r.demoResetToken }) });
  return (
    <form noValidate onSubmit={handleSubmit((v) => m.mutate(v.email))} className="flex flex-col">
      <span className="eyebrow">{t("auth.reset")}</span>
      <h1 className="mb-3 text-[34px]">{t("auth.forgotTitle")}</h1>
      <p className="text-[13px] text-ink-muted">{t("auth.forgotText")}</p>
      <Field className="mt-2" label={t("auth.email")} htmlFor="f-email" error={errors.email && t(errors.email.message as string)}><Input id="f-email" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={!!errors.email} {...register("email")} /></Field>
      <Button type="submit" variant="gold" size="lg" className="mt-6 w-full" disabled={m.isPending}>{t("auth.sendLink")}</Button>
      <Button type="button" variant="text" className="mt-2" onClick={() => go("sign-in")}>{t("auth.backToSignIn")}</Button>
    </form>
  );
}

function Reset({ token, go }: { token: string; go: (m: Mode, extra?: Record<string, string>) => void }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const schema = yup.object({ password: yup.string().required("auth.v.password").min(8, "auth.v.password"), confirm: yup.string().required("auth.v.confirm").oneOf([yup.ref("password")], "auth.v.confirm") });
  type V = yup.InferType<typeof schema>;
  const { register, handleSubmit, setError, formState: { errors } } = useForm<V>({ resolver: yupResolver(schema) });
  const m = useMutation({ mutationFn: (v: V) => authService.resetPassword({ token, ...v }), onSuccess: () => go("reset-done"), onError: (e) => { if (!applyFieldErrors(e, setError)) setError("root", { message: errorMessage(e, t("errors.generic")) }); } });
  const err = (k: keyof V) => (errors[k]?.message ? t(errors[k]!.message as string, { defaultValue: errors[k]!.message as string }) : undefined);
  return (
    <form noValidate onSubmit={handleSubmit((v) => m.mutate(v))} className="flex flex-col">
      <span className="eyebrow">{t("auth.reset")}</span>
      <h1 className="mb-3 text-[34px]">{t("auth.resetTitle")}</h1>
      <p className="text-[13px] text-ink-muted">{t("auth.resetText")}</p>
      <Field className="mt-2" label={t("auth.newPassword")} htmlFor="r-pw" error={err("password")}>
        <div className="relative"><Input id="r-pw" type={show ? "text" : "password"} autoComplete="new-password" aria-invalid={!!errors.password} className="pe-16" {...register("password")} />
          <button type="button" onClick={() => setShow(!show)} aria-pressed={show} className="absolute end-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gold">{show ? t("auth.hide") : t("auth.show")}</button></div>
      </Field>
      <Field className="mt-4" label={t("auth.confirmPassword")} htmlFor="r-confirm" error={err("confirm")}><Input id="r-confirm" type={show ? "text" : "password"} autoComplete="new-password" aria-invalid={!!errors.confirm} {...register("confirm")} /></Field>
      {errors.root && <p role="alert" className="mt-4 flex items-center gap-2 bg-error-bg px-3 py-2.5 text-[12px] font-semibold text-error"><TriangleAlert className="size-4" /> {errors.root.message}</p>}
      <Button type="submit" variant="gold" size="lg" className="mt-6 w-full" disabled={m.isPending || !token}>{t("auth.savePassword")}</Button>
      {!token && <p role="alert" className="mt-3 text-[12px] text-error">{t("auth.noToken")}</p>}
    </form>
  );
}

function Verify({ email }: { email: string }) {
  const { t } = useTranslation();
  const finish = useFinishSignIn();
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string>();
  const [wait, setWait] = useState(42);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { if (wait <= 0) return; const id = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(id); }, [wait]);
  const m = useMutation({
    mutationFn: () => authService.verifyEmail(email, digits.join("")),
    onSuccess: (s) => { toast.success(t("auth.verified")); finish(s); },
    onError: (e) => setError(errorMessage(e, t("auth.v.code"))),
  });
  const setAt = (i: number, v: string) => {
    const chars = v.replace(/\D/g, "").split("");
    if (chars.length > 1) { const next = [...digits]; chars.slice(0, 6 - i).forEach((c, k) => (next[i + k] = c)); setDigits(next); refs.current[Math.min(5, i + chars.length)]?.focus(); return; }
    const next = [...digits]; next[i] = chars[0] ?? ""; setDigits(next); setError(undefined);
    if (chars[0] && i < 5) refs.current[i + 1]?.focus();
  };
  return (
    <State icon={<ShieldCheck />} title={t("auth.verifyTitle")} text={t("auth.verifyText", { email: email || "—" })}>
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
        <Button type="submit" variant="gold" size="lg" className="mt-3 w-full" disabled={m.isPending || !email}>{t("auth.verifyCta")}</Button>
        <Button type="button" variant="text" className="mt-2" disabled={wait > 0} onClick={() => { setWait(42); toast.success(t("auth.resent")); }}>{t("auth.resend")}{wait > 0 ? ` · 0:${String(wait).padStart(2, "0")}` : ""}</Button>
      </form>
    </State>
  );
}
