import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// Lazy routes + mock API need a little longer than the 1s default.
configure({ asyncUtilTimeout: 8000 });
import { resetDb } from "@/mocks/server";
import "@/i18n";
import { useSession } from "@/stores/session.store";
import { useUi } from "@/stores/ui.store";

// Every test starts from the seed database.
// …and as a signed-out visitor (the app's default identity).
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetDb(); useSession.getState().signOut(); useUi.getState().openAuthPrompt(null); });
afterEach(() => cleanup());

// jsdom gaps used by Radix / Embla / Recharts.
class RO { observe() {} unobserve() {} disconnect() {} }
Object.assign(globalThis, { ResizeObserver: RO, IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } } });
window.matchMedia ??= ((q: string) => ({ matches: false, media: q, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false })) as typeof window.matchMedia;
Element.prototype.scrollIntoView ??= function () {};
window.scrollTo = (() => {}) as typeof window.scrollTo;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.releasePointerCapture ??= () => {};
