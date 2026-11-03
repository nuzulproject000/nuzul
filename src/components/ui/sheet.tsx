import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;

/** Side drawer (filters) — full-screen on phones. */
function SheetContent({ className, children, title, footer, side = "end", ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: React.ReactNode; footer?: React.ReactNode; side?: "end" | "start" }) {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[110] bg-navy/55 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content className={cn("fixed inset-y-0 z-[111] flex w-full max-w-[560px] flex-col bg-ivory shadow-lift focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right-10 rtl:data-[state=open]:slide-in-from-left-10", side === "end" ? "end-0" : "start-0", className)} {...props}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <DialogPrimitive.Title className="text-xl font-bold text-navy">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          <DialogPrimitive.Close className="rounded-full p-1 hover:opacity-80" aria-label={t("common.close")}><X className="size-5" /></DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-6">{children}</div>
        {footer && <div className="flex items-center justify-between border-t border-line px-6 py-4">{footer}</div>}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetContent };
