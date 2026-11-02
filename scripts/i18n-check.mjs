// Lists translation keys used in src/ that are missing from en.ts (and keys in en missing from ar).
// Usage: node scripts/i18n-check.mjs   (Node ≥ 22.18)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { pathToFileURL } from "node:url";
// Node ≥22.18 strips TypeScript types natively; the locale files use only erasable syntax.
const load = async (f) => (await import(pathToFileURL(f).href)).default;
const flat = (o, p = "", out = new Set()) => { for (const [k, v] of Object.entries(o)) { const key = p ? `${p}.${k}` : k; if (v && typeof v === "object" && !Array.isArray(v)) flat(v, key, out); else out.add(key.replace(/_(zero|one|two|few|many|other)$/, "")); } return out; };
const en = flat(await load("src/i18n/locales/en.ts"));
const ar = flat(await load("src/i18n/locales/ar.ts"));
const files = []; const walk = (d) => readdirSync(d).forEach((f) => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) && files.push(p); }); walk("src");
const used = new Map();
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) if (m[1].includes(".")) used.set(m[1], f);
const missing = [...used].filter(([k]) => !en.has(k) && ![...en].some((e) => e.startsWith(k + ".")));
console.log("MISSING_IN_EN", missing.length); missing.forEach(([k, f]) => console.log(k, "\t", f));
const arMissing = [...en].filter((k) => !ar.has(k)); console.log("MISSING_IN_AR", arMissing.length); arMissing.slice(0, 50).forEach((k) => console.log(k));
