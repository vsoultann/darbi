/** Shared JWT helpers for the admin (§8.4) and driver views. */
import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';

export type Role = 'admin' | 'driver';

export interface DarbiToken {
  sub: string;
  role: Role;
}

export function issueToken(role: Role): string {
  return jwt.sign({ sub: role, role } satisfies DarbiToken, env.jwtSecret, { expiresIn: env.tokenTtl });
}

export function verifyToken(token: string): DarbiToken | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === 'string') return null;
    const role = decoded.role === 'admin' || decoded.role === 'driver' ? decoded.role : null;
    if (!role) return null;
    return { sub: String(decoded.sub ?? role), role };
  } catch {
    return null;
  }
}

export function timingSafeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    // Still burn a comparison so the response time does not leak the length.
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

/** 5 attempts per 10 minutes per IP (§8.4). */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = req.ip ?? 'unknown';
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }
  entry.count += 1;
  if (entry.count > MAX_ATTEMPTS) {
    res.status(429).json({ error: 'too_many_attempts', retryInSeconds: Math.ceil((entry.resetAt - now) / 1000) });
    return;
  }
  next();
}

export function clearRateLimit(req: Request): void {
  attempts.delete(req.ip ?? 'unknown');
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const decoded = token ? verifyToken(token) : null;
    if (!decoded || !roles.includes(decoded.role)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    (req as Request & { auth?: DarbiToken }).auth = decoded;
    next();
  };
}
