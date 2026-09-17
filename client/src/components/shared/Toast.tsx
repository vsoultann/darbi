/** Notification previews — from the server, the admin console, or a demo scenario. */
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Bell, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { NotifyKind } from '@shared/types';
import { useToasts } from '@/store/toastStore';

const ICONS: Record<NotifyKind, typeof Bell> = {
  info: Bell,
  warn: AlertTriangle,
  success: CheckCircle2,
};

const TONE: Record<NotifyKind, string> = {
  info: 'text-darbi-bronze',
  warn: 'text-darbi-soon',
  success: 'text-darbi-live',
};

export function ToastHost({ offsetTop = 92 }: { offsetTop?: number }) {
  const toasts = useToasts((state) => state.toasts);
  const dismiss = useToasts((state) => state.dismiss);
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) => window.setTimeout(() => dismiss(toast.id), 5200));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismiss]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center gap-2 px-4"
      style={{ top: offsetTop }}
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.kind];
          return (
            <motion.button
              key={toast.id}
              type="button"
              onClick={() => dismiss(toast.id)}
              className="darbi-card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-3 text-start backdrop-blur"
              initial={{ opacity: 0, y: -18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <Icon size={18} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${TONE[toast.kind]}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold" style={{ color: 'var(--heading)' }}>
                  {isArabic ? toast.title_ar : toast.title_en}
                </span>
                {(isArabic ? toast.body_ar : toast.body_en) ? (
                  <span className="mt-0.5 block text-xs leading-snug opacity-80">
                    {isArabic ? toast.body_ar : toast.body_en}
                  </span>
                ) : null}
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
