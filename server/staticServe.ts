import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Serve static files from the build directory in production
 */
export function serveStaticProd(app: Express) {
  // Create a path that points to the build directory
  const distPath = path.resolve(__dirname, "../dist/public");
  
  // Check if the directory exists
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  
  // Serve static files
  app.use(express.static(distPath));
  
  // Fallback for SPA routing
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}