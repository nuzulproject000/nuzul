/* Small inline SVG flags (emoji flags don't render on Windows). Decorative: the currency code is always shown next to them. */
import type { SVGProps } from "react";
import type { DisplayCurrency } from "@/types/models";
import { cn } from "@/lib/utils";

type FlagProps = SVGProps<SVGSVGElement>;
const base = "h-3.5 w-[21px] shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgb(15_28_46/.12)]";

export function EgyptFlag({ className, ...p }: FlagProps) {
  return (
    <svg viewBox="0 0 30 20" aria-hidden focusable="false" className={cn(base, className)} {...p}>
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.67" fill="#CE1126" />
      <rect y="13.33" width="30" height="6.67" fill="#000" />
      {/* Eagle of Saladin, simplified to stay legible at 21px */}
      <path d="M15 7.4c-.9 0-1.5.6-1.5 1.3v.6l-1.7-.7.6 1.6 1.1.4v1.3l1.5.9 1.5-.9v-1.3l1.1-.4.6-1.6-1.7.7v-.6c0-.7-.6-1.3-1.5-1.3Z" fill="#C09300" />
    </svg>
  );
}

export function UsFlag({ className, ...p }: FlagProps) {
  const h = 20 / 13;
  return (
    <svg viewBox="0 0 30 20" aria-hidden focusable="false" className={cn(base, className)} {...p}>
      <rect width="30" height="20" fill="#B22234" />
      {[1, 3, 5, 7, 9, 11].map((i) => <rect key={i} y={i * h} width="30" height={h} fill="#fff" />)}
      <rect width="12" height={h * 7} fill="#3C3B6E" />
      {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={2 + c * 4 + (r % 2) * 2} cy={1.9 + r * 2.4} r=".55" fill="#fff" />))}
    </svg>
  );
}

export const CURRENCIES: { code: DisplayCurrency; Flag: typeof EgyptFlag; nameKey: string }[] = [
  { code: "EGP", Flag: EgyptFlag, nameKey: "prefs.egp" },
  { code: "USD", Flag: UsFlag, nameKey: "prefs.usd" },
];
