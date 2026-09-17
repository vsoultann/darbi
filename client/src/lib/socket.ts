/** One Socket.IO connection for the whole app, same origin as the page (§2). */
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/types';

export type DarbiSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: DarbiSocket | null = null;

export function getSocket(): DarbiSocket {
  if (socket) return socket;
  socket = io({
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 700,
    reconnectionDelayMax: 4000,
    timeout: 8000,
  });
  return socket;
}

export function socketConnected(): boolean {
  return socket?.connected ?? false;
}
