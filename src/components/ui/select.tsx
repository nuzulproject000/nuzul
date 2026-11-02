import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Convenience select: <Select value onValueChange options={[{value,label}]} /> */
function Select({ value, onValueChange, options, placeholder, className, ariaLabel, id }: { value?: string; onValueChange: (v: string) => void; options: { value: string; label: React.ReactNode }[]; placeholder?: string; className?: string; ariaLabel?: string; id?: string }) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger id={id} aria-label={ariaLabel} className={cn("flex min-h-12 w-full items-center justify-between gap-2 border border-line bg-paper px-3.5 text-start text-sm text-navy data-[placeholder]:text-ink-muted", className)}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon><ChevronDown className="size-4 opacity-60" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={4} className="z-[200] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden border border-line bg-paper shadow-lift">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((o) => (
              <SelectPrimitive.Item key={o.value} value={o.value} className="relative flex cursor-pointer select-none items-center rounded-sm py-2.5 ps-8 pe-3 text-sm text-navy outline-none data-[highlighted]:bg-soft">
                <SelectPrimitive.ItemIndicator className="absolute start-2"><Check className="size-4 text-gold" /></SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

export { Select };
