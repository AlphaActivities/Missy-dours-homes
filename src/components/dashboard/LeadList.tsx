import { useState, useCallback, useEffect } from 'react';
import { Mail, Phone, MapPin, Tag, Calendar, Users, ChevronDown, FileText } from 'lucide-react';
import StatusBadge, { LeadStatus } from './ui/StatusBadge';
import StatusSelect from './ui/StatusSelect';
import QuickActionBar from './ui/QuickActionBar';
import NotesEditor from './ui/NotesEditor';
import { formatDate, formatSourcePage } from '../../utils/formatDate';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

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
  notes: string;
}

const STATUS_BORDER_COLOR: Record<LeadStatus, string> = {
  new:       '#38bdf8',
  contacted: '#fbbf24',
  qualified: '#6ee7b7',
  closed:    '#5a5856',
  archived:  '#3a3836',
};

// ── Desktop expanded notes panel ─────────────────────────────
function DesktopNotesRow({
  lead,
  colSpan,
  onSaveNotes,
}: {
  lead: Lead;
  colSpan: number;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 pb-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div
          className="rounded-xl p-4"
          style={{ background: 'var(--ds-bg-overlay)' }}
        >
          <p
            className="text-[10px] font-medium tracking-[0.12em] uppercase mb-2.5"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            Private notes
          </p>
          <NotesEditor
            leadId={lead.id}
            initialNotes={lead.notes ?? ''}
            onSave={onSaveNotes}
          />
        </div>
      </td>
    </tr>
  );
}

