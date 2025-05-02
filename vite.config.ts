import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Detecta se está em produção
const isProduction = process.env.NODE_ENV === "production";
const isReplit = process.env.REPL_ID !== undefined;

export default defineConfig(async () => ({
  base: "/Saviana/", // Necessário para GitHub Pages funcionar
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(
      !isProduction && isReplit
        ? [
            (await import("@replit/vite-plugin-cartographer")).cartographer()
          ]
        : []
    )
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
}));
