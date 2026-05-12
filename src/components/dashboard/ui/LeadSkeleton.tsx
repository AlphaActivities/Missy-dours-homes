// Skeleton variants: table | card | recent
type SkeletonVariant = 'table' | 'card' | 'recent';

function SkeletonBlock({ w, h = 12, className = '' }: { w: string; h?: number; className?: string }) {
  return (
    <div
      className={`ds-skeleton rounded ${className}`}
      style={{ width: w, height: `${h}px` }}
    />
  );
}

// ── Single skeleton table row ─────────────────────────────────
function SkeletonTableRow({ isLast = false }: { isLast?: boolean }) {
  return (
    <tr style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
      <td className="px-4 py-4 pl-6 align-top"><SkeletonBlock w="88px" h={11} /></td>
      <td className="px-4 py-4 align-top"><SkeletonBlock w="110px" h={13} /></td>
      <td className="px-4 py-4 align-top">
        <div className="space-y-2">
          <SkeletonBlock w="140px" h={11} />
          <SkeletonBlock w="90px" h={11} />
        </div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="space-y-1.5">
          <SkeletonBlock w="160px" h={10} />
          <SkeletonBlock w="130px" h={10} />
          <SkeletonBlock w="100px" h={10} />
        </div>
      </td>
      <td className="px-4 py-4 align-top"><SkeletonBlock w="80px" h={11} /></td>
      <td className="px-4 py-4 align-top"><SkeletonBlock w="64px" h={20} className="rounded-full" /></td>
      <td className="px-4 py-4 pr-6 align-top">
        <div className="flex gap-2">
          <SkeletonBlock w="44px" h={26} className="rounded-lg" />
          <SkeletonBlock w="44px" h={26} className="rounded-lg" />
          <SkeletonBlock w="28px" h={26} className="rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

// ── Skeleton table (desktop) ──────────────────────────────────
function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[840px]">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Date', 'Name', 'Contact', 'Message', 'Source', 'Status', 'Actions'].map(col => (
              <th
                key={col}
                className="text-left px-4 py-3.5 first:pl-6 last:pr-6"
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ds-text-tertiary)',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} isLast={i === rows - 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Single skeleton mobile card ───────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--ds-bg-raised)',
        boxShadow: 'var(--ds-shadow-card)',
        borderLeft: '3px solid rgba(255,255,255,0.07)',
      }}
    >
      <div className="p-4 space-y-3.5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBlock w="130px" h={14} />
            <SkeletonBlock w="90px" h={10} />
          </div>
          <SkeletonBlock w="64px" h={20} className="rounded-full" />
        </div>
        {/* Contact */}
        <div className="space-y-2">
          <SkeletonBlock w="160px" h={11} />
          <SkeletonBlock w="100px" h={11} />
        </div>
        {/* Action buttons */}
        <div
          className="pt-3 flex gap-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <SkeletonBlock w="64px" h={30} className="rounded-lg" />
          <SkeletonBlock w="64px" h={30} className="rounded-lg" />
          <SkeletonBlock w="64px" h={30} className="rounded-lg" />
        </div>
        {/* Message preview */}
        <div className="space-y-1.5">
          <SkeletonBlock w="100%" h={10} />
          <SkeletonBlock w="80%" h={10} />
        </div>
      </div>
    </div>
  );
}

// ── Skeleton recent lead row (overview page) ──────────────────
export function SkeletonRecentRow() {
  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div className="flex-1 min-w-0 space-y-2">
        <SkeletonBlock w="120px" h={13} />
        <SkeletonBlock w="160px" h={10} />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <SkeletonBlock w="60px" h={20} className="rounded-full" />
        <SkeletonBlock w="48px" h={10} />
      </div>
    </div>
  );
}

// ── Public export: renders correct variant ────────────────────
export default function LeadSkeleton({
  variant,
  rows = 8,
  cards = 3,
}: {
  variant: SkeletonVariant;
  rows?: number;
  cards?: number;
}) {
  if (variant === 'table') {
    return (
      <div className="hidden md:block">
        <SkeletonTable rows={rows} />
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="md:hidden space-y-3 p-4">
        {Array.from({ length: cards }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return null;
}
