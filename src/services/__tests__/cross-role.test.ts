/* Cross-role end-to-end tests over the shared demo dataset (one source of truth for every role).
 * Each test switches identity between demo accounts exactly as two browser tabs would, and checks that
 * an action taken by one role is visible — with the right data and notifications — to the others. */
import { describe, expect, it } from "vitest";
import { hotelsService } from "@/services/catalog.service";
import { authService, bookingService, meService, messagingService, notificationService } from "@/services/account.service";
import { adminService, hostService } from "@/services/ops.service";
import { reloadDb, resetDb, DB_KEY } from "@/mocks/server";
import { SESSION_KEY } from "@/services/auth-token";
import { asAdmin, asGuest, asHost, asVisitor, signInAs, DEMO } from "@/test/session";
import type { ApiError, CreateBookingRequest } from "@/types/api";
import type { CalendarDay } from "@/types/models";

const fail = async (p: Promise<unknown>) => { try { await p; } catch (e) { return e as ApiError; } throw new Error("expected failure"); };
const HOTEL = "h-rixos-seagate", ROOM = "h-rixos-seagate-dbl";
const booking = (checkIn: string, checkOut: string, over: Partial<CreateBookingRequest> = {}): CreateBookingRequest => ({
  hotelId: HOTEL, roomId: ROOM, checkIn, checkOut, guests: { adults: 2, children: 0, infants: 0, pets: 0, rooms: 1 },
  guest: { firstName: "Nadia", lastName: "Amin", email: DEMO.guest, phone: "+201000000000" }, paymentMethod: "CARD_ON_FILE", paymentToken: "tok_mock_card", acceptedPolicy: "FLEXIBLE", ...over,
});
/** Three consecutive bookable nights from the host calendar (future, open, with inventory). */
function freeNights(cal: CalendarDay[], from = 10): [string, string, string[]] {
  const today = new Date().toISOString().slice(0, 10);
  for (let i = from; i < cal.length - 4; i++) {
    const run = cal.slice(i, i + 3);
    if (run[0].date > today && run.every((d) => !d.closed && d.available >= 2)) return [run[0].date, cal[i + 3].date, run.map((d) => d.date)];
  }
  throw new Error("no free nights in calendar");
}
const newListing = { name: "Siwa Salt Lodge", city: "Siwa", country: "Egypt", area: "Shali", propertyType: "HOTEL" as const, description: "Eco-lodge of kershef walls beside the salt lakes, with dark-sky terraces and a spring-fed pool.", rooms: [{ name: "Lake Room", nightlyPrice: 3200, capacity: 2, totalUnits: 4 }] };

describe("TEST 1 · property publication (host → admin → public)", () => {
  it("a new listing stays private until an admin approves it, then appears publicly", async () => {
    await asHost();
    const h = await hostService.createHotel(newListing);
    expect(h.status).toBe("PENDING");
    expect(h.host.id).toBe("host-rixos");
    expect((await hostService.hotels()).some((x) => x.id === h.id)).toBe(true);

    asVisitor();
    expect((await fail(hotelsService.get(h.id))).status).toBe(404);
    expect((await hotelsService.search({ destination: "Siwa", pageSize: 50 })).items.some((x) => x.id === h.id)).toBe(false);

    await asAdmin();
    expect((await notificationService.list()).some((n) => n.title.includes("awaiting verification") && n.body.includes("Siwa Salt Lodge"))).toBe(true);
    expect((await adminService.hotels()).items.find((x) => x.id === h.id)?.status).toBe("PENDING");
    await adminService.updateHotel(h.id, { status: "LIVE", verification: "VERIFIED" });

    asVisitor();
    expect((await hotelsService.get(h.id)).name).toBe("Siwa Salt Lodge");
    expect((await hotelsService.search({ destination: "Siwa", pageSize: 50 })).items.some((x) => x.id === h.id)).toBe(true);

    await asHost();
    expect((await hostService.hotels()).find((x) => x.id === h.id)?.status).toBe("LIVE");
    expect((await notificationService.list()).some((n) => n.title === "Siwa Salt Lodge is live")).toBe(true);
  });
});

describe("TEST 2 · property rejection (admin → host → resubmit)", () => {
  it("requires a reason, shows it to the host, keeps the listing private, and accepts a resubmission", async () => {
    await asHost();
    const h = await hostService.createHotel(newListing);
    await asAdmin();
    expect((await fail(adminService.updateHotel(h.id, { status: "REJECTED" }))).status).toBe(422);
    await adminService.updateHotel(h.id, { status: "REJECTED", moderationNote: "Upload the tourism licence." });

    await asHost();
    const mine = (await hostService.hotels()).find((x) => x.id === h.id)!;
    expect(mine.status).toBe("REJECTED");
    expect(mine.moderationNote).toBe("Upload the tourism licence.");
    expect((await notificationService.list()).some((n) => n.title.includes("was not approved") && n.body === "Upload the tourism licence.")).toBe(true);

    asVisitor();
    expect((await fail(hotelsService.get(h.id))).status).toBe(404);

    await asHost();
    expect((await hostService.updateHotel(h.id, { description: `${newListing.description} Licence now attached.`, resubmit: true })).status).toBe("IN_REVIEW");
    await asAdmin();
    expect((await notificationService.list()).some((n) => n.title === "Property resubmitted")).toBe(true);
    // Another host can’t touch this listing.
    await signInAs("info@nilehouse.example");
    expect([403, 404]).toContain((await fail(hostService.updateHotel(h.id, { name: "Hijack" }))).status);
  });
});

