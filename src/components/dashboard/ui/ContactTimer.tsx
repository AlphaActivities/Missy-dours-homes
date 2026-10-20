import { Clock } from 'lucide-react';
import { useElapsedTime, formatElapsed, getUrgencyLevel, ElapsedTime } from '../../../hooks/useElapsedTime';

interface ContactTimerProps {
  createdAt: string;
  lastContactedAt?: string | null;
  status: string;
  compact?: boolean;
}

export default function ContactTimer({ createdAt, lastContactedAt, status, compact = false }: ContactTimerProps) {
  const refTime = lastContactedAt || createdAt;
  const elapsed = useElapsedTime(refTime);

  if (!elapsed) return null;

  const urgency = getUrgencyLevel(elapsed, status);
  const label = lastContactedAt ? 'No contact in' : 'Waiting';
  const timeStr = lastContactedAt ? formatElapsed(elapsed) : formatElapsed(elapsed);

  const colors: Record<string, { text: string; bg: string; ring: string }> = {
    neutral: { text: 'var(--ds-text-tertiary)', bg: 'transparent', ring: 'transparent' },
    gold:    { text: '#d9bc85', bg: 'rgba(200,169,110,0.08)', ring: 'rgba(200,169,110,0.2)' },
    red:     { text: '#f08080', bg: 'rgba(240,128,128,0.08)', ring: 'rgba(240,128,128,0.2)' },
  };

  const c = colors[urgency];

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
        style={{ color: c.text, background: c.bg, boxShadow: c.ring !== 'transparent' ? `0 0 0 1px ${c.ring}` : 'none' }}
      >
        {urgency !== 'neutral' && <Clock size={9} className="shrink-0" />}
        {lastContactedAt ? `${label} ${timeStr}` : `${timeStr}`}
      </span>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
      style={{ color: c.text, background: c.bg, boxShadow: c.ring !== 'transparent' ? `0 0 0 1px ${c.ring}` : 'none' }}
    >
      <Clock size={11} className="shrink-0" />
      {lastContactedAt ? `${label} ${timeStr}` : `New inquiry · ${timeStr}`}
    </div>
  );
}

export { getUrgencyLevel, formatElapsed, type ElapsedTime };
