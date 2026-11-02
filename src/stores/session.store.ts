import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Role, User } from "@/types/models";
import { sessionStore, setToken } from "@/services/auth-token";

/** Frontend demo session (§60). MOCK AUTHENTICATION: the token only names a demo account.
 * Production replaces this with the identity provider's httpOnly session; nothing here is a security boundary. */
type SessionState = {
  user: User | null;
  token: string | null;
  keep: boolean;
  signIn: (s: { user: User; token: string }, keep?: boolean) => void;
  setUser: (u: User) => void;
  signOut: () => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      keep: false,
      signIn: ({ user, token }, keep = false) => { setToken(token); set({ user, token, keep }); },
      setUser: (user) => set({ user }),
      signOut: () => { setToken(null); set({ user: null, token: null, keep: false }); },
    }),
    {
      name: "nuzul.session-state",
      storage: createJSONStorage(() => sessionStore),
      partialize: ({ user, token, keep }) => ({ user, token, keep }),
      onRehydrateStorage: () => (s) => setToken(s?.token ?? null),
    },
  ),
);
// Rehydration from web storage is synchronous; make sure the API client sees the token immediately.
setToken(useSession.getState().token);

export const roleHome = (role?: Role | null) => (role === "HOST" ? "/host" : role === "ADMIN" ? "/admin" : role === "GUEST" ? "/account" : "/");
export const useRole = () => useSession((s) => s.user?.role ?? null);
export const useIsGuest = () => useSession((s) => s.user?.role === "GUEST");
