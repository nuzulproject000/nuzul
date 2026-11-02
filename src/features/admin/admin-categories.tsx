/* Category management (§15, §52): add, rename, reorder, enable/disable, delete. Saved as one ordered list. */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { Category } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/controls";
import { ErrorState } from "@/components/common";
import { Panel, Toolbar } from "@/components/dashboard";
import { useCategories, useSaveCategories } from "@/hooks/queries";
import { categoryIcon } from "@/lib/icons";
import { errorMessage } from "@/lib/forms";

export default function AdminCategories() {
  const { t } = useTranslation();
  const { data, error, refetch } = useCategories();
  const save = useSaveCategories();
  const [list, setList] = useState<Category[]>([]);
  const [name, setName] = useState("");
  useEffect(() => { if (data) setList([...data].sort((a, b) => a.order - b.order)); }, [data]);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const move = (i: number, d: -1 | 1) => { const n = [...list]; [n[i], n[i + d]] = [n[i + d], n[i]]; setList(n); };
  const dup = list.map((c) => c.name.trim().toLowerCase()).some((n, i, a) => a.indexOf(n) !== i);
  const dirty = JSON.stringify(list) !== JSON.stringify([...(data ?? [])].sort((a, b) => a.order - b.order));
  return (
    <>
      <Toolbar title={t("admin.nav.categories")} sub={t("admin.cat.sub")}>
        <Button variant="outline" disabled={!dirty} onClick={() => data && setList([...data].sort((a, b) => a.order - b.order))}>{t("common.reset")}</Button>
        <Button variant="gold" disabled={!dirty || dup || save.isPending} onClick={() => save.mutate(list.map((c, i) => ({ ...c, order: i + 1 })), { onSuccess: () => toast.success(t("admin.cat.saved")) })}>{t("common.saveChanges")}</Button>
      </Toolbar>
      {(dup || save.error) && <p role="alert" className="text-[12px] font-semibold text-error">{dup ? t("admin.cat.duplicate") : errorMessage(save.error, "")}</p>}
      <Panel title={t("admin.cat.list", { count: list.length })}>
        <ol className="flex flex-col">
          {list.map((c, i) => { const I = categoryIcon(c.name); return (
            <li key={c.id} className="grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 border-b border-line py-2.5 last:border-0">
              <I className="size-4 text-gold" />
              <Input aria-label={t("wishlists.name")} value={c.name} onChange={(e) => setList(list.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)))} className="min-h-9 max-w-sm" />
              <Switch checked={c.active} onCheckedChange={(v) => setList(list.map((x) => (x.id === c.id ? { ...x, active: v } : x)))} aria-label={`${c.name} · ${t("admin.cat.visible")}`} />
              <span className="flex gap-1">
                <Button size="icon-sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t("admin.cat.up")}><ArrowUp /></Button>
                <Button size="icon-sm" variant="ghost" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={t("admin.cat.down")}><ArrowDown /></Button>
                <Button size="icon-sm" variant="ghost" className="text-error" onClick={() => setList(list.filter((x) => x.id !== c.id))} aria-label={t("common.delete")}><Trash2 /></Button>
              </span>
            </li>
          ); })}
        </ol>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; setList([...list, { id: `cat-${Date.now()}`, name: name.trim(), icon: "compass", active: true, order: list.length + 1 }]); setName(""); }}>
          <Input aria-label={t("admin.cat.new")} placeholder={t("admin.cat.new")} value={name} onChange={(e) => setName(e.target.value)} className="min-h-10 max-w-sm" />
          <Button type="submit" variant="outline" disabled={!name.trim()}><Plus /> {t("admin.cat.add")}</Button>
        </form>
      </Panel>
    </>
  );
}
