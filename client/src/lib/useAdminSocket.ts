/** Admin console plumbing: authenticate the socket, watch sessions, send commands (§8). */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AdminCommandName, DemoSession, TripUpdate } from '@shared/types';
import { getSocket } from '@/lib/socket';

export interface AdminEvent {
  at: number;
  text: string;
}

export interface AdminSocket {
  connected: boolean;
  authed: boolean;
  sessions: DemoSession[];
  events: AdminEvent[];
  mirrorTrip: TripUpdate | null;
  send: (command: AdminCommandName, payload?: Record<string, unknown>) => Promise<string>;
  watch: (sessionCode: string | null) => void;
  release: () => void;
  target: string;
  setTarget: (target: string) => void;
  broadcast: boolean;
  setBroadcast: (value: boolean) => void;
}

export function useAdminSocket(token: string | null): AdminSocket {
  const [connected, setConnected] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [sessions, setSessions] = useState<DemoSession[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [mirrorTrip, setMirrorTrip] = useState<TripUpdate | null>(null);
  const [target, setTarget] = useState('');
  const [broadcast, setBroadcast] = useState(false);
  const watching = useRef<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = getSocket();

    const authenticate = (): void => {
      setConnected(true);
      socket.emit('admin:auth', { token }, (ack) => {
        setAuthed(ack.ok);
        if (ack.ok && watching.current !== null) socket.emit('admin:watch', { sessionCode: watching.current });
      });
    };
    const onDisconnect = (): void => {
      setConnected(false);
      setAuthed(false);
    };
    const onSessions = (payload: { sessions: DemoSession[] }): void => setSessions(payload.sessions);
    const onEvent = (payload: AdminEvent): void => setEvents((prev) => [payload, ...prev].slice(0, 60));
    const onTrip = (update: TripUpdate): void => setMirrorTrip(update);

    socket.on('connect', authenticate);
    socket.on('disconnect', onDisconnect);
    socket.on('admin:sessions', onSessions);
    socket.on('admin:event', onEvent);
    socket.on('trip:update', onTrip);

    if (socket.connected) authenticate();
    else socket.connect();

    return () => {
      socket.off('connect', authenticate);
      socket.off('disconnect', onDisconnect);
      socket.off('admin:sessions', onSessions);
      socket.off('admin:event', onEvent);
      socket.off('trip:update', onTrip);
    };
  }, [token]);

  /* Keep an eye on whichever session is selected, so the mirror always has a feed. */
  const watch = useCallback((sessionCode: string | null) => {
    watching.current = sessionCode;
    getSocket().emit('admin:watch', { sessionCode });
  }, []);

  const resolvedTarget = broadcast ? 'all' : target;

  const send = useCallback(
    (command: AdminCommandName, payload: Record<string, unknown> = {}) =>
      new Promise<string>((resolve) => {
        getSocket().emit('admin:command', { target: resolvedTarget || 'all', command, payload }, (ack) => {
          resolve(ack?.message ?? (ack?.ok ? 'ok' : 'failed'));
        });
      }),
    [resolvedTarget],
  );

  const release = useCallback(() => {
    getSocket().emit('admin:release', { target: resolvedTarget || 'all' });
  }, [resolvedTarget]);

  useEffect(() => {
    if (!authed) return;
    watch(broadcast ? null : target || null);
  }, [authed, broadcast, target, watch]);

  return useMemo(
    () => ({
      connected,
      authed,
      sessions,
      events,
      mirrorTrip,
      send,
      watch,
      release,
      target,
      setTarget,
      broadcast,
      setBroadcast,
    }),
    [connected, authed, sessions, events, mirrorTrip, send, watch, release, target, broadcast],
  );
}
