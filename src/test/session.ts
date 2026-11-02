/* Test helpers for the demo identity model: each helper signs the in-memory session in as a demo account
 * through the same mock login endpoint the UI uses, so requests carry that account's token. */
import { authService } from "@/services/account.service";
import { useSession } from "@/stores/session.store";

export const DEMO = { guest: "nadia@example.com", host: "partners@rixos.example", admin: "ops@nuzul.example" } as const;

export async function signInAs(email: string) {
  const s = await authService.login({ email, password: "demo-pass-2026" });
  useSession.getState().signIn(s);
  return s.user;
}
export const asGuest = () => signInAs(DEMO.guest);
export const asHost = () => signInAs(DEMO.host);
export const asAdmin = () => signInAs(DEMO.admin);
export const asVisitor = () => useSession.getState().signOut();
