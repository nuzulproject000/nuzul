import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<React.ComponentRef<typeof LabelPrimitive.Root>, React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn("text-[11px] font-bold text-navy", className)} {...props} />
));
Label.displayName = "Label";

/** Label + control + error, the standard form field used across the app. */
function Field({ label, htmlFor, error, hint, className, children }: { label: React.ReactNode; htmlFor?: string; error?: string; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p role="alert" className="text-[11px] font-semibold text-error">{error}</p> : hint ? <p className="text-[11px] text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export { Label, Field };
