/// <reference types="vite/client" />

import { ServerOptions as OriginalServerOptions } from 'vite';

declare module 'vite' {
  interface ServerOptions extends OriginalServerOptions {
    // Permitir qualquer valor booleano para allowedHosts para compatibilidade com o código existente
    allowedHosts?: boolean | string[] | undefined;
  }
}