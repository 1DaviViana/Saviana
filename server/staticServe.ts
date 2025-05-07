import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Serve static files from the build directory in production
 * Otimizado para Railway e outros provedores de hospedagem
 */
export function serveStaticProd(app: Express) {
  try {
    // Detectar ambiente e ajustar comportamento conforme necessário
    const isProduction = process.env.NODE_ENV === 'production';
    const isRailway = process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_SERVICE_NAME;
    
    console.log(`[StaticServe] Environment: NODE_ENV=${process.env.NODE_ENV}, Railway=${!!isRailway}`);
    console.log(`[StaticServe] Current working directory: ${process.cwd()}`);
    
    // Obter o diretório atual baseado em import.meta.url (ESM)
    let currentDir;
    try {
      const __filename = fileURLToPath(import.meta.url);
      currentDir = path.dirname(__filename);
      console.log(`[StaticServe] Current directory from import.meta.url: ${currentDir}`);
    } catch (e) {
      console.error(`[StaticServe] Error resolving current directory: ${e}`);
      currentDir = process.cwd();
    }

    // Caminhos possíveis para os arquivos estáticos, em ordem de prioridade
    const possiblePaths = [
      // Caminhos específicos para Railway
      path.join(process.cwd(), 'dist/public'),
      path.join(process.cwd(), 'dist'),
      
      // Caminhos relativos ao arquivo atual
      path.join(currentDir, '../dist/public'),
      path.join(currentDir, '../public'),
      
      // Caminhos adicionais específicos para outros ambientes
      path.join(process.cwd(), 'public')
    ];
    
    console.log(`[StaticServe] Checking these paths: ${JSON.stringify(possiblePaths)}`);
    
    // Encontrar o primeiro caminho válido
    let staticPath = null;
    for (const testPath of possiblePaths) {
      try {
        if (fs.existsSync(testPath)) {
          // Verificar se há arquivos estáticos neste diretório
          const hasFiles = fs.readdirSync(testPath).length > 0;
          if (hasFiles) {
            staticPath = testPath;
            console.log(`[StaticServe] Found valid static path with files: ${staticPath}`);
            break;
          } else {
            console.log(`[StaticServe] Path exists but is empty: ${testPath}`);
          }
        }
      } catch (e) {
        console.warn(`[StaticServe] Error checking path ${testPath}: ${e}`);
      }
    }
    
    if (!staticPath) {
      console.warn("[StaticServe] No valid static files directory found. API endpoints will work, but static files won't be served.");
      return;
    }
    
    // Configurar middleware para servir arquivos estáticos
    console.log(`📁 [StaticServe] Serving static files from: ${staticPath}`);
    app.use(express.static(staticPath, {
      // Opções para melhorar o desempenho em produção
      maxAge: isProduction ? '1d' : 0, // Cache de 1 dia em produção
      etag: true,
      lastModified: true
    }));
    
    // Configurar fallback para SPA (Single Page Application)
    const indexPath = path.join(staticPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      console.log(`[StaticServe] Found index.html at ${indexPath}, configuring SPA routing`);
      
      // Rotear todas as requisições não encontradas para index.html (exceto API e arquivos estáticos)
      app.use('*', (req, res, next) => {
        // Ignorar requisições para API e arquivos estáticos
        if (req.originalUrl.startsWith('/api/') || 
            req.originalUrl.includes('.')) {
          return next();
        }
        
        // Servir o index.html para todas as outras rotas
        res.sendFile(indexPath);
      });
    } else {
      console.warn(`[StaticServe] index.html not found at ${indexPath}. SPA routing won't work.`);
    }
    
  } catch (error: any) {
    console.error("[StaticServe] Error configuring static file serving:", {
      message: error.message,
      stack: isProduction ? '(hidden in production)' : error.stack
    });
    console.warn("[StaticServe] Proceeding without static file serving due to error.");
  }
}