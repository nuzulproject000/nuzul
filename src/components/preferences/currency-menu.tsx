/* Desktop currency selector: flag + code trigger, two options with a check on the selected one.
 * Radix DropdownMenu provides outside-click / Escape closing, arrow-key navigation and focus return.
 * Uses the existing preferences store — no conversion logic lives here. */
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import type { DisplayCurrency } from "@/types/models";
import { usePreferences } from "@/stores/preferences.store";
import { cn } from "@/lib/utils";
import { CURRENCIES } from "./flags";

export function CurrencyMenu({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { currency, setCurrency } = usePreferences();
  const current = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  return (
    <DropdownPrimitive.Root modal={false}>
      <DropdownPrimitive.Trigger
        aria-label={`${t("nav.currency")}: ${t(current.nameKey)}`}
        className={cn("group flex cursor-pointer items-center gap-1.5 py-1.5 text-xs font-semibold text-charcoal transition-colors duration-200 hover:opacity-80", className)}
      >
        <current.Flag /> {current.code}
        <ChevronDown className="size-3.5 transition-transform duration-150 group-data-[state=open]:rotate-180" />
      </DropdownPrimitive.Trigger>
      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content align="end" sideOffset={10} className="z-[150] min-w-[210px] border border-line bg-paper p-1.5 shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <DropdownPrimitive.Label className="px-3 pt-1.5 pb-2 text-[10px] font-bold tracking-widest text-gold uppercase">{t("nav.currency")}</DropdownPrimitive.Label>
          <DropdownPrimitive.RadioGroup value={currency} onValueChange={(v) => setCurrency(v as DisplayCurrency)}>
            {CURRENCIES.map(({ code, Flag, nameKey }) => (
              <DropdownPrimitive.RadioItem key={code} value={code} className="flex cursor-pointer select-none items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] text-navy outline-none transition-colors duration-150 data-[highlighted]:text-gold focus-visible:bg-soft data-[state=checked]:font-semibold">
                <Flag />
                <span className="flex-1"><b className="font-semibold">{code}</b> <span className="text-ink-muted">· {t(nameKey)}</span></span>
                <DropdownPrimitive.ItemIndicator><Check className="size-4 text-gold" /></DropdownPrimitive.ItemIndicator>
              </DropdownPrimitive.RadioItem>
            ))}
          </DropdownPrimitive.RadioGroup>
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}
