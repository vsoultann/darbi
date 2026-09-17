/** Session code from the server registry, admin/driver tokens, and the console log. */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LogEntry {
  at: number;
  text: string;
}

interface SessionState {
  sessionCode: string | null;
  adminToken: string | null;
  driverToken: string | null;
  log: LogEntry[];
  setSessionCode: (code: string | null) => void;
  setAdminToken: (token: string | null) => void;
  setDriverToken: (token: string | null) => void;
  pushLog: (text: string) => void;
  clearLog: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      sessionCode: null,
      adminToken: null,
      driverToken: null,
      log: [],
      setSessionCode: (sessionCode) => set({ sessionCode }),
      setAdminToken: (adminToken) => set({ adminToken }),
      setDriverToken: (driverToken) => set({ driverToken }),
      pushLog: (text) => set((state) => ({ log: [{ at: Date.now(), text }, ...state.log].slice(0, 60) })),
      clearLog: () => set({ log: [] }),
    }),
    {
      name: 'darbi.session',
      partialize: (state) => ({ adminToken: state.adminToken, driverToken: state.driverToken }),
    },
  ),
);
