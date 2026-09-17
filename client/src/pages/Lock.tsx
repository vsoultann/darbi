/** `/lock` — the always-on display (§7). The island is hidden here; the card replaces it. */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockScreen } from '@/components/aod/LockScreen';
import { useTripFeed } from '@/lib/useTripFeed';
import { prefersReducedMotion, useSettings } from '@/store/settingsStore';
import { useTrip } from '@/store/tripStore';

export function Lock() {
  const navigate = useNavigate();
  const storePayload = useTrip((state) => state.payload);
  const trip = useTrip((state) => state.trip);
  const burstAt = useTrip((state) => state.burstAt);
  const demoStudent = useSettings((state) => state.demo.studentNo);
  const reduceMotion = useSettings((state) => state.reduceMotion) || prefersReducedMotion();

  const studentNo = storePayload?.student.student_no ?? demoStudent ?? '123456';
  const feed = useTripFeed(studentNo);
  const payload = feed.payload ?? storePayload;

  // The arrival burst still fires on the card even though the island is hidden (§7.2).
  const bursting = burstAt > 0 && Date.now() - burstAt < 4000;

  useEffect(() => {
    document.body.style.background = '#000';
    return () => {
      document.body.style.background = '';
    };
  }, []);

  if (!payload || !trip) {
    return <div className="darbi-aod flex h-dvh w-full items-center justify-center text-xs opacity-50">…</div>;
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <LockScreen
        trip={trip}
        payload={payload}
        reduceMotion={reduceMotion}
        burst={bursting}
        onUnlock={() => navigate(`/track/${payload.student.student_no}`)}
      />
    </div>
  );
}
