/* Single Axios instance for the whole app. With VITE_USE_MOCKS=true (default)
 * requests are served by the in-browser mock backend; set it to "false" and
 * VITE_API_BASE_URL to a real server and no UI code needs to change. */
import axios, { AxiosError } from "axios";
import type { ApiError } from "@/types/api";
import { getToken } from "./auth-token";

const useMocks = import.meta.env.VITE_USE_MOCKS !== "false";

export const api = axios.create({
  baseURL: useMocks ? "/v1" : import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
  // Lazily loaded so production builds with a real API never ship the mock backend.
  adapter: useMocks ? (config) => import("@/mocks/server").then((m) => m.mockAdapter(config)) : undefined,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["Accept-Language"] = document.documentElement.lang || "en";
  return config;
});

/** A 401 while holding a token means the session ended (expired / revoked) — tell the app. */
api.interceptors.response.use(undefined, (err: AxiosError<ApiError>) => {
  if (err.response?.status === 401 && getToken() && typeof window !== "undefined") window.dispatchEvent(new CustomEvent("nuzul:session-expired"));
  return Promise.reject(err);
});

/** Normalise every failure into the ApiError contract. */
export function toApiError(e: unknown): ApiError {
  const err = e as AxiosError<ApiError>;
  if (err?.response?.data && typeof err.response.data === "object" && "code" in err.response.data) return err.response.data;
  if (err?.code === "ECONNABORTED") return { status: 0, code: "TIMEOUT", message: "The request timed out. Check your connection and try again." };
  return { status: err?.response?.status ?? 0, code: "NETWORK", message: "We couldn’t reach Nuzul. Check your connection and try again." };
}

export async function unwrap<T>(p: Promise<{ data: T }>): Promise<T> {
  try { return (await p).data; } catch (e) { throw toApiError(e); }
}
