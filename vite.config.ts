import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * The mock must never ship.
 *
 * The mock answers with fixture data and a sign-in that accepts any code, so a
 * production bundle built with it on would show fake patients and let anyone
 * in. The build fails here rather than shipping that.
 */
function assertMockIsOffForProduction(mode: string) {
  if (mode !== "production") return;
  if (process.env.VITE_USE_MOCK !== "false") {
    throw new Error(
      "VITE_USE_MOCK is on in a production build. The mock answers with fixture data and a " +
        "sign-in that accepts any code, so it must never ship. Build with VITE_USE_MOCK=false.",
    );
  }
}

export default defineConfig(({ command }) => {
  assertMockIsOffForProduction(command === "build" ? "production" : process.env.NODE_ENV ?? "development");

  return {
    plugins: [react()],
    resolve: {
      alias: { "@": path.resolve(root, "src") },
    },
    server: {
      port: 3100,
      strictPort: true,
      // The Java API serves the data; the SPA calls it under /api.
      proxy: {
        "/api": {
          target: process.env.VITE_API_TARGET ?? "http://127.0.0.1:8080",
          changeOrigin: true,
        },
      },
    },
    preview: { port: 3100, strictPort: true },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/tests/setup.ts"],
    },
  };
});
