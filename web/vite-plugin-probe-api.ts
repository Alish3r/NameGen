/**
 * Vite plugin to add /api/probe-domains route.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type { Plugin } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function probeApiPlugin(): Plugin {
  return {
    name: 'probe-api',
    enforce: 'pre', // Run before other plugins so our middleware handles /api first
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (path !== '/api/probe-domains' || req.method !== 'POST') {
          return next();
        }
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          req.on('data', (c: Buffer) => chunks.push(c));
          req.on('end', () => resolve());
          req.on('error', reject);
        });
        const body = Buffer.concat(chunks).toString('utf-8');
        let domains: string[];
        try {
          const parsed = JSON.parse(body || '{}');
          domains = Array.isArray(parsed.domains) ? parsed.domains : [];
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }
        if (domains.length === 0 || domains.length > 1000) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'domains array required (1-1000 items)' }));
          return;
        }
        try {
          const modulePath = pathToFileURL(
            resolve(__dirname, '../dist/domain-probe/index.js')
          ).href;
          const { probeDomains } = await import(modulePath);
          const results = await probeDomains(domains, {
            concurrency: 15,
            dnsTimeoutMs: 4000,
            httpTimeoutMs: 2500,
          });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ results }));
        } catch (err) {
          console.warn('[probe-api]', (err as Error)?.message);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: (err as Error)?.message ?? 'Probe failed' }));
        }
      });
    },
  };
}
