import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Suporte a __dirname em ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validação segura de process.cwd()
const resolvedCwd = (() => {
  try {
    const cwd = process.cwd();
    return typeof cwd === "string" && cwd ? cwd : undefined;
  } catch (e: any) {
    console.error("❌ Error getting process.cwd():", e.message);
    return undefined;
  }
})();

console.log(`[StaticServe Init Debug] __dirname: "${__dirname}", process.cwd(): "${resolvedCwd}"`);

export function serveStaticProd(app: Express) {
  try {
    const possiblePaths: string[] = [
      path.resolve(__dirname, "../dist/public"),
      path.resolve(__dirname, "../public"),
      path.resolve(__dirname, "../../public"),
    ];

    if (resolvedCwd) {
      possiblePaths.push(
        path.resolve(resolvedCwd, "dist/public"),
        path.resolve(resolvedCwd, "public")
      );
    }

    console.log("[StaticServe Debug] Checking static directories:", possiblePaths);

    const distPath = possiblePaths.find((p) => {
      try {
        const stat = fs.statSync(p);
        return stat.isDirectory();
      } catch {
        return false;
      }
    });

    if (!distPath) {
      console.warn("⚠️ [StaticServe]: No valid static directory found. Skipping static file serving.");
      return;
    }

    console.log(`📁 [StaticServe] Serving static files from: ${distPath}`);
    app.use(express.static(distPath));

    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      app.use("*", (_req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      console.warn(`⚠️ [StaticServe]: index.html not found at ${indexPath}`);
    }
  } catch (error: any) {
    console.error("❌ Error in serveStaticProd:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    });
    console.warn("[StaticServe] Proceeding without static file serving.");
  }
}
