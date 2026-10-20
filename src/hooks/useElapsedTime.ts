import { useState, useEffect } from 'react';

export interface ElapsedTime {
  hours: number;
  minutes: number;
  totalMinutes: number;
}

export function calculateElapsed(fromISO: string, now: number = Date.now()): ElapsedTime {
  const fromMs = new Date(fromISO).getTime();
  const diffMs = Math.max(0, now - fromMs);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes, totalMinutes };
}

export function formatElapsed(e: ElapsedTime): string {
  if (e.hours === 0 && e.minutes === 0) return 'just now';
  if (e.hours === 0) return `${e.minutes}m`;
  if (e.hours < 24) return `${e.hours}h ${e.minutes}m`;
  const days = Math.floor(e.hours / 24);
  const remHours = e.hours % 24;
  if (days === 1) return remHours > 0 ? `1d ${remHours}h` : '1 day';
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}

export type UrgencyLevel = 'neutral' | 'gold' | 'red';

export function getUrgencyLevel(e: ElapsedTime, status: string): UrgencyLevel {
  if (status === 'closed' || status === 'archived') return 'neutral';
  if (e.totalMinutes < 60) return 'neutral';
  if (e.totalMinutes < 1440) return 'gold';
  return 'red';
}

export function useElapsedTime(fromISO: string | null | undefined, intervalMs: number = 60000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [fromISO, intervalMs]);

  if (!fromISO) return null;
  return calculateElapsed(fromISO, now);
}
