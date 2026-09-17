import path from 'node:path';
import fs from 'node:fs';
import { ROOT_DIR } from './db/repo';

/** Minimal .env loader — Replit uses Secrets, local dev uses a .env file. */
function loadDotEnv(): void {
  const file = path.join(ROOT_DIR, '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}
loadDotEnv();

export const env = {
  isProd: process.env.NODE_ENV === 'production',
  /** Replit injects PORT. One process serves the SPA *and* Socket.IO (§2). */
  port: Number(process.env.PORT ?? process.env.SERVER_PORT ?? 5174),
  host: '0.0.0.0',
  adminPin: process.env.ADMIN_PIN ?? '1970',
  driverPin: process.env.DRIVER_PIN ?? '4040',
  jwtSecret: process.env.JWT_SECRET ?? 'darbi-dev-secret-change-me',
  tokenTtl: '12h' as const,
  /** Authoritative tick rate for trips (§8.3). */
  tickMs: Number(process.env.TICK_MS ?? 250),
  clientDist: path.join(ROOT_DIR, 'dist', 'client'),
};

if (env.isProd && env.jwtSecret === 'darbi-dev-secret-change-me') {
  console.warn('[darbi] JWT_SECRET is unset — set it in Replit Secrets before a public demo.');
}
