/// <reference types="vite/client" />

import { ServerOptions as OriginalServerOptions } from 'vite';

interface ImportMetaEnv {
  readonly VITE_GOOGLE_PLACES_API_KEY: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'vite' {
  interface ServerOptions extends OriginalServerOptions {
    // Permitir qualquer valor booleano para allowedHosts para compatibilidade com o código existente
    allowedHosts?: boolean | string[] | undefined;
  }
}