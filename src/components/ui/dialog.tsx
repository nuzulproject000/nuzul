import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;

function DialogContent({ className, children, size = "md", title, description, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: "md" | "lg" | "xl"; title: React.ReactNode; description?: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-navy/65 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-[101] max-h-[92vh] w-full overflow-y-auto bg-ivory p-6 shadow-lift sm:p-8 focus:outline-none",
          "bottom-0 left-0 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
          size === "md" && "sm:max-w-[560px]", size === "lg" && "sm:max-w-[860px]", size === "xl" && "sm:max-w-[1040px]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <DialogPrimitive.Title className="text-2xl font-bold tracking-tight text-navy">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close className="rounded-full p-1 text-navy hover:opacity-80" aria-label={t("common.close")}><X className="size-5" /></DialogPrimitive.Close>
        </div>
        {description ? <DialogPrimitive.Description className="mb-4 text-[13px] text-ink-muted">{description}</DialogPrimitive.Description> : <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-6 flex flex-wrap justify-end gap-2.5", className)} {...props} />;
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogFooter };
