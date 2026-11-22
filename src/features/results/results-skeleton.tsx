/* /search loading skeleton (presentation only). Reuses the results page's own section sizes and grid classes, so
 * nothing shifts when the real page or results arrive. Used as the route's Suspense fallback and while results load. */
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SkeletonBlock, SkeletonCard, SkeletonLine } from "@/components/skeleton";
import { cn } from "@/lib/utils";

export type ResultsView = "split" | "list" | "map";

/** Card grid columns per view — shared with the results page so skeleton and real cards use the same grid. */
export const resultsGridClass = (view: ResultsView) =>
  cn("grid gap-x-5 gap-y-9", view === "list" ? "grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1" : "grid-cols-2 max-md:grid-cols-1");

/** 6 card skeletons on desktop/tablet, 3 on phones. */
export function ResultsGridSkeleton({ view }: { view: ResultsView }) {
  return (
    <div className={resultsGridClass(view)} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} className={i >= 3 ? "max-md:hidden" : undefined} />)}
    </div>
  );
}

/** Category strip placeholders: same size as a category button (18px icon + label, 55px tall). */
export function CategoryItemsSkeleton({ count = 12 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex h-[55px] shrink-0 flex-col items-center gap-1.5 pb-3">
          <SkeletonBlock className="size-[18px] rounded-full" />
          <SkeletonLine lineClass="h-[16.5px]" barClass={cn("h-2", ["w-9", "w-12", "w-10", "w-14"][i % 4])} />
        </div>
      ))}
    </>
  );
}

/** Map panel placeholder: cream surface with the map controls' boxed stack in the same corner. */
export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("skel relative h-full border-s border-line", className)}>
      <div className="absolute end-4 bottom-6 flex w-9 flex-col overflow-hidden rounded-md border border-line bg-paper">
        {[0, 1, 2, 3].map((i) => <span key={i} className={cn("grid h-9 place-items-center", i && "border-t border-line")}><SkeletonBlock className="size-3.5 rounded-[2px]" /></span>)}
      </div>
    </div>
  );
}

const chip = "h-[35px] shrink-0 rounded-md";

/** Full /search page skeleton: search bar row, category strip, filter row, results heading, card grid and (desktop) map. */
export function SearchPageSkeleton() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const view = (params.get("view") as ResultsView) || "split";
  return (
    <div aria-busy="true" className="min-h-[100svh]">
      <p role="status" className="sr-only">{t("results.finding")}</p>
      <div className="bg-soft px-12 pt-8 pb-5 max-md:px-3 max-md:py-3.5">
        <SkeletonBlock boxed className="mx-auto h-14 w-full max-w-[1280px] bg-paper max-md:h-[94px]" />
      </div>
      <div className="scrollbar-none flex gap-7 overflow-hidden border-b border-line px-12 pt-3.5 max-md:gap-5 max-md:px-4"><CategoryItemsSkeleton /></div>
      <div className="flex h-16 items-center justify-between gap-3 overflow-hidden border-b border-line px-12 max-md:px-4">
        <div className="flex gap-2 overflow-hidden">
          <SkeletonBlock boxed className={cn(chip, "w-20")} />
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} boxed className={cn(chip, "w-[74px]", i > 0 && "max-md:hidden")} />)}
          <SkeletonBlock boxed className={cn(chip, "w-28 max-md:hidden")} /><SkeletonBlock boxed className={cn(chip, "w-32 max-lg:hidden")} />
        </div>
        <div className="flex shrink-0 gap-1.5">
          <SkeletonBlock boxed className={cn(chip, "w-16")} /><SkeletonBlock boxed className={cn(chip, "w-[70px] max-md:hidden")} /><SkeletonBlock boxed className={cn(chip, "w-16")} />
        </div>
      </div>
      <div className={cn(view === "split" ? "grid grid-cols-[minmax(640px,58%)_1fr] max-xl:grid-cols-[minmax(560px,60%)_1fr] max-lg:block" : "block")}>
        <section className={cn("px-12 pt-9 pb-28 max-md:px-4 max-md:pt-6", view === "map" && "hidden")}>
          <div className="mb-7 flex items-end justify-between gap-5 max-md:flex-col max-md:items-start">
            <div className="w-full max-w-[380px]">
              <SkeletonLine lineClass="h-6" barClass="h-2 w-52" />
              <SkeletonLine lineClass="my-2 h-[35px] max-md:h-[27px]" barClass="h-6 w-60 max-md:h-5 max-md:w-48" />
              <SkeletonLine lineClass="mb-1 h-[22px]" barClass="h-2.5 w-72 max-w-full" />
              <SkeletonLine lineClass="h-[18.7px]" barClass="h-2 w-full" />
              <SkeletonLine lineClass="h-[18.7px] min-[1700px]:hidden" barClass="h-2 w-2/3" />
              <SkeletonLine lineClass="hidden h-[18.7px] max-md:rtl:flex" barClass="h-2 w-1/3" />
            </div>
            <div className="flex shrink-0 items-center gap-2"><SkeletonBlock className="h-2.5 w-12 rounded-[2px]" /><SkeletonBlock boxed className="h-10 w-48 bg-paper" /></div>
          </div>
          <ResultsGridSkeleton view={view} />
        </section>
        {view !== "list" && (
          <aside className={cn("sticky top-[78px] h-[calc(100vh-78px)]", view === "split" && "max-lg:hidden", view === "map" && "h-[calc(100vh-230px)] max-md:h-[calc(100vh-260px)]")}>
            <MapSkeleton />
          </aside>
        )}
      </div>
    </div>
  );
}