describe("TEST 3 · reservation (guest → host → guest)", () => {
  it("a guest booking reaches the host with inventory, and host status changes reach the guest", async () => {
    await asHost();
    const [checkIn, checkOut, nights] = freeNights(await hostService.calendar(ROOM));
    const before = (await hostService.calendar(ROOM)).filter((d) => nights.includes(d.date)).map((d) => d.available);

    await asGuest();
    const b = await bookingService.create(booking(checkIn, checkOut));
    expect(b.guestId).toBe("u-nadia");
    expect(b.hostId).toBe("host-rixos");
    expect((await fail(bookingService.create(booking(checkIn, checkOut)))).code).toBe("DUPLICATE_BOOKING");

    await asHost();
    const res = (await hostService.reservations()).items.find((x) => x.id === b.id)!;
    expect(res.guestName).toBe("Nadia Amin");
    expect((await hostService.calendar(ROOM)).filter((d) => nights.includes(d.date)).map((d) => d.available)).toEqual(before.map((n) => n - 1));
    expect((await notificationService.list()).some((n) => n.title.includes(b.id))).toBe(true);
    await hostService.transition(b.id, "CANCELLED");
    expect((await hostService.calendar(ROOM)).filter((d) => nights.includes(d.date)).map((d) => d.available)).toEqual(before);

    await asGuest();
    expect((await bookingService.get(b.id)).state).toBe("CANCELLED");
    expect((await notificationService.list()).filter((n) => n.title.includes(b.id)).length).toBeGreaterThanOrEqual(2);
    // Other guests and other hosts cannot open it.
    await signInAs("james@example.com");
    expect([403, 404]).toContain((await fail(bookingService.get(b.id))).status);
  });
});

describe("TEST 4 · messaging (guest ↔ host, private to participants)", () => {
  it("delivers both ways with unread counts and notifications", async () => {
    await asGuest();
    const c = await messagingService.start({ hotelId: HOTEL });
    await messagingService.send(c.id, "Is the spa open on Fridays?");

    await asHost();
    const hostSide = (await messagingService.conversations()).find((x) => x.id === c.id)!;
    expect(hostSide.counterpartId).toBe("u-nadia");
    expect(hostSide.unread).toBeGreaterThan(0);
    expect((await messagingService.messages(c.id)).at(-1)?.text).toBe("Is the spa open on Fridays?");
    expect((await notificationService.list()).some((n) => n.body.includes("spa open"))).toBe(true);
    await messagingService.markRead(c.id);
    expect((await messagingService.conversations()).find((x) => x.id === c.id)!.unread).toBe(0);
    await messagingService.send(c.id, "Yes — 9am to 9pm every day.");

    await asGuest();
    expect((await messagingService.messages(c.id)).at(-1)).toMatchObject({ text: "Yes — 9am to 9pm every day.", senderId: "host-rixos" });
    expect((await messagingService.conversations()).find((x) => x.id === c.id)!.unread).toBeGreaterThan(0);

    await signInAs("james@example.com");
    expect([403, 404]).toContain((await fail(messagingService.messages(c.id))).status);
    asVisitor();
    expect((await fail(messagingService.conversations())).status).toBe(401);
  });

  it("routes support conversations to the admin inbox", async () => {
    await asGuest();
    const c = await messagingService.start({ kind: "SUPPORT" });
    await messagingService.send(c.id, "I was charged twice for NZL-261102-2210");
    await asAdmin();
    expect((await messagingService.conversations()).some((x) => x.id === c.id && x.counterpartId === "u-nadia")).toBe(true);
  });
});

describe("TEST 5 · review moderation (guest → public → admin → public)", () => {
  it("a verified review is public until removed by an admin, and the author is told", async () => {
    await asGuest();
    const done = (await bookingService.mine()).find((b) => b.state === "COMPLETED" && !b.reviewed)!;
    const before = (await hotelsService.get(done.hotelId)).reviewCount;
    await bookingService.review(done.id, { categories: { cleanliness: 5, location: 4, staff: 5, comfort: 4, facilities: 4, value: 4 }, text: "Quiet room, friendly team, excellent breakfast every morning." });

    asVisitor();
    const pub = await hotelsService.reviews(done.hotelId, "RECENT");
    const mine = pub.items.find((r) => r.bookingId === done.id)!;
    expect(mine.verifiedStay).toBe(true);
    expect((await hotelsService.get(done.hotelId)).reviewCount).toBe(before + 1);

    await asAdmin();
    expect((await fail(adminService.moderateReview(mine.id, "REMOVED"))).status).toBe(422);
    await adminService.moderateReview(mine.id, "REMOVED", "Personal information");

    asVisitor();
    expect((await hotelsService.reviews(done.hotelId, "RECENT")).items.some((r) => r.id === mine.id)).toBe(false);
    expect((await hotelsService.get(done.hotelId)).reviewCount).toBe(before);

    await asGuest();
    expect((await notificationService.list()).some((n) => n.title.includes("was removed") && n.body.includes("Personal information"))).toBe(true);
  });
});

