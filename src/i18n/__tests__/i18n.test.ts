import { describe, expect, it } from "vitest";
import en from "@/i18n/locales/en";
import ar from "@/i18n/locales/ar";

const keys = (o: object, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? keys(v, `${p}${k}.`) : [`${p}${k}`.replace(/_(zero|one|two|few|many|other)$/, "")]));

describe("translations (§57)", () => {
  it("Arabic covers every English key", () => {
    const arKeys = new Set(keys(ar));
    expect([...new Set(keys(en))].filter((k) => !arKeys.has(k))).toEqual([]);
  });
  it("keeps interpolation variables", () => {
    const vars = (s: string) => (s.match(/{{\w+}}/g) ?? []).sort().join();
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, p = ""): string[] => Object.entries(a).flatMap(([k, v]) => {
      const w = b[k];
      if (typeof v === "string" && typeof w === "string") return vars(v) === vars(w) || /_(one|other)$/.test(k) ? [] : [`${p}${k}`];
      return v && typeof v === "object" && w && typeof w === "object" && !Array.isArray(v) ? walk(v as Record<string, unknown>, w as Record<string, unknown>, `${p}${k}.`) : [];
    });
    expect(walk(en, ar as unknown as Record<string, unknown>)).toEqual([]);
  });
});
