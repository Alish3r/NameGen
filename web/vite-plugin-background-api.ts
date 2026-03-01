/**
 * Vite plugin to add /api/background route. API key stays server-side.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import type { Plugin } from 'vite';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: resolve(__dirname, '.env.local') });
import { handleBackgroundRequest } from './server/background-handler';

export function backgroundApiPlugin(): Plugin {
  return {
    name: 'background-api',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/background' || req.method !== 'POST') {
          return next();
        }
        try {
          await handleBackgroundRequest(req as Parameters<typeof handleBackgroundRequest>[0], res as Parameters<typeof handleBackgroundRequest>[1]);
        } catch (err) {
          console.warn('[background-api]', (err as Error)?.message);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: (err as Error)?.message ?? 'Background fetch failed' }));
        }
      });
    },
  };
}
