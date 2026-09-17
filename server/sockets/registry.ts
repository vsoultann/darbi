/**
 * Live session registry (§8.1).
 *
 * Every client that opens /track or /lock registers and gets a short code such as
 * `DRB-4K7X`. The admin console lists these and targets commands at exactly one of
 * them (or broadcasts to all).
 */
import type { Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  DemoSession,
  Lang,
  RegisterPayload,
  ServerToClientEvents,
} from '../../shared/types';
import * as repo from '../db/repo';
import type { DarbiServer } from './tripTicker';

export const ADMIN_ROOM = 'admins';

/** Unambiguous alphabet — no O/0/I/1 to misread over a projector. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  const device = /iPad/i.test(ua)
    ? 'iPad'
    : /iPhone/i.test(ua)
      ? 'iPhone'
      : /Android/i.test(ua)
        ? 'Android'
        : /Mobile/i.test(ua)
          ? 'Mobile'
          : 'Desktop';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /OPR\//i.test(ua)
      ? 'Opera'
      : /Chrome\//i.test(ua) && !/Chromium/i.test(ua)
        ? 'Chrome'
        : /Firefox\//i.test(ua)
          ? 'Firefox'
          : /Safari\//i.test(ua)
            ? 'Safari'
            : 'Browser';
  const os = /iPhone OS|iOS|iPad/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
      ? 'Android'
      : /Mac OS X/i.test(ua)
        ? 'macOS'
        : /Windows/i.test(ua)
          ? 'Windows'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Unknown';
  return { device, browser, os };
}

export class SessionRegistry {
  private byCode = new Map<string, DemoSession>();
  private bySocket = new Map<string, string>();

  constructor(private io: DarbiServer) {}

  private nextCode(): string {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      let suffix = '';
      for (let i = 0; i < 4; i += 1) suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      const code = `DRB-${suffix}`;
      if (!this.byCode.has(code)) return code;
    }
    return `DRB-${Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  register(
    socket: Socket<ClientToServerEvents, ServerToClientEvents>,
    payload: RegisterPayload,
  ): DemoSession {
    const existingCode = this.bySocket.get(socket.id);
    const code = existingCode ?? this.nextCode();
    const ua = payload.userAgent ?? '';
    const { device, browser, os } = parseUserAgent(ua);
    const now = Date.now();

    const session: DemoSession = {
      sessionCode: code,
      socketId: socket.id,
      label: payload.label?.slice(0, 40) || `${device} · ${browser}`,
      device,
      browser,
      os,
      lang: (payload.lang === 'ar' ? 'ar' : 'en') as Lang,
      route: payload.route ?? '/',
      screen: payload.screen ?? '',
      studentNo: payload.studentNo ?? null,
      tripId: this.byCode.get(code)?.tripId ?? null,
      mode: payload.mode ?? 'live',
      scenario: null,
      createdAt: this.byCode.get(code)?.createdAt ?? now,
      lastSeen: now,
      controlled: this.byCode.get(code)?.controlled ?? false,
    };

    this.byCode.set(code, session);
    this.bySocket.set(socket.id, code);
    repo.upsertDemoSession(session);
    this.broadcast();
    return session;
  }

  patch(code: string, patch: Partial<DemoSession>): DemoSession | null {
    const session = this.byCode.get(code);
    if (!session) return null;
    Object.assign(session, patch, { lastSeen: Date.now() });
    repo.upsertDemoSession(session);
    this.broadcast();
    return session;
  }

  heartbeat(code: string, patch: Partial<DemoSession> = {}): void {
    const session = this.byCode.get(code);
    if (!session) return;
    Object.assign(session, patch, { lastSeen: Date.now() });
    // Heartbeats are frequent and boring; only the admin list needs them.
    this.broadcast();
  }

  bySocketId(socketId: string): DemoSession | null {
    const code = this.bySocket.get(socketId);
    return code ? (this.byCode.get(code) ?? null) : null;
  }

  get(code: string): DemoSession | null {
    return this.byCode.get(code) ?? null;
  }

  remove(socketId: string): void {
    const code = this.bySocket.get(socketId);
    this.bySocket.delete(socketId);
    if (!code) return;
    this.byCode.delete(code);
    repo.deleteDemoSession(code);
    this.broadcast();
  }

  list(): DemoSession[] {
    return [...this.byCode.values()].sort((a, b) => b.lastSeen - a.lastSeen);
  }

  setControlled(codes: string[], controlled: boolean): void {
    for (const code of codes) {
      const session = this.byCode.get(code);
      if (!session) continue;
      session.controlled = controlled;
      this.io.to(session.socketId).emit('demo:controlled', { controlled });
    }
    this.broadcast();
  }

  broadcast(): void {
    this.io.to(ADMIN_ROOM).emit('admin:sessions', { sessions: this.list() });
  }

  logToAdmins(text: string): void {
    this.io.to(ADMIN_ROOM).emit('admin:event', { at: Date.now(), text });
  }
}
