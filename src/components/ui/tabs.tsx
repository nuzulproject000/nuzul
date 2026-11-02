import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("scrollbar-none mb-7 flex gap-7 overflow-x-auto border-b border-line", className)} {...props} />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<React.ComponentRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { count?: number }>(({ className, count, children, ...props }, ref) => (
  <TabsPrimitive.Trigger ref={ref} className={cn("flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent py-3.5 text-[13px] text-ink-muted data-[state=active]:border-gold data-[state=active]:font-bold data-[state=active]:text-navy", className)} {...props}>
    {children}
    {count ? <span className="rounded-full bg-soft px-1.5 text-[10px] text-navy">{count}</span> : null}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = TabsPrimitive.Content;

export { Tabs, TabsList, TabsTrigger, TabsContent };
