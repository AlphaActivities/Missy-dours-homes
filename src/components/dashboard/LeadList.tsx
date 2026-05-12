import { Mail, Phone, MessageSquare, MapPin, Tag, Calendar, Users } from 'lucide-react';
import StatusBadge, { LeadStatus } from './ui/StatusBadge';
import { formatDate, formatSourcePage } from '../../utils/formatDate';

const STATUS_BORDER_COLOR: Record<LeadStatus, string> = {
  new:       '#38bdf8',   // sky-400
  contacted: '#fbbf24',   // amber-400
  qualified: '#6ee7b7',   // emerald-400
  closed:    '#5a5856',
  archived:  '#3a3836',
};

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  source_page: string;
  listing_slug: string;
  status: LeadStatus;
}

// ── Desktop Table ────────────────────────────────────────────
function LeadTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {['Date', 'Name', 'Contact', 'Message', 'Source', 'Status'].map(col => (
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
          {leads.map((lead, i) => (
            <tr
              key={lead.id}
              className="group transition-colors duration-150"
              style={{
                borderBottom: i < leads.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Date */}
              <td className="px-4 py-4 pl-6 align-top">
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--ds-text-tertiary)' }}>
                  {formatDate(lead.created_at)}
                </span>
              </td>

              {/* Name */}
              <td className="px-4 py-4 align-top">
                <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--ds-text-primary)' }}>
                  {lead.name || '—'}
                </span>
              </td>

              {/* Contact */}
              <td className="px-4 py-4 align-top">
                <div className="space-y-1.5">
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 text-xs transition-colors duration-150"
                      style={{ color: 'var(--ds-text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                    >
                      <Mail size={11} className="shrink-0" />
                      {lead.email}
                    </a>
                  )}
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1.5 text-xs transition-colors duration-150"
                      style={{ color: 'var(--ds-text-secondary)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                    >
                      <Phone size={11} className="shrink-0" />
                      {lead.phone}
                    </a>
                  )}
                  {!lead.email && !lead.phone && (
                    <span style={{ color: 'var(--ds-text-tertiary)' }}>—</span>
                  )}
                </div>
              </td>

              {/* Message */}
              <td className="px-4 py-4 align-top max-w-[220px]">
                {lead.message ? (
                  <p
                    className="text-xs leading-relaxed line-clamp-3"
                    style={{ color: 'var(--ds-text-secondary)' }}
                    title={lead.message}
                  >
                    {lead.message}
                  </p>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>—</span>
                )}
              </td>

              {/* Source */}
              <td className="px-4 py-4 align-top">
                <div className="space-y-1.5">
                  {lead.source_page && (
                    <span className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: 'var(--ds-text-tertiary)' }}>
                      <MapPin size={10} className="shrink-0" />
                      {formatSourcePage(lead.source_page)}
                    </span>
                  )}
                  {lead.listing_slug && (
                    <span className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: 'var(--ds-text-tertiary)' }}>
                      <Tag size={10} className="shrink-0" />
                      {formatSourcePage(lead.listing_slug)}
                    </span>
                  )}
                  {!lead.source_page && !lead.listing_slug && (
                    <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>—</span>
                  )}
                </div>
              </td>

              {/* Status */}
              <td className="px-4 py-4 pr-6 align-top">
                <StatusBadge status={lead.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile Card ───────────────────────────────────────────────
function LeadCard({ lead }: { lead: Lead }) {
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--ds-bg-raised)',
        boxShadow: 'var(--ds-shadow-card)',
        borderLeft: `3px solid ${STATUS_BORDER_COLOR[lead.status]}`,
      }}
    >
        <div className="p-4 space-y-3">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ds-text-primary)' }}>
                {lead.name || '—'}
              </p>
              <p className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
                <Calendar size={10} />
                {formatDate(lead.created_at)}
              </p>
            </div>
            <StatusBadge status={lead.status} />
          </div>

          {/* Contact */}
          <div className="space-y-1.5">
            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-2 text-xs transition-colors duration-150"
                style={{ color: 'var(--ds-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
              >
                <Mail size={11} className="shrink-0" style={{ color: 'var(--ds-text-tertiary)' }} />
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-2 text-xs transition-colors duration-150"
                style={{ color: 'var(--ds-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
              >
                <Phone size={11} className="shrink-0" style={{ color: 'var(--ds-text-tertiary)' }} />
                {lead.phone}
              </a>
            )}
          </div>

          {/* Message */}
          {lead.message && (
            <div className="flex gap-2">
              <MessageSquare
                size={11}
                className="shrink-0 mt-0.5"
                style={{ color: 'var(--ds-text-tertiary)' }}
              />
              <p
                className="text-xs leading-relaxed line-clamp-4"
                style={{ color: 'var(--ds-text-secondary)' }}
              >
                {lead.message}
              </p>
            </div>
          )}

          {/* Source */}
          {(lead.source_page || lead.listing_slug) && (
            <div
              className="pt-3 flex flex-wrap gap-x-4 gap-y-1.5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              {lead.source_page && (
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                  <MapPin size={10} />
                  {formatSourcePage(lead.source_page)}
                </span>
              )}
              {lead.listing_slug && (
                <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                  <Tag size={10} />
                  {formatSourcePage(lead.listing_slug)}
                </span>
              )}
            </div>
          )}
        </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'var(--ds-bg-overlay)' }}
      >
        <Users size={22} style={{ color: 'var(--ds-text-tertiary)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--ds-text-secondary)' }}>
        No leads yet
      </p>
      <p className="text-xs mt-1.5 max-w-xs leading-relaxed" style={{ color: 'var(--ds-text-tertiary)' }}>
        Submissions from your website will appear here, ordered by most recent.
      </p>
    </div>
  );
}

// ── Exported Component ────────────────────────────────────────
export default function LeadList({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) return <EmptyState />;

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <LeadTable leads={leads} />
      </div>
      {/* Mobile */}
      <div className="md:hidden space-y-3 p-4">
        {leads.map(lead => <LeadCard key={lead.id} lead={lead} />)}
      </div>
    </>
  );
}
