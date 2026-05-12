import { useState, useCallback, useEffect } from 'react';
import { Mail, Phone, Calendar, Users, Search } from 'lucide-react';
import StatusBadge, { LeadStatus } from './ui/StatusBadge';
import StatusSelect from './ui/StatusSelect';
import QuickActionBar from './ui/QuickActionBar';
import { formatDate } from '../../utils/formatDate';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
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
  new:       '#7aafd4',
  contacted: '#c4a46a',
  qualified: '#7dbfa0',
  closed:    '#7a6e62',
  archived:  '#3a3836',
};

// ── Desktop Table ────────────────────────────────────────────
function LeadTable({
  leads,
  onStatusChange,
  onOpenDrawer,
}: {
  leads: Lead[];
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onOpenDrawer: (lead: Lead) => void;
}) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (id: string, next: LeadStatus) => {
    setUpdatingId(id);
    await onStatusChange(id, next);
    setUpdatingId(null);
  };

  const cols = ['Date', 'Name', 'Contact', 'Message', 'Status', 'Actions'];

  return (
    <div className="overflow-x-auto flex-1">
      <table className="w-full text-sm min-w-[700px]">
        <colgroup>
          <col style={{ width: '90px' }} />   {/* Date */}
          <col style={{ width: '130px' }} />  {/* Name */}
          <col style={{ width: '170px' }} />  {/* Contact */}
          <col />                             {/* Message — fills remaining */}
          <col style={{ width: '110px' }} />  {/* Status */}
          <col style={{ width: '90px' }} />   {/* Actions */}
        </colgroup>
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
          {leads.map((lead, i) => (
            <tr
              key={lead.id}
              className="transition-colors duration-150 cursor-pointer"
              style={{
                borderBottom: i < leads.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
              onClick={() => onOpenDrawer(lead)}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Date */}
              <td
                className="px-4 py-4 pl-5 align-top"
                style={{ borderLeft: `3px solid ${STATUS_BORDER_COLOR[lead.status]}` }}
              >
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
                      onClick={e => e.stopPropagation()}
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
                      onClick={e => e.stopPropagation()}
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
              <td className="px-4 py-4 align-top max-w-[240px]">
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

              {/* Status */}
              <td className="px-4 py-4 align-top" onClick={e => e.stopPropagation()}>
                <StatusSelect
                  status={lead.status}
                  disabled={updatingId === lead.id}
                  onChange={next => handleStatusChange(lead.id, next)}
                />
              </td>

              {/* Actions */}
              <td className="px-4 py-4 pr-6 align-top" onClick={e => e.stopPropagation()}>
                <QuickActionBar phone={lead.phone} email={lead.email} compact />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile Card ───────────────────────────────────────────────
function LeadCard({
  lead,
  onStatusChange,
  onOpenDrawer,
}: {
  lead: Lead;
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onOpenDrawer: (lead: Lead) => void;
}) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusChange = async (next: LeadStatus) => {
    setUpdatingStatus(true);
    await onStatusChange(lead.id, next);
    setUpdatingStatus(false);
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        background: 'var(--ds-bg-raised)',
        boxShadow: 'var(--ds-shadow-card)',
        borderLeft: `3px solid ${STATUS_BORDER_COLOR[lead.status]}`,
      }}
      onClick={() => onOpenDrawer(lead)}
    >
      <div className="p-4 space-y-3.5">

        {/* Header: name + status */}
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
          {/* Stop propagation so status select doesn't open drawer */}
          <div onClick={e => e.stopPropagation()}>
            <StatusSelect
              status={lead.status}
              disabled={updatingStatus}
              onChange={handleStatusChange}
            />
          </div>
        </div>

        {/* Contact info — plain text only, tapping opens drawer */}
        <div className="space-y-1.5">
          {lead.email && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
              <Mail size={11} className="shrink-0" style={{ color: 'var(--ds-text-tertiary)' }} />
              {lead.email}
            </div>
          )}
          {lead.phone && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
              <Phone size={11} className="shrink-0" style={{ color: 'var(--ds-text-tertiary)' }} />
              {lead.phone}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Empty states ──────────────────────────────────────────────
export function EmptyNoLeads() {
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

export function EmptyNoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-5"
        style={{ background: 'var(--ds-bg-overlay)' }}
      >
        <Search size={20} style={{ color: 'var(--ds-text-tertiary)' }} />
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--ds-text-secondary)' }}>
        No leads match your search
      </p>
      <p className="text-xs mt-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>
        Try adjusting your search or filter.
      </p>
      <button
        onClick={onClear}
        className="mt-4 text-xs font-medium transition-colors duration-150"
        style={{ color: 'var(--ds-gold-dim)' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-gold-dim)')}
      >
        Clear search
      </button>
    </div>
  );
}

// ── Exported Component ────────────────────────────────────────
export default function LeadList({
  leads: initialLeads,
  onLeadsChange,
  onOpenDrawer,
  isFiltered = false,
  onClearSearch,
}: {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
  onOpenDrawer: (lead: Lead) => void;
  isFiltered?: boolean;
  onClearSearch?: () => void;
}) {
  const { showToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

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
    let prevStatus: LeadStatus | undefined;
    setLeads(prev => { prevStatus = prev.find(l => l.id === id)?.status; return prev; });
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

  // Sync openDrawer with fresh lead state so drawer always has latest data
  const handleOpenDrawer = useCallback((lead: Lead) => {
    const fresh = leads.find(l => l.id === lead.id) ?? lead;
    onOpenDrawer(fresh);
  }, [leads, onOpenDrawer]);

  if (leads.length === 0) {
    return isFiltered
      ? <EmptyNoResults onClear={onClearSearch ?? (() => {})} />
      : <EmptyNoLeads />;
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex md:flex-col md:flex-1">
        <LeadTable
          leads={leads}
          onStatusChange={handleStatusChange}
          onOpenDrawer={handleOpenDrawer}
        />
      </div>
      {/* Mobile */}
      <div className="md:hidden space-y-3 p-4">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onStatusChange={handleStatusChange}
            onOpenDrawer={handleOpenDrawer}
          />
        ))}
      </div>
    </>
  );
}