// ── Desktop Table ────────────────────────────────────────────
function LeadTable({
  leads,
  onStatusChange,
  onSaveNotes,
}: {
  leads: Lead[];
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, next: LeadStatus) => {
    setUpdatingId(id);
    await onStatusChange(id, next);
    setUpdatingId(null);
  };

  const cols = ['Date', 'Name', 'Contact', 'Message', 'Source', 'Status', 'Actions'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[840px]">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {cols.map(col => (
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
          {leads.map((lead, i) => {
            const isExpanded = expandedId === lead.id;
            const isLast = i === leads.length - 1;
            return (
              <>
                <tr
                  key={lead.id}
                  className="transition-colors duration-150 cursor-default"
                  style={{
                    borderBottom: isExpanded ? 'none' : (isLast ? 'none' : '1px solid rgba(255,255,255,0.04)'),
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium whitespace-nowrap" style={{ color: 'var(--ds-text-primary)' }}>
                        {lead.name || '—'}
                      </span>
                      {lead.notes && (
                        <FileText
                          size={11}
                          title="Has notes"
                          style={{ color: 'var(--ds-gold-dim)', flexShrink: 0 }}
                        />
                      )}
                    </div>
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
                  <td className="px-4 py-4 align-top max-w-[200px]">
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
                  <td className="px-4 py-4 align-top">
                    <StatusSelect
                      status={lead.status}
                      disabled={updatingId === lead.id}
                      onChange={next => handleStatusChange(lead.id, next)}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 pr-6 align-top">
                    <div className="flex items-center gap-2">
                      <QuickActionBar phone={lead.phone} email={lead.email} compact />
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                        className="flex items-center gap-1 rounded-lg text-[11px] font-medium px-2 py-1.5 transition-all duration-150"
                        style={{
                          color: isExpanded ? 'var(--ds-gold)' : 'var(--ds-text-tertiary)',
                          background: isExpanded ? 'var(--ds-gold-glow)' : 'transparent',
                          boxShadow: isExpanded ? '0 0 0 1px rgba(196,164,106,0.2)' : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!isExpanded) e.currentTarget.style.color = 'var(--ds-text-secondary)';
                        }}
                        onMouseLeave={e => {
                          if (!isExpanded) e.currentTarget.style.color = 'var(--ds-text-tertiary)';
                        }}
                        aria-label={isExpanded ? 'Collapse notes' : 'Expand notes'}
                        title="Notes"
                      >
                        <FileText size={11} />
                        <ChevronDown
                          size={10}
                          style={{ transition: 'transform 200ms', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded notes row */}
                {isExpanded && (
                  <DesktopNotesRow
                    key={`${lead.id}-notes`}
                    lead={lead}
                    colSpan={cols.length}
                    onSaveNotes={onSaveNotes}
                  />
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile Card ───────────────────────────────────────────────
function LeadCard({
  lead,
  onStatusChange,
  onSaveNotes,
}: {
  lead: Lead;
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (next: LeadStatus) => {
    setUpdatingStatus(true);
    await onStatusChange(lead.id, next);
    setUpdatingStatus(false);
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--ds-bg-raised)',
        boxShadow: 'var(--ds-shadow-card)',
        borderLeft: `3px solid ${STATUS_BORDER_COLOR[lead.status]}`,
      }}
    >
      <div className="p-4 space-y-3.5">

        {/* Header: name + date + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--ds-text-primary)' }}>
                {lead.name || '—'}
              </p>
              {lead.notes && (
                <FileText size={11} title="Has notes" style={{ color: 'var(--ds-gold-dim)', flexShrink: 0 }} />
              )}
            </div>
            <p className="flex items-center gap-1.5 text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
              <Calendar size={10} />
              {formatDate(lead.created_at)}
            </p>
          </div>
          <StatusSelect
            status={lead.status}
            disabled={updatingStatus}
            onChange={handleStatusChange}
          />
        </div>

        {/* Contact links */}
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

        {/* Quick actions */}
        {(lead.phone || lead.email) && (
          <div
            className="pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <QuickActionBar phone={lead.phone} email={lead.email} compact={false} />
          </div>
        )}

        {/* Message */}
        {lead.message && (
          <div
            className="rounded-lg px-3 py-2.5"
            style={{ background: 'var(--ds-bg-overlay)' }}
          >
            <p className="text-xs leading-relaxed line-clamp-4" style={{ color: 'var(--ds-text-secondary)' }}>
              {lead.message}
            </p>
          </div>
        )}

        {/* Source */}
        {(lead.source_page || lead.listing_slug) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
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

        {/* Notes toggle */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
          <button
            type="button"
            onClick={() => setNotesOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors duration-150 mb-3"
            style={{ color: notesOpen ? 'var(--ds-gold)' : 'var(--ds-text-tertiary)' }}
            onMouseEnter={e => { if (!notesOpen) e.currentTarget.style.color = 'var(--ds-text-secondary)'; }}
            onMouseLeave={e => { if (!notesOpen) e.currentTarget.style.color = 'var(--ds-text-tertiary)'; }}
          >
            <FileText size={11} />
            {notesOpen ? 'Hide notes' : (lead.notes ? 'Edit notes' : 'Add notes')}
            <ChevronDown
              size={11}
              style={{ transition: 'transform 200ms', transform: notesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
            />
          </button>

          {notesOpen && (
            <NotesEditor
              leadId={lead.id}
              initialNotes={lead.notes ?? ''}
              onSave={onSaveNotes}
            />
          )}
        </div>
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
export default function LeadList({
  leads: initialLeads,
  onLeadsChange,
}: {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
}) {
  const { showToast } = useToast();

  // Local leads state for optimistic updates
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  // Sync when parent passes fresh data (pagination / refresh)
  useEffect(() => {
    setLeads(initialLeads);
  }, [initialLeads]);

  const updateLeadLocal = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...patch } : l);
      onLeadsChange(next);
      return next;
    });
  }, [onLeadsChange]);

  const handleStatusChange = useCallback(async (id: string, next: LeadStatus) => {
    // Read current status before optimistic update
    let prevStatus: LeadStatus | undefined;
    setLeads(prev => {
      prevStatus = prev.find(l => l.id === id)?.status;
      return prev;
    });

    // Optimistic update
    updateLeadLocal(id, { status: next });

    const { error } = await supabase
      .from('leads')
      .update({ status: next })
      .eq('id', id);

    if (error) {
      if (prevStatus) updateLeadLocal(id, { status: prevStatus });
      showToast('Failed to update status.', 'error');
    } else {
      showToast('Status updated.');
    }
  }, [updateLeadLocal, showToast]);

  const handleSaveNotes = useCallback(async (id: string, notes: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ notes })
      .eq('id', id);

    if (error) {
      showToast('Failed to save note.', 'error');
      throw error;
    }

    updateLeadLocal(id, { notes });
    showToast('Note saved.');
  }, [updateLeadLocal, showToast]);

  if (leads.length === 0) return <EmptyState />;

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block">
        <LeadTable
          leads={leads}
          onStatusChange={handleStatusChange}
          onSaveNotes={handleSaveNotes}
        />
      </div>
      {/* Mobile */}
      <div className="md:hidden space-y-3 p-4">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onStatusChange={handleStatusChange}
            onSaveNotes={handleSaveNotes}
          />
        ))}
      </div>
    </>
  );
}
