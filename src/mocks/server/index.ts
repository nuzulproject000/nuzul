/* Mock backend entry: registers all routes and exposes an Axios adapter. */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import "./handlers-guest";
import "./handlers-ops";
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
      const { status, data } = dispatch(config.method ?? "get", url, body);
      const response: AxiosResponse = { data, status, statusText: String(status), headers: {}, config, request: {} };
      if (status >= 200 && status < 300) resolve(response);
      else reject(Object.assign(new Error((data as { message?: string })?.message ?? "Request failed"), { isAxiosError: true, response, config }));
    }, latency());
  });

export { resetDb } from "./db";
