/* Mock backend entry: registers all routes and exposes an Axios adapter. */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import "./handlers-guest";
import "./handlers-ops";
import "./handlers-shared";
import { dispatch } from "./router";

const latency = () => (import.meta.env.MODE === "test" ? 0 : 250 + Math.random() * 300);

export const mockAdapter: AxiosAdapter = (config: InternalAxiosRequestConfig) =>
  new Promise((resolve, reject) => {
    const qs = new URLSearchParams();
    Object.entries(config.params ?? {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) return;
      qs.set(k, Array.isArray(v) ? v.join(",") : String(v));
    });
    const url = `${config.url ?? ""}${qs.toString() ? `?${qs}` : ""}`;
    const body = typeof config.data === "string" ? JSON.parse(config.data || "null") : config.data;
    setTimeout(() => {
      const auth = String(config.headers?.Authorization ?? config.headers?.authorization ?? "");
      const { status, data } = dispatch(config.method ?? "get", url, body, auth.startsWith("Bearer ") ? auth.slice(7) : null);
      const response: AxiosResponse = { data, status, statusText: String(status), headers: {}, config, request: {} };
      if (status >= 200 && status < 300) resolve(response);
      else reject(Object.assign(new Error((data as { message?: string })?.message ?? "Request failed"), { isAxiosError: true, response, config }));
    }, latency());
  });

export { resetDb, reloadDb, DB_KEY } from "./db";
