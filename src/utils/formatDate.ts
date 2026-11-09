export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60)   return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDateShort(iso);
}

export function formatSourcePage(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^\//, '')
    .split('/')
    .map(segment =>
      segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
    )
    .join(' › ');
}

/** Timestamp display: viewer-local time with explicit zone, never inferred from a server offset. */
export function formatDashboardDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month:'numeric',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',
    timeZoneName:'short'
  }).format(new Date(iso));
}

/** Dallas brokerage reference clock for cross-timezone callbacks. */
export function formatDallasDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month:'numeric',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',
    timeZone:'America/Chicago',timeZoneName:'short'
  }).format(new Date(iso));
}
