import { useEffect, useRef, useState } from 'react';
import { X, Calendar, MessageSquare, ClipboardList } from 'lucide-react';
import { Lead } from '../LeadList';
import { LeadStatus } from './StatusBadge';
import { ContactChannel } from '../types';
import StatusSelect from './StatusSelect';
import QuickActionBar from './QuickActionBar';
import NotesEditor from './NotesEditor';
import ContactTimer from './ContactTimer';
import LogContactModal from './LogContactModal';
import FollowUpSection from './FollowUpSection';
import ActivityHistory from './ActivityHistory';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate } from '../../../utils/formatDate';

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onSaveNotes: (id: string, notes: string, expectedNotes: string) => Promise<void>;
  onLeadUpdate?: (lead: Lead) => void;
}

const ANIMATION_DURATION = 300;

export default function LeadDrawer({ lead, onClose, onStatusChange, onSaveNotes, onLeadUpdate }: LeadDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const prevLeadRef = useRef<Lead | null>(null);

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

  const displayLead = lead ?? prevLeadRef.current;

  useEffect(() => {
    if (!isRendered) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isRendered, onClose]);

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
          onLeadUpdate={onLeadUpdate}
          updatingStatus={updatingStatus}
        />
      </div>

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
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>
        <DrawerContent
          lead={displayLead}
          onClose={onClose}
          onStatusChange={handleStatusChange}
          onSaveNotes={onSaveNotes}
          onLeadUpdate={onLeadUpdate}
          updatingStatus={updatingStatus}
          isMobile
        />
      </div>
    </>
  );
}

