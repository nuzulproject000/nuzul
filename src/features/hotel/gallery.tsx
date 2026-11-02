/* Full-screen photo gallery (§18): tabs, swipe (Embla), keyboard arrows, counter. */
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "ALL" | "ROOMS" | "FACILITIES";

export function Gallery({ images, rooms, name, initial, onClose }: { images: string[]; rooms: string[]; name: string; initial: Tab; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>(initial);
  const sets: Record<Tab, string[]> = { ALL: [...new Set([...images, ...rooms])], ROOMS: [...new Set(rooms)], FACILITIES: images.slice(1) };
  const list = sets[tab];
  const [ref, api] = useEmblaCarousel({ direction: i18n.dir() === "rtl" ? "rtl" : "ltr", loop: list.length > 1 });
  const [index, setIndex] = useState(0);
  useEffect(() => { if (!api) return; const on = () => setIndex(api.selectedScrollSnap()); api.on("select", on); api.reInit(); setIndex(0); return () => { api.off("select", on); }; }, [api, tab]);
  const prev = useCallback(() => api?.scrollPrev(), [api]);
  const next = useCallback(() => api?.scrollNext(), [api]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { const rtl = i18n.dir() === "rtl"; if (e.key === "ArrowLeft") (rtl ? next : prev)(); if (e.key === "ArrowRight") (rtl ? prev : next)(); };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [prev, next, i18n]);

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content className="fixed inset-0 z-[150] flex flex-col bg-[#0b141f] text-white focus:outline-none">
          <DialogPrimitive.Title className="sr-only">{name} — {t("hotel.showAll")}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{t("results.page", { page: index + 1, total: list.length })}</DialogPrimitive.Description>
          <header className="flex items-center justify-between gap-4 px-6 py-4 max-md:px-4">
            <div role="tablist" className="flex gap-1">
              {(["ALL", "ROOMS", "FACILITIES"] as const).map((k) => (
                <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("rounded-full px-3.5 py-2 text-[12px] font-semibold", tab === k ? "bg-white text-navy" : "text-white/70 hover:text-white")}>
                  {t(k === "ALL" ? "hotel.all" : k === "ROOMS" ? "hotel.roomsTab" : "hotel.facilities")} <span className="opacity-60">{sets[k].length}</span>
                </button>
              ))}
            </div>
            <span className="text-[12px] text-white/70" aria-live="polite">{index + 1} / {list.length}</span>
            <DialogPrimitive.Close aria-label={t("common.close")} className="grid size-10 place-items-center rounded-full hover:bg-white/10"><X className="size-5" /></DialogPrimitive.Close>
          </header>
          <div className="relative min-h-0 flex-1">
            <div ref={ref} className="h-full overflow-hidden">
              <div className="flex h-full">
                {list.map((src, i) => <div key={src + i} className="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center px-16 max-md:px-0"><img src={src} alt={`${name} ${i + 1}`} className="max-h-full max-w-full object-contain" /></div>)}
              </div>
            </div>
            <button type="button" onClick={prev} aria-label={t("card.prevPhoto")} className="absolute start-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy max-md:hidden"><ChevronLeft className="rtl:rotate-180" /></button>
            <button type="button" onClick={next} aria-label={t("card.nextPhoto")} className="absolute end-4 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-navy max-md:hidden"><ChevronRight className="rtl:rotate-180" /></button>
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-6 py-4">
            {list.map((src, i) => <button key={src + i} type="button" onClick={() => api?.scrollTo(i)} aria-label={`${i + 1}`} aria-current={i === index} className={cn("h-14 w-20 shrink-0 overflow-hidden border-2", i === index ? "border-sand" : "border-transparent opacity-60")}><img src={src} alt="" className="h-full w-full object-cover" /></button>)}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
