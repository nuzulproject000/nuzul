/* Tiny request router for the mock backend. Routes are declared like a real
 * REST server (method + path pattern) so they read as API documentation. */
import type { ApiError } from "@/types/api";

export type MockRequest = { method: string; path: string; params: Record<string, string>; query: URLSearchParams; body: unknown };
export type MockResponse = { status: number; data: unknown };
type Handler = (req: MockRequest) => unknown;

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public fieldErrors?: Record<string, string>) { super(message); }
  toJSON(): ApiError { return { status: this.status, code: this.code, message: this.message, fieldErrors: this.fieldErrors }; }
}
export const notFound = (what = "Resource") => new HttpError(404, "NOT_FOUND", `${what} not found`);
export const invalid = (fieldErrors: Record<string, string>, message = "Validation failed") => new HttpError(422, "VALIDATION_ERROR", message, fieldErrors);

const routes: { method: string; re: RegExp; keys: string[]; handler: Handler }[] = [];

export function route(method: string, pattern: string, handler: Handler) {
  const keys: string[] = [];
  const re = new RegExp("^" + pattern.replace(/:([a-zA-Z]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "/?$");
  routes.push({ method: method.toUpperCase(), re, keys, handler });
}

/** Bearer token of the request being handled (handlers are synchronous, so this is safe). */
let currentToken: string | null = null;
export const requestToken = () => currentToken;

export function dispatch(method: string, url: string, body: unknown, token: string | null = null): MockResponse {
  currentToken = token;
  const u = new URL(url, "http://mock.local");
  const path = u.pathname.replace(/^\/v1/, "");
  for (const r of routes) {
    if (r.method !== method.toUpperCase()) continue;
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    try {
      const data = r.handler({ method, path, params, query: u.searchParams, body });
      return { status: method.toUpperCase() === "POST" ? 201 : 200, data };
    } catch (e) {
      if (e instanceof HttpError) return { status: e.status, data: e.toJSON() };
      return { status: 500, data: { status: 500, code: "INTERNAL", message: (e as Error).message } satisfies ApiError };
    }
  }
  return { status: 404, data: { status: 404, code: "NO_ROUTE", message: `No mock route for ${method} ${path}` } satisfies ApiError };
}

export function paginate<T>(items: T[], query: URLSearchParams, defaultSize = 12) {
  const page = Math.max(1, Number(query.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.get("pageSize") ?? defaultSize)));
  const total = items.length;
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
