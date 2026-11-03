/* Gentle continuous auto-scroll for a horizontally scrollable row (presentation only).
 * The row stays natively swipeable: touching, dragging, wheeling or focusing pauses it, and it resumes
 * a moment after the interaction ends. Render the items twice so the loop is seamless.
 * Disabled unless `enabled` (e.g. mobile only) and never runs with prefers-reduced-motion. */
import { useEffect, useState, type RefObject } from "react";

export function useMediaQuery(query: string) {
  const get = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, [query]);
  return matches;
}

/** Returns true when the marquee is active (so the caller can render the duplicated set). */
export function useMarquee(ref: RefObject<HTMLElement | null>, { enabled = true, speed = 28 }: { enabled?: boolean; speed?: number } = {}) {
  const mobile = useMediaQuery("(max-width: 767px)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const active = enabled && mobile && !reduced;

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    let pos = Math.abs(el.scrollLeft);
    let paused = false;
    let resume: number | undefined;
    let last = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!paused) {
        const half = el.scrollWidth / 2;
        pos += (speed * dt) / 1000;
        if (half > 0 && pos >= half) pos -= half;
        el.scrollLeft = rtl ? -pos : pos;
      }
      raf = requestAnimationFrame(tick);
    };
    const pause = () => { paused = true; window.clearTimeout(resume); };
    const later = () => {
      window.clearTimeout(resume);
      resume = window.setTimeout(() => { pos = Math.abs(el.scrollLeft); paused = false; }, 2200);
    };
    const events: [string, EventListener][] = [["pointerdown", pause], ["touchstart", pause], ["wheel", () => { pause(); later(); }], ["focusin", pause],
      ["pointerup", later], ["pointercancel", later], ["touchend", later], ["focusout", later]];
    events.forEach(([e, fn]) => el.addEventListener(e, fn, { passive: true }));
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(resume); events.forEach(([e, fn]) => el.removeEventListener(e, fn)); };
  }, [active, ref, speed]);

  return active;
}
