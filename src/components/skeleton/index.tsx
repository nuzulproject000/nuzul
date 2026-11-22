/* Reusable loading skeletons (§70). Presentation only: soft cream blocks with thin beige borders and a gentle
 * 1.4 s gradient sweep (`.skel` in globals.css), mirrored in RTL and still under prefers-reduced-motion.
 * Each placeholder line sits in a box with the real text's line height, so swapping in content doesn't move anything. */
import { cn } from "@/lib/utils";

/** One shimmering block. `boxed` adds the thin beige border used for inputs, chips and images. */
export function SkeletonBlock({ className, boxed = false, style }: { className?: string; boxed?: boolean; style?: React.CSSProperties }) {
  return <div aria-hidden="true" className={cn("skel", boxed && "skel-box", className)} style={style} />;
}

/** A text line: `lineClass` reproduces the real line box (height + margins), `barClass` the visible bar inside it. */
export function SkeletonLine({ lineClass, barClass }: { lineClass: string; barClass: string }) {
  return <div aria-hidden="true" className={cn("flex items-center", lineClass)}><SkeletonBlock className={cn("rounded-[2px]", barClass)} /></div>;
}

/** Same box model as <HotelCard>: 4:3 image, label/rating row, title, location, tags, divider, Match + price, availability. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex min-w-0 flex-col", className)}>
      <SkeletonBlock boxed className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col pt-4">
        <div className="flex h-[17px] items-center justify-between gap-2">
          <SkeletonBlock className="h-2 w-[30%] rounded-[2px]" />
          <SkeletonBlock className="h-2.5 w-14 rounded-[2px]" />
        </div>
        <SkeletonLine lineClass="mt-3 mb-1.5 h-7" barClass="h-[15px] w-[72%]" />
        <SkeletonLine lineClass="mb-3 h-[19px]" barClass="h-2.5 w-[46%]" />
        <div className="flex h-[27px] gap-1.5">
          <SkeletonBlock className="h-full w-16" /><SkeletonBlock className="h-full w-20" /><SkeletonBlock className="h-full w-12" />
        </div>
        <div className="mt-auto pt-4" />
        <div className="flex h-[60px] items-end justify-between gap-2.5 border-t border-line pt-4">
          <div className="flex items-center gap-1.5">
            <SkeletonBlock className="size-4 rounded-full" /><SkeletonBlock className="h-2.5 w-16 rounded-[2px]" /><SkeletonBlock className="h-[19px] w-9 rounded-full" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <SkeletonBlock className="h-4 w-24 rounded-[2px]" /><SkeletonBlock className="h-2 w-28 rounded-[2px]" />
          </div>
        </div>
        <SkeletonLine lineClass="mt-2.5 h-[18px]" barClass="h-2.5 w-[55%]" />
      </div>
    </div>
  );
}
