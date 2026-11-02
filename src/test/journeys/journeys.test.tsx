/* User-journey tests through the real router, components and mock API (§4, §29, §47, §49, §60). */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderAt } from "../render";
import { bookingService } from "@/services/account.service";

describe("guest", () => {
  it("auth: validates, then signs in as a host and lands on the host dashboard", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/auth/sign-in");
    await user.click(await screen.findByRole("button", { name: /sign in as guest/i }));
    expect(await screen.findAllByText(/valid email/i)).not.toHaveLength(0);
    await user.click(screen.getByRole("radio", { name: /host/i }));
    await user.type(screen.getByLabelText(/email address/i), "host@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in as host/i }));
    expect(await screen.findByText(/incorrect/i)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/^password$/i));
    await user.type(screen.getByLabelText(/^password$/i), "correct-horse");
    await user.click(screen.getByRole("button", { name: /sign in as host/i }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/host"));
  });

  it("checkout: enforces policy consent, then books and shows the confirmation", async () => {
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
    const user = userEvent.setup();
    renderAt("/host/reservations?state=PENDING");
    const table = await screen.findByRole("table");
    await user.click(within(table).getAllByRole("button", { name: /^confirm$/i })[0]);
    await waitFor(async () => expect((await bookingService.get("NZL-261104-2232")).state).toBe("CONFIRMED"));
  });
});

describe("admin", () => {
  it("blocks publishing Match Engine weights that don’t total 100", async () => {
    const user = userEvent.setup();
    renderAt("/admin/match-engine");
    const location = await screen.findByRole("spinbutton", { name: /^location$/i });
    await user.clear(location);
    await user.type(location, "30");
    expect(await screen.findByText(/adjust them to 100%/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publish changes/i })).toBeDisabled();
  });
});
