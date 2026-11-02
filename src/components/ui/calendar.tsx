import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ar, enGB } from "react-day-picker/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/** React DayPicker styled with Nuzul tokens; RTL + Arabic aware (§57, §71 accessible date picker). */
function Calendar({ className, classNames, ...props }: React.ComponentProps<typeof DayPicker>) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  return (
    <DayPicker
      locale={isAr ? ar : enGB}
      dir={isAr ? "rtl" : "ltr"}
      showOutsideDays={false}
      className={cn("relative text-navy", className)}
      classNames={{
        months: "flex flex-col gap-6 sm:flex-row",
        month: "flex flex-col gap-3",
        month_caption: "flex h-9 items-center justify-center text-sm font-bold",
        nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
        button_previous: "inline-flex size-9 items-center justify-center rounded-full hover:bg-soft disabled:opacity-30 rtl:rotate-180",
        button_next: "inline-flex size-9 items-center justify-center rounded-full hover:bg-soft disabled:opacity-30 rtl:rotate-180",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-10 text-[10px] font-bold uppercase tracking-wider text-ink-muted",
        week: "mt-1 flex w-full",
        day: "relative size-10 p-0 text-center text-[13px]",
        day_button: "size-10 rounded-full hover:bg-soft focus-visible:outline-3 aria-disabled:opacity-30",
        selected: "[&>button]:bg-navy [&>button]:text-white",
        range_start: "rounded-s-full bg-soft",
        range_end: "rounded-e-full bg-soft",
        range_middle: "bg-soft [&>button]:!bg-transparent [&>button]:!text-navy",
        today: "font-bold [&>button]:underline [&>button]:underline-offset-4",
        disabled: "opacity-30",
        outside: "opacity-0",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
