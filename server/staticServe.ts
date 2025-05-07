import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Variáveis para armazenar __dirname e process.cwd() de forma segura
let resolvedDirname: string | undefined;
let resolvedCwd: string | undefined;

// Bloco try-catch para inicializar __dirname
try {
  const currentFileUrl = import.meta.url;
  if (typeof currentFileUrl !== 'string' || !currentFileUrl) {
    console.error("❌ Critical [StaticServe Init]: import.meta.url is not a valid string or is empty. __dirname cannot be determined reliably.");
    // Deixar resolvedDirname como undefined
  } else {
    const currentFilePath = fileURLToPath(currentFileUrl); // Pode lançar erro se currentFileUrl não for um file URL válido
    resolvedDirname = path.dirname(currentFilePath);
    if (typeof resolvedDirname !== 'string') {
        console.error(`❌ Critical [StaticServe Init]: path.dirname did not return a string for __dirname. Got: ${typeof resolvedDirname}`);
        resolvedDirname = undefined;
    }
  }
} catch (e: any) {
  console.error("❌ Critical [StaticServe Init]: Error resolving __dirname from import.meta.url:", e.message);
  resolvedDirname = undefined; // Garantir que é undefined em caso de erro
}

// Bloco try-catch para inicializar process.cwd()
try {
  resolvedCwd = process.cwd();
  if (typeof resolvedCwd !== 'string' || !resolvedCwd) {
      console.error(`❌ Critical [StaticServe Init]: process.cwd() did not return a valid string or is empty. Got: ${typeof resolvedCwd}, Value: "${resolvedCwd}"`);
      resolvedCwd = undefined; // Garantir que é undefined se não for string válida
  }
} catch (e: any) {
  console.error("❌ Critical [StaticServe Init]: Error getting process.cwd():", e.message);
  resolvedCwd = undefined; // Garantir que é undefined em caso de erro
}

console.log(`[StaticServe Init Debug] Initial resolvedDirname: "${resolvedDirname}", Initial resolvedCwd: "${resolvedCwd}"`);

export function serveStaticProd(app: Express) {
  try {
    const possiblePaths: string[] = [];

    if (typeof resolvedDirname === 'string' && resolvedDirname) {
        possiblePaths.push(path.resolve(resolvedDirname, "../dist/public"));
        possiblePaths.push(path.resolve(resolvedDirname, "../public"));
        possiblePaths.push(path.resolve(resolvedDirname, "../../public"));
    } else {
        console.warn("[StaticServe] Skipping paths based on __dirname because it's invalid or undefined.");
    }

    if (typeof resolvedCwd === 'string' && resolvedCwd) {
        possiblePaths.push(path.resolve(resolvedCwd, "dist/public"));
        possiblePaths.push(path.resolve(resolvedCwd, "public"));
    } else {
        console.warn("[StaticServe] Skipping paths based on process.cwd() because it's invalid or undefined.");
    }

    if (possiblePaths.length === 0) {
        console.warn("⚠️ Warning [StaticServe]: No base directories (__dirname or process.cwd()) were valid. Cannot search for static files directory.");
        return; // Não há como encontrar arquivos estáticos
    }

    console.log("[StaticServe Debug] Attempting to find static directory from possible paths:", possiblePaths);

    const distPath = possiblePaths.find(p => {
        if (typeof p !== 'string' || !p) { // Segurança extra
            console.warn(`[StaticServe Debug] Invalid path string encountered in possiblePaths: "${p}"`);
            return false;
        }
        try {
            return fs.existsSync(p);
        } catch (e: any) {
            // fs.existsSync pode lançar erro se o path for inválido (ex: null byte), embora path.resolve deva prevenir isso.
            console.warn(`[StaticServe Debug] Error calling fs.existsSync on path '${p}': ${e.message}`);
            return false;
        }
    });

    if (typeof distPath !== 'string' || !distPath) {
      console.warn("⚠️ Warning [StaticServe]: Could not find a valid static files directory. Paths checked:", possiblePaths);
      if (distPath !== undefined) { // Log se distPath for algo inesperado mas não undefined
          console.warn(`[StaticServe Debug] distPath was found but deemed invalid. Type: ${typeof distPath}, Value: "${distPath}"`);
      }
      console.warn("[StaticServe] The application may not serve frontend files correctly.");
      return;
    }

    console.log(`📁 [StaticServe] Serving static files from: ${distPath}`);

    // Serve static files
    app.use(express.static(distPath));

    // Fallback for SPA routing
    const indexPath = path.resolve(distPath, "index.html"); // distPath é garantidamente uma string válida aqui
    if (fs.existsSync(indexPath)) {
      app.use("*", (_req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      console.warn(`⚠️ Warning [StaticServe]: index.html not found at ${indexPath}`);
    }
  } catch (error: any) {
    // Este catch deveria pegar qualquer erro síncrono ocorrido no bloco try acima.
    console.error("❌ Error in serveStaticProd (main try-catch block):", {
        message: error.message,
        stack: error.stack,
        code: error.code, // Adiciona o código do erro, se houver (ex: 'ERR_INVALID_ARG_TYPE')
        name: error.name, // Adiciona o nome do erro (ex: 'TypeError')
        errno: error.errno, // Para erros de sistema
        syscall: error.syscall // Para erros de sistema
    });
    console.warn("[StaticServe] Proceeding without static file serving due to error.");
    // Não relançar o erro; permite que a API continue funcionando se possível.
  }
}