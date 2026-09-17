import { create } from 'zustand';
import type { NotifyKind, NotifyPayload } from '@shared/types';

export interface Toast extends NotifyPayload {
  id: number;
  at: number;
}

interface ToastState {
  toasts: Toast[];
  push: (payload: NotifyPayload) => void;
  pushSimple: (title: string, kind?: NotifyKind) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (payload) =>
    set((state) => ({ toasts: [...state.toasts, { ...payload, id: nextId++, at: Date.now() }].slice(-3) })),
  pushSimple: (title, kind = 'info') =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: nextId++, at: Date.now(), title_en: title, title_ar: title, body_en: '', body_ar: '', kind },
      ].slice(-3),
    })),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