function DrawerContent({
  lead,
  onClose,
  onStatusChange,
  onSaveNotes,
  onLeadUpdate,
  updatingStatus,
  isMobile = false,
}: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (status: LeadStatus) => Promise<void>;
  onSaveNotes: (id: string, notes: string, expectedNotes: string) => Promise<void>;
  onLeadUpdate?: (lead: Lead) => void;
  updatingStatus: boolean;
  isMobile?: boolean;
}) {
  const { showToast } = useToast();
  const [showLogModal, setShowLogModal] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);
  const [callbackPending, setCallbackPending] = useState(false);
  const [callbackWork,setCallbackWork] = useState<{owner:string|null;due:string|null;status:string}|null>(null);
  useEffect(() => {
    let alive=true;
    setCallbackPending(false);
    setCallbackWork(null);
    const getWork=async()=>{
      const {data:conversations,error}=await supabase.from('ai_conversations')
        .select('id,status,assigned_to').eq('lead_id',lead.id).in('status',['waiting_human','human']);
      if(!alive||error||!conversations?.length)return;
      const {data:tasks}=await supabase.from('ai_concierge_tasks')
        .select('conversation_id,due_at,status,assigned_to')
        .in('conversation_id',conversations.map(c=>c.id)).in('status',['pending','claimed'])
        .order('due_at',{ascending:true}).limit(1);
      if(!alive)return;
      const first=tasks?.[0];
      setCallbackPending(true);
      setCallbackWork({owner:first?.assigned_to??conversations[0].assigned_to??null,
        due:first?.due_at??null,status:first?.status??conversations[0].status});
    };
    void getWork();
    return ()=>{alive=false;};
  },[lead.id,activityRefreshKey]);

  const handleLogContact = async (channel: ContactChannel, notes: string, outcome: string, resolve: boolean, followupAt: string | null) => {
    const {error} = await supabase.rpc('crm_record_contact_outcome',{
      p_lead:lead.id,p_channel:channel,p_outcome:outcome,p_notes:notes,
      p_resolve:resolve,p_followup_at:followupAt
    });
    if(error) throw new Error(error.message);
    const now = new Date().toISOString();
    const nextStatus = lead.status==='new' && (outcome==='spoke'||outcome==='replied') ? 'contacted' : lead.status;
    onLeadUpdate?.({...lead,last_contacted_at:now,status:nextStatus});
    if(resolve) setCallbackPending(false);
    setActivityRefreshKey(k=>k+1);
    setShowLogModal(false);
    showToast(resolve?'Contact recorded, callback resolved.':'Contact recorded. Next action remains tracked.');
  };

  const handleActivity = async (eventType: string, description: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const actor = userData.user?.email ?? null;

    const { error } = await supabase
      .from('lead_activities')
      .insert({ lead_id: lead.id, event_type: eventType, description, actor });

    if (error) {
      // Non-fatal — activity logging should not block the primary action
      console.error('[lead_activities] insert failed:', error.message);
    }
    setActivityRefreshKey(k => k + 1);
  };

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
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--ds-text-primary)' }}
          >
            {lead.name || 'Unknown'}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <StatusSelect status={lead.status} disabled={updatingStatus} onChange={onStatusChange} />
          </div>
          {lead.status !== 'closed' && lead.status !== 'archived' && (
            <div className="mt-2">
              <ContactTimer createdAt={lead.created_at} lastContactedAt={lead.last_contacted_at} status={lead.status} />
            </div>
          )}
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

        {/* Quick actions + Log Contact */}
        {(lead.phone || lead.email) && (
          <div>
            <Label>Quick actions</Label>
            <div className="mt-2 space-y-2">
              <QuickActionBar phone={lead.phone} email={lead.email} compact={false} />
              <button
                onClick={() => setShowLogModal(true)}
                className="flex items-center justify-center gap-1.5 rounded-lg w-full h-10 text-[13px] font-medium transition-all duration-150"
                style={{
                  color: 'var(--ds-text-secondary)',
                  background: 'var(--ds-bg-overlay)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--ds-text-primary)';
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.18)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--ds-text-secondary)';
                  e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.08)';
                }}
              >
                <ClipboardList size={14} />
                Record Interaction
              </button>
            </div>
          </div>
        )}

        {callbackPending && <section aria-label="Callback next action" className="rounded-xl border border-red-500/50 bg-[#281316]/80 p-4 text-sm text-[#f5d9d2]">
          <p className="font-semibold text-red-200">Callback needs attention</p>
          <p className="mt-2">Assigned to: {callbackWork?.owner??'Unassigned'}</p>
          <p className="mt-1">Next action: Contact customer, record a Call, Text, or Email outcome, then resolve or schedule follow-up.</p>
          <p className="mt-1">Due: {callbackWork?.due?new Date(callbackWork.due).toLocaleString():'Awaiting staff review'}</p>
          <button type="button" onClick={()=>setShowLogModal(true)} className="mt-3 rounded-lg bg-[#c8a96e] px-4 py-2 font-semibold text-black">Record Contact Outcome</button>
        </section>}

        {/* Follow-up section */}
        <FollowUpSection leadId={lead.id} leadStatus={lead.status} onActivity={handleActivity} />

        {/* Contact details */}
        {(lead.email || lead.phone) && (
          <div>
            <Label>Contact</Label>
            <div className="mt-2 space-y-1.5">
              {lead.email && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#f0ede8' }}>
                  <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)', minWidth: '36px' }}>Email</span>
                  <span style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#f0ede8' }}>
                  <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)', minWidth: '36px' }}>Phone</span>
                  <span style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{lead.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        {lead.message && (
          <div>
            <Label icon={<MessageSquare size={11} />}>Message</Label>
            <div className="mt-2 rounded-xl p-4" style={{ background: 'var(--ds-bg-overlay)' }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap italic" style={{ color: '#f0ede8' }}>
                {lead.message}
              </p>
            </div>
          </div>
        )}

        {/* Activity History */}
        <ActivityHistory
          leadId={lead.id}
          createdAt={lead.created_at}
          notesJson={lead.notes ?? ''}
          refreshKey={activityRefreshKey}
        />

        {/* Notes with integrated per-note attachments */}
        <div>
          <Label>Private notes</Label>
          <div className="mt-2">
            <NotesEditor
              leadId={lead.id}
              initialNotes={lead.notes ?? ''}
              onSave={onSaveNotes}
              onError={() => {}}
            />
          </div>
        </div>

        {isMobile && <div className="h-4" />}
      </div>

      {showLogModal && (
        <LogContactModal
          leadName={lead.name}
          onLog={handleLogContact}
          callbackPending={callbackPending}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1.5 pl-2.5"
      style={{ borderLeft: '2px solid var(--ds-gold-dim)' }}
    >
      {icon && <span style={{ color: 'var(--ds-text-tertiary)' }}>{icon}</span>}
      <p
        className="text-[10px] font-medium tracking-[0.14em] uppercase"
        style={{ color: 'var(--ds-text-secondary)' }}
      >
        {children}
      </p>
    </div>
  );
}
