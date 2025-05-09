import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

// Suporte para __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";
const isReplit = process.env.REPL_ID !== undefined;

export default defineConfig(async () => ({
  base: "/Saviana/", // Caminho correto para GitHub Pages
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
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"), // compatível com seu serveStaticProd
    emptyOutDir: true,
  },
}));
