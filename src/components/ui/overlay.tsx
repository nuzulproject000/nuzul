import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
function PopoverContent({ className, align = "start", sideOffset = 12, ...props }: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content align={align} sideOffset={sideOffset} className={cn("z-[150] border border-line bg-paper p-4 shadow-lift outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className)} {...props} />
    </PopoverPrimitive.Portal>
  );
}

const DropdownMenu = DropdownPrimitive.Root;
const DropdownMenuTrigger = DropdownPrimitive.Trigger;
function DropdownMenuContent({ className, align = "end", ...props }: React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Content>) {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content align={align} sideOffset={8} className={cn("z-[150] min-w-[220px] border border-line bg-paper p-1.5 shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0", className)} {...props} />
    </DropdownPrimitive.Portal>
  );
}
const DropdownMenuItem = React.forwardRef<React.ComponentRef<typeof DropdownPrimitive.Item>, React.ComponentPropsWithoutRef<typeof DropdownPrimitive.Item> & { destructive?: boolean }>(({ className, destructive, ...props }, ref) => (
  <DropdownPrimitive.Item ref={ref} className={cn("flex cursor-pointer select-none items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] text-navy outline-none data-[highlighted]:bg-soft [&_svg]:size-4", destructive && "text-error", className)} {...props} />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
const DropdownMenuSeparator = () => <DropdownPrimitive.Separator className="my-1 h-px bg-line" />;
const DropdownMenuLabel = ({ children }: { children: React.ReactNode }) => <DropdownPrimitive.Label className="px-3 py-2 text-[10px] font-bold tracking-widest text-gold uppercase">{children}</DropdownPrimitive.Label>;

const TooltipProvider = TooltipPrimitive.Provider;
function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Root delayDuration={250}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content sideOffset={6} className="z-[300] max-w-64 rounded-md bg-navy px-3 py-2 text-[11px] leading-snug text-white shadow-lift">{content}</TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, TooltipProvider, Tooltip };
