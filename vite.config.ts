import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

// Suporte para __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Remova as variáveis isProduction e isReplit se não forem usadas em outro lugar,
// mas elas ainda são usadas na lógica do plugin cartographer abaixo.
const isProduction = process.env.NODE_ENV === "production";
const isReplit = process.env.REPL_ID !== undefined;
// const isGitHubPages = process.env.DEPLOY_TARGET === "github"; // Não precisamos mais desta variável aqui

export default defineConfig(async () => ({
  // Deixe a base como '/' por padrão.
  // A flag --base=/Saviana/ no workflow cuidará do deploy no GitHub Pages.
  base: "/",
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Lógica para o plugin cartographer em ambiente de desenvolvimento Replit
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
      // Mantém seus aliases
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  // Aponta para a raiz do seu código de cliente
  root: path.resolve(__dirname, "client"),
  build: {
    // Define o diretório de saída do build
    outDir: path.resolve(__dirname, "dist/public"),
    // Limpa o diretório de saída antes de cada build
    emptyOutDir: true,
  },
}));