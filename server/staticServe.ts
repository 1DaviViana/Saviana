import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Serve static files from the build directory in production
 * This implementation is compatible with Railway deployment
 */
export function serveStaticProd(app: Express) {
  try {
    // Create paths that could potentially contain the build files
    // Handles different environments like Railway, local dev, etc.
    const possiblePaths = [
      path.resolve(__dirname, "../dist/public"),     // Standard path from repo root
      path.resolve(__dirname, "../public"),          // Alternative path
      path.resolve(__dirname, "../../public"),       // Another possible path
      path.resolve(process.cwd(), "dist/public"),    // From current working directory
      path.resolve(process.cwd(), "public")          // Fallback path
    ];
    
    // Find the first path that exists
    const distPath = possiblePaths.find(p => fs.existsSync(p));
    
    if (!distPath) {
      console.warn("⚠️ Warning: Could not find static files directory. Paths checked:", possiblePaths);
      console.warn("The application may not serve frontend files correctly.");
      return; // Skip static file setup, allow API to work
    }
    
    console.log(`📁 Serving static files from: ${distPath}`);
    
    // Serve static files
    app.use(express.static(distPath));
    
    // Check if index.html exists in the directory
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      // Fallback for SPA routing
      app.use("*", (_req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      console.warn(`⚠️ Warning: index.html not found at ${indexPath}`);
    }
  } catch (error) {
    console.error("❌ Error in serveStaticProd:", error);
    // Don't throw - allow the app to continue running with API-only functionality
  }
}