/* Contract tests: the typed services against the mock backend. A real backend must satisfy the same behaviour. */
import { beforeEach, describe, expect, it } from "vitest";
import { asAdmin, asGuest, asHost } from "@/test/session";
import { hotelsService } from "@/services/catalog.service";
import { bookingService, meService, wishlistService, authService } from "@/services/account.service";
import { adminService, hostService } from "@/services/ops.service";
import { DEFAULT_CONFIG } from "@/lib/match-engine";
import type { ApiError, CreateBookingRequest } from "@/types/api";

const fail = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as ApiError; } throw new Error("expected failure"); };
const req = (over: Partial<CreateBookingRequest> = {}): CreateBookingRequest => ({
  hotelId: "h-rixos-seagate", roomId: "h-rixos-seagate-dbl", checkIn: "2027-03-10", checkOut: "2027-03-13",
  guests: { adults: 2, children: 0, infants: 0, pets: 0, rooms: 1 }, guest: { firstName: "Nadia", lastName: "Amin", email: "nadia@example.com", phone: "+201000000000" },
  paymentMethod: "CARD_ON_FILE", paymentToken: "tok_mock_card", acceptedPolicy: "FLEXIBLE", ...over,
});

describe("search (§13–14)", () => {
  it("paginates, filters and attaches a Match Score", async () => {
    const r = await hotelsService.search({ destination: "Sharm El Sheikh", pageSize: 2, page: 1 });
    expect(r.items.length).toBeLessThanOrEqual(2);
    expect(r.total).toBeGreaterThan(0);
    expect(r.items[0].match.score).toBeGreaterThan(0);
  });
  it("sorts by price ascending", async () => {
    const r = await hotelsService.search({ sort: "PRICE_ASC", pageSize: 20 });
    const prices = r.items.map((h) => h.fromPrice * (h.currency === "EGP" ? 1 : 50));
    expect(prices[0]).toBeLessThanOrEqual(prices[prices.length - 1]);
  });
  it("applies minimum Match Score", async () => {
    const r = await hotelsService.search({ minMatch: 90, pageSize: 50 });
    r.items.forEach((h) => expect(h.match.score).toBeGreaterThanOrEqual(90));
  });
  it("resolves SEO slugs and 404s unknown ones", async () => {
    expect((await hotelsService.bySlug("egypt/cairo/four-seasons-nile-plaza")).id).toBe("h-fs-cairo");
    expect((await fail(hotelsService.bySlug("nowhere/x"))).status).toBe(404);
  });
});

describe("booking lifecycle (§29–33, §63)", () => {
  beforeEach(asGuest);
  it("validates input with field errors", async () => {
    const e = await fail(bookingService.create(req({ checkOut: "2027-03-10", guest: { firstName: "", lastName: "", email: "bad", phone: "" } })));
    expect(e.status).toBe(422);
    expect(e.fieldErrors).toMatchObject({ checkOut: expect.any(String), email: expect.any(String) });
  });
  it("rejects too many guests for the room", async () => {
    const e = await fail(bookingService.create(req({ guests: { adults: 5, children: 0, infants: 0, pets: 0, rooms: 1 } })));
    expect(e.fieldErrors?.guests).toBeTruthy();
  });
  it("surfaces a declined payment without creating a booking", async () => {
    const before = (await bookingService.mine()).length;
    expect((await fail(bookingService.create(req({ paymentToken: "tok_decline" })))).status).toBe(402);
    expect((await bookingService.mine()).length).toBe(before);
  });
  it("creates, cancels with policy refund, and lets the host move state", async () => {
    const b = await bookingService.create(req());
    expect(b.state).toBe("CONFIRMED");
    expect(b.id).toMatch(/^NZL-\d{6}-\d{4}$/);
    const c = await bookingService.cancel(b.id);
    expect(c.refundPct).toBe(100);
    expect(c.booking.state).toBe("REFUNDED");
    await asHost();
    const pending = (await hostService.reservations(["PENDING"])).items[0];
    expect((await hostService.transition(pending.id, "CONFIRMED")).state).toBe("CONFIRMED");
    expect((await fail(hostService.transition(pending.id, "COMPLETED"))).status).toBe(409);
  });
  it("only allows verified reviews for completed stays", async () => {
    const upcoming = (await bookingService.mine()).find((b) => b.state === "CONFIRMED")!;
    expect((await fail(bookingService.review(upcoming.id, { categories: {}, text: "x".repeat(40) }))).status).toBe(403);
    const done = (await bookingService.mine()).find((b) => b.state === "COMPLETED" && !b.reviewed)!;
    expect((await fail(bookingService.review(done.id, { categories: { cleanliness: 5 }, text: "short" }))).status).toBe(422);
    await bookingService.review(done.id, { categories: { cleanliness: 5, location: 5, staff: 5, comfort: 5, facilities: 5, value: 5 }, text: "Lovely, quiet stay with a great pool and attentive staff." });
    expect((await bookingService.get(done.id)).reviewed).toBe(true);
  });
});

describe("wishlists (§21–22)", () => {
  beforeEach(asGuest);
  it("creates, likes and moves", async () => {
    const w = await wishlistService.create("Winter sun");
    const lists = await wishlistService.list();
    const unsaved = ["h-greenwich", "h-pavillon", "h-the-ned", "h-mena-house", "h-kempinski"].find((id) => !lists.some((l) => l.hotelIds.includes(id)))!;
    const liked = await wishlistService.toggleLike(unsaved);
    expect(liked.liked).toBe(true);
    const from = (await wishlistService.list()).find((l) => l.hotelIds.includes(unsaved))!;
    const moved = await wishlistService.move(from.id, unsaved, w.id);
    expect(moved.to.hotelIds).toContain(unsaved);
    expect((await wishlistService.toggleLike(unsaved)).liked).toBe(false);
    expect((await fail(wishlistService.create(" "))).status).toBe(422);
  });
});

describe("Match Engine admin (§49)", () => {
  it("rejects weights that don’t total 100 and recomputes scores when saved", async () => {
    await asAdmin();
    expect((await fail(adminService.saveMatchConfig({ ...DEFAULT_CONFIG, weights: { ...DEFAULT_CONFIG.weights, location: 50 } }))).status).toBe(422);
    const before = (await hotelsService.get("h-cecil")).match.score;
    await adminService.saveMatchConfig({ ...DEFAULT_CONFIG, weights: { ...DEFAULT_CONFIG.weights, location: 5, atmosphere: 25 } });
    expect((await hotelsService.get("h-cecil")).match.score).not.toBe(before);
    expect((await adminService.audit())[0].action).toMatch(/location 20 → 5/);
  });
  it("profile edits change scores", async () => {
    await asGuest();
    const before = (await hotelsService.get("h-cecil")).match.score;
    await meService.saveProfile({ atmosphere: ["Lively"], budget: "BUDGET" });
    expect((await hotelsService.get("h-cecil")).match.score).not.toBe(before);
  });
});

describe("auth (§60)", () => {
  it("validates credentials and simulates a wrong password", async () => {
    expect((await fail(authService.login({ email: "x", password: "1" }))).status).toBe(422);
    expect((await fail(authService.login({ email: "nadia@example.com", password: "wrongpassword" }))).status).toBe(401);
    expect((await fail(authService.login({ email: "nobody@example.com", password: "correct-horse" }))).status).toBe(401);
    expect((await authService.login({ email: "partners@rixos.example", password: "correct-horse" })).user.role).toBe("HOST");
  });
  it("registers, verifies and resets a password (simulated email)", async () => {
    expect((await authService.register({ name: "Rana", email: "rana@example.com", password: "long-enough", role: "GUEST" })).status).toBe("VERIFICATION_SENT");
    expect((await fail(authService.register({ name: "Rana", email: "rana@example.com", password: "long-enough", role: "GUEST" }))).fieldErrors?.email).toBeTruthy();
    expect((await authService.verifyEmail("rana@example.com", "123456")).user.email).toBe("rana@example.com");
    const { demoResetToken } = await authService.forgotPassword("rana@example.com");
    expect((await fail(authService.resetPassword({ token: demoResetToken, password: "new-password", confirm: "different" }))).status).toBe(422);
    expect((await authService.resetPassword({ token: demoResetToken, password: "new-password", confirm: "new-password" })).email).toBe("rana@example.com");
  });
  it("enforces roles on protected endpoints", async () => {
    expect((await fail(bookingService.mine())).status).toBe(401);
    await asGuest();
    expect((await fail(hostService.reservations())).status).toBe(403);
    expect((await fail(adminService.users({}))).status).toBe(403);
    await asHost();
    expect((await fail(bookingService.create(req()))).status).toBe(403);
  });
});

describe("split stays (§81)", () => {
  it("offers distinct hotel pairs covering the whole trip", async () => {
    const r = await hotelsService.splitStays({ destination: "Sharm El Sheikh", checkIn: "2027-01-10", checkOut: "2027-01-16" });
    expect(r.length).toBeGreaterThan(0);
    for (const p of r) {
      expect(p.legs[0].checkIn).toBe("2027-01-10");
      expect(p.legs[1].checkOut).toBe("2027-01-16");
      expect(p.legs[0].checkOut).toBe(p.legs[1].checkIn);
      expect(p.legs[0].hotel.id).not.toBe(p.legs[1].hotel.id);
    }
    expect(new Set(r.map((p) => p.legs.map((l) => l.hotel.id).sort().join())).size).toBe(r.length);
    expect(await hotelsService.splitStays({ checkIn: "2027-01-10", checkOut: "2027-01-12" })).toEqual([]);
  });
});
