/* User-journey tests through the real router, components and mock API (§4, §29, §47, §49, §60). */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderAt } from "../render";
import { asAdmin, asGuest, asHost } from "../session";
import { bookingService } from "@/services/account.service";
import { useSession } from "@/stores/session.store";
import { hostService } from "@/services/ops.service";

describe("visitor", () => {
  it("browses publicly; saving a stay opens the sign-in prompt instead of failing", async () => {
    const user = userEvent.setup();
    renderAt("/search?destination=Sharm%20El%20Sheikh");
    const save = (await screen.findAllByRole("button", { name: /save to wishlist/i }))[0];
    await user.click(save);
    expect(await screen.findByRole("dialog", { name: /sign in to save stays/i })).toBeInTheDocument();
  });

  it("is sent to sign-in from a protected page and resumes the booking afterwards", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/book/h-rixos-seagate?room=h-rixos-seagate-dbl");
    await waitFor(() => expect(router.state.location.pathname).toBe("/auth/sign-in"));
    expect(new URLSearchParams(router.state.location.search).get("next")).toBe("/book/h-rixos-seagate?room=h-rixos-seagate-dbl");
    await user.click(await screen.findByRole("button", { name: /sign in as guest — nadia/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/book/h-rixos-seagate"));
    expect(router.state.location.search).toBe("?room=h-rixos-seagate-dbl");
    expect(useSession.getState().user?.id).toBe("u-nadia");
    expect(await screen.findByRole("heading", { name: /select your room/i })).toBeInTheDocument();
  });
});

describe("auth", () => {
  it("validates, rejects a wrong password, then signs a host in to the host dashboard", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/auth/sign-in");
    const submit = await screen.findByRole("button", { name: /^sign in$/i });
    await user.click(submit);
    expect(await screen.findAllByText(/valid email/i)).not.toHaveLength(0);
    await user.type(screen.getByLabelText(/email address/i), "partners@rixos.example");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await user.click(submit);
    expect(await screen.findByText(/incorrect/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/^password$/i));
    await user.type(screen.getByLabelText(/^password$/i), "correct-horse");
    await user.click(submit);
    await waitFor(() => expect(router.state.location.pathname).toBe("/host"));
    expect(useSession.getState().user?.role).toBe("HOST");
  });

  it("walks the forgot → reset password flow", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/auth/forgot");
    await user.type(await screen.findByLabelText(/email address/i), "nadia@example.com");
    await user.click(screen.getByRole("button", { name: /send|reset link/i }));
    await user.click(await screen.findByRole("link", { name: /open reset link/i }).catch(() => screen.findByRole("button", { name: /open reset link/i })));
    await user.type(await screen.findByLabelText(/^new password$/i), "brand-new-pass");
    await user.type(screen.getByLabelText(/confirm new password/i), "brand-new-pass");
    await user.click(screen.getByRole("button", { name: /save new password/i }));
    expect(await screen.findByRole("heading", { name: /password updated/i })).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/auth\//);
  });

  it("shows access denied when a guest opens the admin console", async () => {
    await asGuest();
    renderAt("/admin");
    expect(await screen.findByRole("heading", { name: /don’t have access/i })).toBeInTheDocument();
  });
});

describe("guest", () => {
  it("checkout: enforces policy consent, then books and shows the confirmation", async () => {
    await asGuest();
    const user = userEvent.setup();
    const { router } = renderAt("/book/h-rixos-seagate?room=h-rixos-seagate-dbl");
    await screen.findByRole("heading", { name: /select your room/i });
    for (let i = 0; i < 4; i++) await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: /review policies/i });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/confirm you’ve read/i)).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /i have read/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: /your details/i });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(await screen.findByRole("button", { name: /^pay /i }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/booking\/confirmation\/NZL-/));
    expect(await screen.findByRole("heading", { name: /your stay is booked/i })).toBeInTheDocument();
    const id = router.state.location.pathname.split("/").pop()!;
    expect((await bookingService.mine()).some((b) => b.id === id)).toBe(true);
  });
});

describe("host", () => {
  it("confirms a pending reservation via the state machine", async () => {
    await asHost();
    const user = userEvent.setup();
    renderAt("/host/reservations?state=PENDING");
    const table = await screen.findByRole("table");
    await user.click(within(table).getAllByRole("button", { name: /^confirm$/i })[0]);
    await waitFor(async () => expect((await hostService.reservations()).items.find((b) => b.id === "NZL-261104-2232")?.state).toBe("CONFIRMED"));
  });
});

describe("admin", () => {
  it("blocks publishing Match Engine weights that don’t total 100", async () => {
    await asAdmin();
    const user = userEvent.setup();
    renderAt("/admin/match-engine");
    const location = await screen.findByRole("spinbutton", { name: /^location$/i });
    await user.clear(location);
    await user.type(location, "30");
    expect(await screen.findByText(/adjust them to 100%/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publish changes/i })).toBeDisabled();
  });
});
