/** Screen Wake Lock for the AOD (§7.2). Rejection is handled silently by design. */
type WakeLockSentinelLike = { released: boolean; release: () => Promise<void> };

let sentinel: WakeLockSentinelLike | null = null;

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
}

export function wakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export async function requestWakeLock(): Promise<boolean> {
  const nav = navigator as Navigator & WakeLockNavigator;
  if (!nav.wakeLock) return false;
  try {
    sentinel = await nav.wakeLock.request('screen');
    return true;
  } catch {
    return false;
  }
}

export async function releaseWakeLock(): Promise<void> {
  try {
    await sentinel?.release();
  } catch {
    /* already gone */
  }
  sentinel = null;
}

/** iOS drops the lock when the tab is backgrounded; re-take it on return. */
export function watchVisibility(): () => void {
  const handler = (): void => {
    if (document.visibilityState === 'visible' && sentinel?.released !== false) void requestWakeLock();
  };
  document.addEventListener('visibilitychange', handler);
  return () => document.removeEventListener('visibilitychange', handler);
}
