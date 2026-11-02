import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => (
  <input ref={ref} type={type} className={cn("flex min-h-12 w-full border border-line bg-paper px-3.5 text-sm text-navy placeholder:text-ink-muted/70 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-error", className)} {...props} />
));
Input.displayName = "Input";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("flex min-h-28 w-full resize-y border border-line bg-paper px-3.5 py-3 text-sm text-navy placeholder:text-ink-muted/70 aria-[invalid=true]:border-error", className)} {...props} />
));
Textarea.displayName = "Textarea";

export { Input, Textarea };
