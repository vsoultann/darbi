/**
 * iPhone-style bezel mock.
 *
 * `variant="top"` is the slab used on desktop so the floating island reads as a phone
 * (§6.5); `variant="full"` is the whole handset used by the admin console's live mirror.
 */
import type { ChromeKind } from '@/lib/device';

export interface DeviceFrameProps {
  children: React.ReactNode;
  variant?: 'top' | 'full';
  /** Draws a Dynamic Island pill or a notch in the bezel. */
  kind?: ChromeKind;
  className?: string;
  width?: number;
  label?: string;
}

export function DeviceFrame({
  children,
  variant = 'full',
  kind = 'island',
  className = '',
  width = 260,
  label,
}: DeviceFrameProps) {
  if (variant === 'top') {
    return (
      <div className={`pointer-events-auto relative ${className}`}>
        <div
          className="relative rounded-b-[26px] rounded-t-[36px] bg-[#0b0b0c] p-2 pb-5 shadow-[0_18px_44px_rgba(0,0,0,0.28)] ring-1 ring-white/10"
          style={{ width: width + 24 }}
        >
          <div className="mx-auto mb-2 h-1 w-14 rounded-full bg-white/15" aria-hidden />
          <div
            className="relative flex items-start justify-center rounded-[28px] bg-gradient-to-b from-[#161310] to-[#0d0b09] pt-2"
            style={{ width, minHeight: 74 }}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative rounded-[42px] bg-[#0b0b0c] p-[10px] shadow-[0_24px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/10"
        style={{ width }}
      >
        <div
          className="relative overflow-hidden rounded-[34px] bg-black"
          style={{ aspectRatio: '9 / 19.5' }}
        >
          {kind === 'notch' ? (
            <span
              className="pointer-events-none absolute top-0 z-30 h-[26px] rounded-b-[14px] bg-black"
              style={{ insetInlineStart: '50%', transform: 'translateX(-50%)', width: '46%' }}
              aria-hidden
            />
          ) : kind === 'island' ? (
            <span
              className="pointer-events-none absolute top-[9px] z-30 h-[22px] rounded-full bg-black"
              style={{ insetInlineStart: '50%', transform: 'translateX(-50%)', width: '32%' }}
              aria-hidden
            />
          ) : null}
          {children}
        </div>
      </div>
      {label ? (
        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-wider text-darbi-cocoa/70">
          {label}
        </p>
      ) : null}
    </div>
  );
}
