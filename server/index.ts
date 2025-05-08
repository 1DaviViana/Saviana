// server/index.ts

import express, { type Request, Response, NextFunction } from "express";
import cors from 'cors';
import { registerRoutes } from "./routes";
import { setupVite, log } from "./vite"; // Usado em desenvolvimento
import { serveStaticProd } from "./staticServe"; // Usado em produção
import { fileURLToPath } from 'url';
import path from 'path';

// Polyfill para import.meta.dirname
// Algumas versões/configurações do Node.js ou bundlers podem não definir import.meta.dirname.
// Este polyfill tenta criá-lo se import.meta.url estiver disponível.
// A função serveStaticProd em staticServe.ts também tem sua própria lógica robusta
// para encontrar o diretório, então isso é mais uma camada de segurança ou para outras partes do código.
if (import.meta && typeof import.meta.url === 'string') {
  // Verifica se import.meta.dirname já existe e é uma string válida.
  // Node.js >= v20.11.0 ou >= v21.2.0 pode definir import.meta.dirname nativamente.
  if (typeof import.meta.dirname !== 'string' || !import.meta.dirname) {
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);

      // @ts-ignore - Adicionando propriedade dirname para compatibilidade
      Object.defineProperty(import.meta, 'dirname', {
        value: __dirname,
        writable: false, // geralmente polyfills são não-reescritos
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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Adicionar outros métodos se necessário
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Adicionar outros headers se necessário
};

const app = express();

// Railway e outros proxies podem definir X-Forwarded-Proto.
// Confiar no proxy para determinar se a conexão é segura (https), o que é importante para cookies seguros.
app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de logging de requisição (simplificado)
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    // Adicionando mais detalhes ao log, incluindo a origem
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const originHeader = req.headers.origin || 'N/A';
    console.log(
      `[Request] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - Origin: ${originHeader} - IP: ${clientIp}`
    );
  });
  next();
});


(async () => {
  const server = await registerRoutes(app); // Supondo que createServer é chamado dentro de registerRoutes

  // Middleware de tratamento de erro (deve ser o último middleware `app.use`)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => { // Adicionado 'req' e 'next' para conformidade
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("❌ Erro capturado pelo manipulador de erros:", {
      status,
      message,
      // Evitar logar o stack completo de erros CORS "Não permitido por CORS" para não poluir os logs
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
    // Não chamar next(err) aqui, pois o erro já foi tratado.
  });

  const currentEnv = process.env.NODE_ENV || 'development';
  log(`🔧 Ambiente atual: ${currentEnv}`);

  if (currentEnv === "development") {
    log("🛠️ Configurando Vite para desenvolvimento...");
    await setupVite(app, server); // setupVite espera o servidor HTTP, não o app Express diretamente
  } else {
    log("📦 Servindo arquivos estáticos para produção...");
    serveStaticProd(app);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

  server.listen({ // O servidor HTTP (retornado por registerRoutes) é quem deve escutar
    port,
    host: "0.0.0.0", // Importante para Railway e containers
    // reusePort: true, // Geralmente não é necessário e pode causar problemas em alguns cenários. Remova se não tiver um motivo específico.
  }, () => {
    log(`🚀 Servidor rodando em http://0.0.0.0:${port}`);
    if (currentEnv === 'production') {
      // Adicionar um endpoint de health check simples se não existir em routes.ts
      // app.get('/api/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));
      log(`💡 Em produção, certifique-se que seu app responde a health checks na porta ${port}.`);
    }
  });

})().catch(err => {
  console.error("🚨 Falha crítica ao iniciar o servidor:", err);
  process.exit(1);
});