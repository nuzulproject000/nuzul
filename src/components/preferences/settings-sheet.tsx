/* Mobile bottom sheet with language and currency (opened from the bottom navigation).
 * Closes on backdrop tap, the close button, Escape, or a downward swipe on the handle/header.
 * Reuses the existing preferences store handlers. */
import { useRef, useState, type PointerEvent } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import type { Locale } from "@/types/models";
import { usePreferences } from "@/stores/preferences.store";
import { cn } from "@/lib/utils";
import { CURRENCIES } from "./flags";

const LANGUAGES: { code: Locale; label: string; lang: string }[] = [
  { code: "en", label: "English", lang: "en" },
  { code: "ar", label: "العربية", lang: "ar" },
];

function Option({ selected, onSelect, children, lang }: { selected: boolean; onSelect: () => void; children: React.ReactNode; lang?: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} lang={lang} onClick={onSelect}
      className={cn("flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3.5 text-start text-[14px] text-navy transition-colors duration-150 hover:bg-soft/70", selected && "bg-soft font-semibold")}>
      <span className="flex flex-1 items-center gap-3">{children}</span>
      {selected && <Check className="size-[18px] text-gold" />}
    </button>
  );
}

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const { locale, setLocale, currency, setCurrency } = usePreferences();
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const down = (e: PointerEvent) => { start.current = e.clientY; (e.target as Element).setPointerCapture?.(e.pointerId); };
  const move = (e: PointerEvent) => { if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current)); };
  const up = () => { if (drag > 80) onOpenChange(false); start.current = null; setDrag(0); };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[110] bg-navy/55 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content
          style={drag ? { transform: `translateY(${drag}px)`, transition: "none" } : undefined}
          className="fixed inset-x-0 bottom-0 z-[111] max-h-[85svh] overflow-y-auto rounded-t-2xl bg-ivory pb-[calc(16px+env(safe-area-inset-bottom))] shadow-lift transition-transform duration-200 focus:outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom"
        >
          <div className="touch-none cursor-grab px-5 pt-2.5 pb-1" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <span aria-hidden className="mx-auto block h-1 w-10 rounded-full bg-line" />
            <div className="mt-3 flex items-center justify-between">
              <DialogPrimitive.Title className="text-lg font-bold text-navy">{t("nav.settings")}</DialogPrimitive.Title>
              <DialogPrimitive.Close className="grid size-9 cursor-pointer place-items-center rounded-full text-navy transition-colors duration-150 hover:bg-soft" aria-label={t("common.close")}><X className="size-5" /></DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">{t("prefs.sheetText")}</DialogPrimitive.Description>
          </div>
          <div className="px-3.5 pt-2">
            <h3 id="ss-lang" className="mb-1.5 px-1.5 text-[10px] font-bold tracking-widest text-gold uppercase">{t("prefs.language")}</h3>
            <div role="radiogroup" aria-labelledby="ss-lang" className="flex flex-col gap-1">
              {LANGUAGES.map((l) => <Option key={l.code} lang={l.lang} selected={locale === l.code} onSelect={() => setLocale(l.code)}>{l.label}</Option>)}
            </div>
            <h3 id="ss-cur" className="mt-5 mb-1.5 px-1.5 text-[10px] font-bold tracking-widest text-gold uppercase">{t("nav.currency")}</h3>
            <div role="radiogroup" aria-labelledby="ss-cur" className="flex flex-col gap-1">
              {CURRENCIES.map(({ code, Flag, nameKey }) => (
                <Option key={code} selected={currency === code} onSelect={() => setCurrency(code)}>
                  <Flag className="h-4 w-6" /><span><b className="font-semibold">{code}</b> <span className="font-normal text-ink-muted">· {t(nameKey)}</span></span>
                </Option>
              ))}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