describe("TEST 6 · availability & pricing (host → search/detail/checkout)", () => {
  it("price changes flow to detail and new bookings; closed dates block booking", async () => {
    await asHost();
    await hostService.updateRoom(ROOM, { nightlyPrice: 9999 });
    const [checkIn, checkOut, nights] = freeNights(await hostService.calendar(ROOM));
    expect((await hostService.calendar(ROOM)).find((d) => d.date === nights[0])!.price).toBe(9999);

    asVisitor();
    const h = await hotelsService.get(HOTEL);
    expect(h.rooms.find((r) => r.id === ROOM)!.nightlyPrice).toBe(9999);

    await asHost();
    await hostService.updateCalendar(ROOM, [nights[1]], { closed: true });
    asVisitor();
    const a = await hotelsService.availability(HOTEL, { roomId: ROOM, checkIn, checkOut, rooms: 1 });
    expect(a.available).toBe(false);
    expect(a.blockedDates).toEqual([nights[1]]);
    await asGuest();
    expect((await fail(bookingService.create(booking(checkIn, checkOut)))).code).toBe("NOT_AVAILABLE");

    await asHost();
    await hostService.updateCalendar(ROOM, [nights[1]], { closed: false });
    await asGuest();
    const b = await bookingService.create(booking(checkIn, checkOut));
    expect(b.price.room).toBe(9999 * 3);
  });
});

describe("TEST 7 · account management (admin suspension)", () => {
  it("a suspended guest can sign in only to read; writes and new sign-ins are refused until reinstated", async () => {
    await asAdmin();
    await adminService.updateUser("u-nadia", { status: "SUSPENDED", statusReason: "Chargeback under review" });
    expect((await fail(adminService.updateUser("u-admin", { status: "SUSPENDED", statusReason: "x" }))).status).toBe(409);

    expect((await fail(authService.login({ email: DEMO.guest, password: "demo-pass-2026" }))).code).toBe("ACCOUNT_SUSPENDED");
    // An already-open guest session (another tab) keeps read access but can’t write.
    const { useSession } = await import("@/stores/session.store");
    useSession.getState().signIn({ user: { id: "u-nadia" } as never, token: "mock.u-nadia" });
    expect((await meService.get()).status).toBe("SUSPENDED");
    expect((await bookingService.mine()).length).toBeGreaterThan(0);
    expect((await fail(bookingService.create(booking("2027-03-10", "2027-03-13")))).code).toBe("ACCOUNT_SUSPENDED");
    expect((await fail(messagingService.start({ kind: "SUPPORT" }))).code).toBe("ACCOUNT_SUSPENDED");

    await asAdmin();
    await adminService.updateUser("u-nadia", { status: "ACTIVE" });
    expect((await asGuest()).status).toBe("ACTIVE");
  });

  it("suspending a host hides their properties from the public until reinstated", async () => {
    await asAdmin();
    await adminService.updateUser("host-rixos", { status: "SUSPENDED", statusReason: "Licence expired" });
    asVisitor();
    expect((await fail(hotelsService.get(HOTEL))).status).toBe(404);
    expect((await hotelsService.search({ destination: "Sharm El Sheikh", pageSize: 50 })).items.some((h) => h.id === HOTEL)).toBe(false);
    await asAdmin();
    await adminService.updateUser("host-rixos", { status: "ACTIVE" });
    asVisitor();
    expect((await hotelsService.get(HOTEL)).id).toBe(HOTEL);
  });

  it("an admin-suspended property disappears from search and can’t be booked", async () => {
    await asAdmin();
    await adminService.updateHotel(HOTEL, { status: "SUSPENDED", moderationNote: "Safety inspection" });
    await asGuest();
    expect((await fail(bookingService.create(booking("2027-03-10", "2027-03-13")))).status).toBe(404);
    await asHost();
    expect((await hostService.hotels()).find((h) => h.id === HOTEL)!.moderationNote).toBe("Safety inspection");
  });
});

describe("TEST 8 · persistence", () => {
  it("data written by any role survives a reload of the store; reset restores the seed", async () => {
    await asGuest();
    const b = await bookingService.create(booking("2027-03-10", "2027-03-13"));
    expect(localStorage.getItem(DB_KEY)).toContain(b.id);
    expect(sessionStorage.getItem(SESSION_KEY.replace("nuzul.session", "nuzul.session-state")) ?? sessionStorage.getItem("nuzul.session-state")).toContain("mock.u-nadia");

    reloadDb(); // what a page refresh or another tab does
    await asHost();
    expect((await hostService.reservations()).items.some((x) => x.id === b.id)).toBe(true);

    resetDb();
    await asGuest();
    expect((await bookingService.mine()).some((x) => x.id === b.id)).toBe(false);
  });
});
