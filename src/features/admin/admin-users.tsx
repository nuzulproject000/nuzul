/* User management (§52): search & filter by role / status / verification; suspend, reinstate, verify, change role. */
import { Textarea } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { errorMessage } from "@/lib/forms";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";
import type { Role, User } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlay";
import { EmptyState, ErrorState } from "@/components/common";
import { Avatar, DataTable, Toolbar } from "@/components/dashboard";
import { useAdminMutation, useAdminUsers } from "@/hooks/queries";
import { adminService } from "@/services/ops.service";
import { useDates } from "@/hooks/use-format";

const ANY = "ANY";
export default function AdminUsers() {
  const { t } = useTranslation();
  const { date } = useDates();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState("");
  const f = { role: params.get("role") ?? undefined, status: params.get("status") ?? undefined, verification: params.get("verification") ?? undefined, q: q || undefined };
  const { data, isLoading, error, refetch } = useAdminUsers(f);
  const update = useAdminMutation(({ id, patch }: { id: string; patch: Partial<User> }) => adminService.updateUser(id, patch));
  const set = (k: string, v: string) => { const n = new URLSearchParams(params); if (v === ANY) n.delete(k); else n.set(k, v); setParams(n, { replace: true }); };
  const [suspend, setSuspend] = useState<User | null>(null);
  const [reason, setReason] = useState("");
  const act = (u: User, patch: Partial<User>, msg: string) => update.mutate({ id: u.id, patch }, { onSuccess: () => { toast.success(msg); setSuspend(null); setReason(""); }, onError: (e) => toast.error(errorMessage(e, t("errors.generic"))) });
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  return (
    <>
      <Toolbar title={t("admin.nav.users")} sub={t("admin.users.sub", { count: data?.total ?? 0 })}>
        <Input aria-label={t("common.searchPlaceholder")} placeholder={t("admin.users.search")} value={q} onChange={(e) => setQ(e.target.value)} className="min-h-10 w-56 max-sm:w-full" />
        <Select ariaLabel={t("admin.col.role")} value={f.role ?? ANY} onValueChange={(v) => set("role", v)} className="min-h-10 w-36" options={[{ value: ANY, label: t("admin.allRoles") }, ...(["GUEST", "HOST", "ADMIN"] as Role[]).map((r) => ({ value: r, label: t(`auth.role.${r}`) }))]} />
        <Select ariaLabel={t("common.status")} value={f.status ?? ANY} onValueChange={(v) => set("status", v)} className="min-h-10 w-36" options={[{ value: ANY, label: t("admin.allStatuses") }, { value: "ACTIVE", label: t("admin.status.ACTIVE") }, { value: "SUSPENDED", label: t("admin.status.SUSPENDED") }]} />
        <Select ariaLabel={t("admin.col.verification")} value={f.verification ?? ANY} onValueChange={(v) => set("verification", v)} className="min-h-10 w-40" options={[{ value: ANY, label: t("admin.allVerification") }, { value: "VERIFIED", label: t("admin.status.VERIFIED") }, { value: "PENDING", label: t("admin.status.PENDING") }]} />
      </Toolbar>
      {isLoading ? <div className="skeleton h-80" /> : (
        <DataTable caption={t("admin.nav.users")} rows={data?.items ?? []} rowKey={(u) => u.id} empty={<EmptyState title={t("admin.users.empty")} text={t("admin.users.emptyText")} />} cols={[
          { head: t("admin.col.user"), cell: (u) => <span className="flex items-center gap-2"><Avatar name={u.name} /><span className="flex flex-col"><b className="text-navy">{u.name}</b><small className="text-ink-muted">{u.email}</small>{u.statusReason && <small className="text-[10px] text-error">{u.statusReason}</small>}</span></span> },
          { head: t("admin.col.role"), cell: (u) => t(`auth.role.${u.role}`) },
          { head: t("common.status"), cell: (u) => <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{t(`admin.status.${u.status}`)}</Badge> },
          { head: t("admin.col.verification"), cell: (u) => <Badge tone={u.verification === "VERIFIED" ? "success" : "warn"}>{t(`admin.status.${u.verification}`)}</Badge> },
          { head: t("admin.col.joined"), cell: (u) => date(u.joinedAt, "d MMM yyyy") },
          { head: t("nav.trips"), cell: (u) => u.bookings },
          { head: "", cell: (u) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button size="icon-sm" variant="ghost" aria-label={`${t("common.actions")} · ${u.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {u.verification !== "VERIFIED" && <DropdownMenuItem onSelect={() => act(u, { verification: "VERIFIED" }, t("admin.users.verified"))}>{t("admin.users.verify")}</DropdownMenuItem>}
                {(["GUEST", "HOST", "ADMIN"] as Role[]).filter((r) => r !== u.role).map((r) => <DropdownMenuItem key={r} onSelect={() => act(u, { role: r }, t("admin.users.roleChanged"))}>{t("admin.users.makeRole", { role: t(`auth.role.${r}`) })}</DropdownMenuItem>)}
                <DropdownMenuSeparator />
                {u.status === "ACTIVE" ? <DropdownMenuItem className="text-error" onSelect={() => setSuspend(u)}>{t("admin.users.suspend")}</DropdownMenuItem> : <DropdownMenuItem onSelect={() => act(u, { status: "ACTIVE" }, t("admin.users.reinstated"))}>{t("admin.users.reinstate")}</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          ) },
        ]} />
      )}
      <Dialog open={!!suspend} onOpenChange={(o) => !o && setSuspend(null)}>
        {suspend && <DialogContent title={t("admin.users.suspendTitle", { name: suspend.name })} description={t("admin.users.suspendText")}>
          <label htmlFor="u-reason" className="block text-[11px] font-bold text-navy">{t("trips.reason")}</label>
          <Textarea id="u-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-2" placeholder={t("admin.users.reasonPh")} />
          <DialogFooter><Button variant="outline" onClick={() => setSuspend(null)}>{t("common.cancel")}</Button><Button variant="destructive" disabled={!reason.trim() || update.isPending} onClick={() => act(suspend, { status: "SUSPENDED", statusReason: reason }, t("admin.users.suspended"))}>{t("admin.users.suspend")}</Button></DialogFooter>
        </DialogContent>}
      </Dialog>
    </>
  );
}
