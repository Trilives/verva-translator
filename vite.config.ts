import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] }
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: { target: "chrome105", sourcemap: true },
  // `css: true` keeps `?raw` stylesheet imports readable in tests; Vitest stubs
  // them out otherwise.
  test: { css: true }
});
