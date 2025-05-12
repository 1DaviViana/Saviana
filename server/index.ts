// server/index.ts

import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite"; // Usado em desenvolvimento
// import { serveStaticProd } from "./staticServe"; // Não vamos mais usar diretamente aqui
import { fileURLToPath } from 'url';
import path from 'path';

// Polyfill para import.meta.dirname
// ... (o código do polyfill permanece o mesmo) ...
if (import.meta && typeof import.meta.url === 'string') {
  if (typeof import.meta.dirname !== 'string' || !import.meta.dirname) {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      // @ts-ignore
      Object.defineProperty(import.meta, 'dirname', {
        value: __dirname,
        writable: false,
        enumerable: true,
        configurable: true
      });
      console.log(`[Polyfill] Adicionado import.meta.dirname = ${__dirname}`);
    } catch (e) {
      console.warn(`[Polyfill] Falha ao criar import.meta.dirname a partir de import.meta.url (${import.meta.url}):`, e);
    }
  } else {
    console.log(`[Polyfill] import.meta.dirname já existe: ${import.meta.dirname}. Polyfill não aplicado.`);
  }
} else {
  console.warn("[Polyfill] import.meta.url não está disponível ou não é uma string. Não foi possível tentar o polyfill para import.meta.dirname.");
}


// Configurar origens permitidas para CORS
const allowedOrigins = [
  // Origens de desenvolvimento
  'http://localhost:3000', // Se seu frontend roda na 3000
  'http://localhost:5000', // Se seu frontend roda na 5000 ou para testes diretos
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  // Adicione a origem do seu frontend no GitHub Pages
  'https://1daviviana.github.io',
  // Origens do Replit (expressão regular para cobrir subdomínios dinâmicos)
  /\.replit\.dev$/,
  // Origens Railway (expressão regular para cobrir subdomínios dinâmicos)
  /\.railway\.app$/
];

// Configuração do CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Permitir requisições sem origem (como chamadas de API locais, Postman, etc.)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem bloqueada: ${origin}`);
      callback(new Error(`A origem ${origin} não é permitida por CORS.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

const app = express();

app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de logging de requisição
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const originHeader = req.headers.origin || 'N/A';
    console.log(
      `[Request] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - Origin: ${originHeader} - IP: ${clientIp}`
    );
  });
  next();
});


(async () => {
  const server = await registerRoutes(app);

  // Middleware de tratamento de erro
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("❌ Erro capturado pelo manipulador de erros:", {
      status,
      message,
      stack: (err.message && err.message.includes("Não permitido por CORS")) ? "CORS rejection" : err.stack,
      path: req.path,
      method: req.method,
      origin: req.headers.origin,
      timestamp: new Date().toISOString()
    });

    res.status(status).json({
      error: {
        message,
        status,
      },
      timestamp: new Date().toISOString(),
      path: req.path
    });
  });

  const currentEnv = process.env.NODE_ENV || 'development';
  log(`🔧 Ambiente atual: ${currentEnv}`);

  if (currentEnv === "development") {
    log("🛠️ Configurando Vite para desenvolvimento...");
    await setupVite(app, server);
  } else {
    log("📦 Backend em produção. Não servindo arquivos estáticos.");
    // serveStaticProd(app); // <-- LINHA COMENTADA/REMOVIDA
    // Opcional: Você também pode remover a importação de 'serveStaticProd' no topo se não for mais usada.
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
    if (currentEnv === 'production') {
      log(`💡 Em produção, certifique-se que seu app responde a health checks na porta ${port}.`);
      // Verifique se /api/health (ou similar) está definido em registerRoutes
      // Se não, adicione um aqui:
      // app.get('/api/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));
    }
  });

})().catch(err => {
  console.error("🚨 Falha crítica ao iniciar o servidor:", err);
  process.exit(1);
});
