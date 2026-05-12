import { useEffect, useRef, useState } from 'react';
import { X, Calendar, MapPin, Tag, MessageSquare } from 'lucide-react';
import { Lead } from '../LeadList';
import { LeadStatus } from './StatusBadge';
import StatusSelect from './StatusSelect';
import QuickActionBar from './QuickActionBar';
import NotesEditor from './NotesEditor';
import { formatDate, formatSourcePage } from '../../../utils/formatDate';

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
}

const ANIMATION_DURATION = 300;

export default function LeadDrawer({ lead, onClose, onStatusChange, onSaveNotes }: LeadDrawerProps) {
  // Track whether we're animating out — keep component mounted during exit
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const prevLeadRef = useRef<Lead | null>(null);

  // When a lead is set, mount and animate in
  useEffect(() => {
    if (lead) {
      setIsRendered(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsVisible(true)));
      prevLeadRef.current = lead;
    } else {
      setIsVisible(false);
      const t = setTimeout(() => setIsRendered(false), ANIMATION_DURATION + 20);
      return () => clearTimeout(t);
    }
  }, [lead]);

  // Keep showing previous lead data during exit animation
  const displayLead = lead ?? prevLeadRef.current;

  // Escape key
  useEffect(() => {
    if (!isRendered) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isRendered, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (isRendered) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isRendered]);

  const handleStatusChange = async (next: LeadStatus) => {
    if (!displayLead) return;
    setUpdatingStatus(true);
    await onStatusChange(displayLead.id, next);
    setUpdatingStatus(false);
  };

  if (!isRendered || !displayLead) return null;

  const ease = `cubic-bezier(0.32, 0.72, 0, 1)`;
  const easeOut = `cubic-bezier(0.72, 0, 0.84, 0)`;

  return (
    <>
      {/* ── Overlay ─────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40"
        style={{
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          opacity: isVisible ? 1 : 0,
          transition: `opacity ${ANIMATION_DURATION}ms ease-out`,
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden
      />

      {/* ── Desktop: right panel ─────────────────────────────── */}
      <div
        className="fixed top-0 right-0 h-full z-50 hidden sm:flex flex-col"
        style={{
          width: '420px',
          background: 'var(--ds-bg-raised)',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.5), -1px 0 0 rgba(255,255,255,0.06)',
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform ${ANIMATION_DURATION}ms ${isVisible ? ease : easeOut}`,
          willChange: 'transform',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Lead: ${displayLead.name}`}
      >
        <DrawerContent
          lead={displayLead}
          onClose={onClose}
          onStatusChange={handleStatusChange}
          onSaveNotes={onSaveNotes}
          updatingStatus={updatingStatus}
        />
      </div>

      {/* ── Mobile: bottom sheet ─────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col sm:hidden"
        style={{
          maxHeight: '92dvh',
          background: 'var(--ds-bg-raised)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5), 0 -1px 0 rgba(255,255,255,0.06)',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${ANIMATION_DURATION}ms ${isVisible ? ease : easeOut}`,
          willChange: 'transform',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={`Lead: ${displayLead.name}`}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div
            className="w-9 h-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          />
        </div>
        <DrawerContent
          lead={displayLead}
          onClose={onClose}
          onStatusChange={handleStatusChange}
          onSaveNotes={onSaveNotes}
          updatingStatus={updatingStatus}
          isMobile
        />
      </div>
    </>
  );
}

// ── Shared drawer content ──────────────────────────────────────
function DrawerContent({
  lead,
  onClose,
  onStatusChange,
  onSaveNotes,
  updatingStatus,
  isMobile = false,
}: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (status: LeadStatus) => Promise<void>;
  onSaveNotes: (id: string, notes: string) => Promise<void>;
  updatingStatus: boolean;
  isMobile?: boolean;
}) {
  return (
    <>
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 px-6 py-5 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="min-w-0 flex-1">
          <h2
            className="text-xl font-semibold tracking-tight leading-tight truncate"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: 'var(--ds-text-primary)',
            }}
          >
            {lead.name || 'Unknown'}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <StatusSelect
              status={lead.status}
              disabled={updatingStatus}
              onChange={onStatusChange}
            />
          </div>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 p-1.5 rounded-lg transition-colors duration-150 mt-0.5"
          style={{ color: 'var(--ds-text-tertiary)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Timestamps */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Calendar size={12} style={{ color: 'var(--ds-text-tertiary)' }} />
            <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
              Submitted {formatDate(lead.created_at)}
            </span>
          </div>
          {lead.created_at !== lead.updated_at && (
            <div className="flex items-center gap-2 pl-5">
              <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
                Updated {formatDate(lead.updated_at)}
              </span>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {(lead.phone || lead.email) && (
          <div>
            <Label>Quick actions</Label>
            <div className="mt-2">
              <QuickActionBar phone={lead.phone} email={lead.email} compact={false} />
            </div>
          </div>
        )}

        {/* Contact details */}
        {(lead.email || lead.phone) && (
          <div>
            <Label>Contact</Label>
            <div className="mt-2 space-y-1.5">
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-sm transition-colors duration-150"
                  style={{ color: 'var(--ds-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                >
                  <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)', minWidth: '36px' }}>Email</span>
                  {lead.email}
                </a>
              )}
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 text-sm transition-colors duration-150"
                  style={{ color: 'var(--ds-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                >
                  <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)', minWidth: '36px' }}>Phone</span>
                  {lead.phone}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        {lead.message && (
          <div>
            <Label icon={<MessageSquare size={11} />}>Message</Label>
            <div
              className="mt-2 rounded-xl p-4"
              style={{ background: 'var(--ds-bg-overlay)' }}
            >
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--ds-text-secondary)' }}
              >
                {lead.message}
              </p>
            </div>
          </div>
        )}

        {/* Source */}
        {(lead.source_page || lead.listing_slug) && (
          <div>
            <Label>Source</Label>
            <div className="mt-2 space-y-1.5">
              {lead.source_page && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
                  <MapPin size={11} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
                  <span>{formatSourcePage(lead.source_page)}</span>
                </div>
              )}
              {lead.listing_slug && (
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ds-text-secondary)' }}>
                  <Tag size={11} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
                  <span>{formatSourcePage(lead.listing_slug)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <Label>Private notes</Label>
          <div className="mt-2">
            <NotesEditor
              leadId={lead.id}
              initialNotes={lead.notes ?? ''}
              onSave={onSaveNotes}
            />
          </div>
        </div>

        {/* Bottom spacing so notes editor isn't flush with edge on mobile */}
        {isMobile && <div className="h-4" />}
      </div>
    </>
  );
}

// ── Small label helper ─────────────────────────────────────────
function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span style={{ color: 'var(--ds-text-tertiary)' }}>{icon}</span>}
      <p
        className="text-[10px] font-medium tracking-[0.14em] uppercase"
        style={{ color: 'var(--ds-text-tertiary)' }}
      >
        {children}
      </p>
    </div>
  );
}
