import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Nuzul button (shadcn/ui pattern) — variants map 1:1 to the v2 design: navy, gold, ghost, ivory, danger, text. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-[transform,background-color,color] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:-translate-y-px disabled:hover:translate-y-0",
  {
    variants: {
      variant: {
        default: "bg-navy text-white hover:bg-navy/95",
        gold: "bg-gold text-white hover:bg-gold/95",
        outline: "border border-line bg-transparent text-navy hover:bg-soft/60",
        ivory: "bg-ivory text-navy hover:bg-white",
        destructive: "bg-error text-white hover:bg-error/90",
        ghost: "bg-transparent text-navy hover:bg-soft",
        text: "bg-transparent text-navy p-0 h-auto min-h-0 hover:translate-y-0 hover:underline underline-offset-4",
        light: "bg-transparent text-[#cfd5dc] hover:text-white",
      },
      size: {
        default: "min-h-12 px-5 text-[13px] rounded-lg",
        sm: "min-h-9 px-3.5 text-[11px] rounded-md",
        xs: "min-h-7 px-2.5 text-[10px] rounded-md",
        lg: "min-h-14 px-7 text-sm rounded-lg",
        icon: "size-11 rounded-full border border-line text-navy bg-transparent hover:bg-soft/60",
        "icon-sm": "size-8 rounded-full border border-line text-navy bg-transparent hover:bg-soft/60",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, type, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} type={asChild ? undefined : (type ?? "button")} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
