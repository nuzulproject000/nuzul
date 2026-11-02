import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-bold tracking-wide whitespace-nowrap", {
  variants: {
    tone: { success: "bg-success-bg text-success", warn: "bg-warn-bg text-warn", danger: "bg-error-bg text-error", neutral: "bg-[#ece8e1] text-navy", navy: "bg-navy text-sand", outline: "border border-line bg-paper text-navy" },
  },
  defaultVariants: { tone: "neutral" },
});

function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
