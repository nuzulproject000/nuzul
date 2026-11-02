/* Keeps the frontend session coherent: re-validates the stored session on load, reacts to expiry,
 * clears per-account caches on account switch, and syncs the shared demo dataset across tabs. */
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { meService } from "@/services/account.service";
import { useSession } from "@/stores/session.store";

const useMocks = import.meta.env.VITE_USE_MOCKS !== "false";

export function SessionEffects() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const loc = useLocation();

  // 1 · Restore: confirm the stored account still exists and pick up status changes (e.g. suspension).
  useEffect(() => {
    if (!useSession.getState().token) return;
    meService.get().then((u) => useSession.getState().setUser(u)).catch(() => { /* 401 handled below */ });
  }, []);

  // 2 · Expiry: any 401 while signed in ends the session.
  useEffect(() => {
    const onExpired = () => {
      if (!useSession.getState().user) return;
      useSession.getState().signOut();
      navigate(`/auth/expired?next=${encodeURIComponent(loc.pathname + loc.search)}`, { replace: true });
    };
    window.addEventListener("nuzul:session-expired", onExpired);
    return () => window.removeEventListener("nuzul:session-expired", onExpired);
  }, [navigate, loc.pathname, loc.search]);

  // 3 · Account switch: drop every cached query that belonged to the previous identity.
  useEffect(() => useSession.subscribe((s, prev) => { if (s.user?.id !== prev.user?.id) qc.removeQueries(); }), [qc]);

  // 4 · Shared dataset: another tab (e.g. the host) changed the demo data → reload and refetch here.
  useEffect(() => {
    if (!useMocks) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== "nuzul.mockdb") return;
      void import("@/mocks/server").then((m) => { m.reloadDb(); void qc.invalidateQueries(); });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [qc]);

  // 5 · Keep the signed-in user object fresh when /me is refetched elsewhere.
  useEffect(() => qc.getQueryCache().subscribe((e) => {
    if (e.type === "updated" && e.query.queryKey[0] === "me" && e.query.queryKey.length === 1 && e.query.state.data) useSession.getState().setUser(e.query.state.data as never);
  }), [qc]);

  return null;
}
