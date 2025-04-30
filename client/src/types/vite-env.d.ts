/// <reference types="vite/client" />

import { ServerOptions as OriginalServerOptions } from 'vite';

declare module 'vite' {
  interface ServerOptions extends OriginalServerOptions {
    // Permitir valor booleano para allowedHosts para compatibilidade
    allowedHosts?: boolean | true | string[] | undefined;
  }
}