import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as RadioPrimitive from "@radix-ui/react-radio-group";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<React.ComponentRef<typeof CheckboxPrimitive.Root>, React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root ref={ref} className={cn("peer size-[18px] shrink-0 rounded-[4px] border border-line bg-paper data-[state=checked]:border-gold data-[state=checked]:bg-gold data-[state=checked]:text-white", className)} {...props}>
    <CheckboxPrimitive.Indicator className="flex items-center justify-center"><Check className="size-3.5" strokeWidth={3} /></CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";

/** Checkbox + text label row. */
function CheckRow({ id, label, checked, onCheckedChange, className }: { id: string; label: React.ReactNode; checked: boolean; onCheckedChange: (v: boolean) => void; className?: string }) {
  return (
    <label htmlFor={id} className={cn("flex cursor-pointer items-center gap-2.5 py-1.5 text-[13px] text-charcoal", className)}>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onCheckedChange(v === true)} />
      <span>{label}</span>
    </label>
  );
}

const Switch = React.forwardRef<React.ComponentRef<typeof SwitchPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root ref={ref} className={cn("inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-line transition-colors data-[state=checked]:bg-gold", className)} {...props}>
    <SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[22px] rtl:data-[state=checked]:-translate-x-[22px] rtl:-translate-x-0.5" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

const Slider = React.forwardRef<React.ComponentRef<typeof SliderPrimitive.Root>, React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { thumbLabels?: string[] }>(({ className, thumbLabels, ...props }, ref) => (
  <SliderPrimitive.Root ref={ref} className={cn("relative flex w-full touch-none select-none items-center py-2", className)} {...props}>
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-soft"><SliderPrimitive.Range className="absolute h-full bg-gold" /></SliderPrimitive.Track>
    {(props.value ?? props.defaultValue ?? [0]).map((_, i) => <SliderPrimitive.Thumb key={i} aria-label={thumbLabels?.[i]} className="block size-[18px] rounded-full border-2 border-gold bg-paper shadow focus-visible:outline-3" />)}
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";

const RadioGroup = RadioPrimitive.Root;
const RadioItem = React.forwardRef<React.ComponentRef<typeof RadioPrimitive.Item>, React.ComponentPropsWithoutRef<typeof RadioPrimitive.Item>>(({ className, ...props }, ref) => (
  <RadioPrimitive.Item ref={ref} className={cn("size-[18px] shrink-0 rounded-full border border-line bg-paper data-[state=checked]:border-gold", className)} {...props}>
    <RadioPrimitive.Indicator className="flex items-center justify-center after:block after:size-2.5 after:rounded-full after:bg-gold" />
  </RadioPrimitive.Item>
));
RadioItem.displayName = "RadioItem";

function Progress({ value, className, label }: { value: number; className?: string; label?: string }) {
  return (
    <ProgressPrimitive.Root value={value} aria-label={label} className={cn("relative h-[3px] w-full overflow-hidden bg-soft", className)}>
      <ProgressPrimitive.Indicator className="h-full bg-gold transition-[width] duration-300" style={{ width: `${value}%` }} />
    </ProgressPrimitive.Root>
  );
}

const Separator = ({ className, ...props }: React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>) => <SeparatorPrimitive.Root className={cn("h-px w-full bg-line", className)} {...props} />;

function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}

export { Checkbox, CheckRow, Switch, Slider, RadioGroup, RadioItem, Progress, Separator, Skeleton };
