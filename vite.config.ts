import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

/* Vendor groups cached independently of app code (entries are package-path prefixes). */
const CHUNKS: Record<string, string[]> = {
  react: ["react/", "react-dom/", "react-router/", "scheduler/"],
  data: ["@tanstack/", "axios/", "zustand/"],
  forms: ["react-hook-form/", "yup/", "@hookform/"],
  charts: ["recharts/", "d3-", "victory-vendor/"],
  maps: ["leaflet/", "react-leaflet/", "@react-leaflet/"],
};

export const config: UserConfig = {
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  server: { port: Number(process.env.PORT) || 5173 },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          return Object.entries(CHUNKS).find(([, pkgs]) => pkgs.some((p) => id.includes(`/node_modules/${p}`)))?.[0];
        },
      },
    },
  },
};

export default defineConfig(config);
