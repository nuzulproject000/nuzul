import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, User } from "@/types/models";

/** Mock session (§60). Production would use secure httpOnly cookies / JWT from the auth service. */
type SessionState = {
  user: User | null;
  role: Role;
  signIn: (user: User, token: string) => void;
  signOut: () => void;
  setRole: (role: Role) => void;
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      user: { id: "u-nadia", name: "Nadia Amin", email: "nadia@example.com", phone: "+20 100 000 0000", role: "GUEST", status: "ACTIVE", verification: "VERIFIED", joinedAt: "2024-03-02", city: "Cairo", bookings: 6 },
      role: "GUEST",
      signIn: (user, token) => { localStorage.setItem("nuzul.session", token); set({ user, role: user.role }); },
      signOut: () => { localStorage.removeItem("nuzul.session"); set({ user: null, role: "GUEST" }); },
      setRole: (role) => set({ role }),
    }),
    { name: "nuzul.session-state" },
  ),
);
