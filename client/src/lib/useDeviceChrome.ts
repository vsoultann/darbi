import { useEffect, useState } from 'react';
import {
  chromeMetrics,
  detectChrome,
  isIPhone,
  isTouchDevice,
  readSafeAreaTop,
  type ChromeKind,
  type ChromeMetrics,
  type ChromePreference,
} from './device';

export interface DeviceChrome {
  /** What we will actually render (preference wins over detection). */
  kind: ChromeKind;
  /** What the hardware looks like. */
  detected: ChromeKind;
  metrics: ChromeMetrics;
  isIPhoneDevice: boolean;
  isTouch: boolean;
}

export function useDeviceChrome(preference: ChromePreference): DeviceChrome {
  const [detected, setDetected] = useState<ChromeKind>('plain');
  const [safeTop, setSafeTop] = useState(0);

  useEffect(() => {
    const measure = (): void => {
      setSafeTop(readSafeAreaTop());
      setDetected(detectChrome());
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  const kind = preference === 'auto' ? detected : preference;
  return {
    kind,
    detected,
    metrics: chromeMetrics(kind, safeTop),
    isIPhoneDevice: isIPhone(),
    isTouch: isTouchDevice(),
  };
}
