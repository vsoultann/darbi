import { AlertTriangle, CheckCircle2, Clock, Navigation, Octagon, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { STATE_TONE, type TripState } from '@shared/types';

const ICONS: Record<TripState, typeof Clock> = {
  idle: Clock,
  boarding: Users,
  en_route: Navigation,
  approaching: Navigation,
  arrived: CheckCircle2,
  delayed: AlertTriangle,
  stopped: Octagon,
};

const TONE_CLASS: Record<string, string> = {
  live: 'bg-darbi-live/12 text-darbi-live border-darbi-live/25',
  soon: 'bg-darbi-soon/12 text-darbi-soon border-darbi-soon/25',
  late: 'bg-darbi-late/12 text-darbi-late border-darbi-late/25',
  neutral: 'bg-darbi-gold/12 text-darbi-bronze border-darbi-gold/25',
};

export function StateChip({
  state,
  className = '',
  compact = false,
}: {
  state: TripState;
  className?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const Icon = ICONS[state];
  const tone = STATE_TONE[state];
  return (
    <span className={`darbi-chip border ${TONE_CLASS[tone]} ${className}`}>
      <Icon size={compact ? 12 : 14} strokeWidth={1.75} aria-hidden />
      <span>{t(`state.${state}`)}</span>
    </span>
  );
}
