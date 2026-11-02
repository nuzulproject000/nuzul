import { defineConfig, mergeConfig } from "vitest/config";
import { config } from "./vite.config";

export default mergeConfig(
  config,
  defineConfig({
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      testTimeout: 20000,
    },
  }),
);
