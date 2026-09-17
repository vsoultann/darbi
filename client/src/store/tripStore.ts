/**
 * The live trip, plus the Dynamic Island / AOD presentation state.
 *
 * Frames land here from whichever TripSource is active; nothing downstream knows or
 * cares whether they came from Socket.IO or the in-browser DemoEngine (§9).
 */
import { create } from 'zustand';
import type { IslandMode, TrackPayload, TripUpdate } from '@shared/types';

export type FeedSource = 'socket' | 'demo' | null;

interface TripState {
  payload: TrackPayload | null;
  trip: TripUpdate | null;
  source: FeedSource;
  connected: boolean;
  /** True while an admin is driving this screen (§9, admin overrides demo mode). */
  controlled: boolean;

  islandMode: IslandMode;
  /** While `now < islandLockedUntil` the auto-collapse timers stand down. */
  islandLockedUntil: number;
  lastInteraction: number;
  islandHidden: boolean;

  /** Set by the admin console pushing a viewer to (or off) the lock screen. */
  aodRequest: { enabled: boolean; at: number } | null;
  burstAt: number;

  setPayload: (payload: TrackPayload | null) => void;
  applyUpdate: (trip: TripUpdate, source: Exclude<FeedSource, null>) => void;
  setConnected: (connected: boolean) => void;
  setControlled: (controlled: boolean) => void;
  setIslandMode: (mode: IslandMode, durationMs?: number) => void;
  noteInteraction: () => void;
  setIslandHidden: (hidden: boolean) => void;
  requestAod: (enabled: boolean) => void;
  clearAodRequest: () => void;
  fireBurst: () => void;
  reset: () => void;
}

export const useTrip = create<TripState>()((set) => ({
  payload: null,
  trip: null,
  source: null,
  connected: false,
  controlled: false,
  islandMode: 'compact',
  islandLockedUntil: 0,
  lastInteraction: Date.now(),
  islandHidden: false,
  aodRequest: null,
  burstAt: 0,

  setPayload: (payload) => set({ payload, trip: payload?.trip ?? null }),
  applyUpdate: (trip, source) => set({ trip, source }),
  setConnected: (connected) => set({ connected }),
  setControlled: (controlled) => set({ controlled }),
  setIslandMode: (mode, durationMs) =>
    set({
      islandMode: mode,
      islandLockedUntil: durationMs ? Date.now() + durationMs : 0,
      lastInteraction: Date.now(),
    }),
  noteInteraction: () => set({ lastInteraction: Date.now() }),
  setIslandHidden: (islandHidden) => set({ islandHidden }),
  requestAod: (enabled) => set({ aodRequest: { enabled, at: Date.now() } }),
  clearAodRequest: () => set({ aodRequest: null }),
  fireBurst: () => set({ burstAt: Date.now() }),
  reset: () => set({ payload: null, trip: null, source: null, controlled: false, burstAt: 0 }),
}));
