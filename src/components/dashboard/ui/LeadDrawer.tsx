import { useEffect, useRef, useState } from 'react';
import {Link} from 'react-router-dom';
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
import RelatedLeadReview from './RelatedLeadReview';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate, formatDashboardDateTime, formatDallasDateTime } from '../../../utils/formatDate';

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
  const [callbackChoices,setCallbackChoices]=useState<Array<{conversation_id:string;due_at:string|null;status:string;assigned_to:string|null;created_at:string;request_kind:string}>>([]);
  const [callbackWork,setCallbackWork] = useState<{owner:string|null;due:string|null;status:string;conversationId:string;requestKind:'callback'|'live_chat';requestedAt:string|null;otherRequests:number}|null>(null);
  useEffect(() => {
    let alive=true;
    setCallbackPending(false);
    setCallbackWork(null);
    setCallbackChoices([]);
    const getWork=async()=>{
      const {data:conversations,error}=await supabase.from('ai_conversations')
        .select('id,status,assigned_to').eq('lead_id',lead.id).in('status',['waiting_human','human']);
      if(!alive||error||!conversations?.length)return;
      const {data:tasks}=await supabase.from('ai_concierge_tasks')
        .select('conversation_id,due_at,status,assigned_to,created_at,request_kind')
        .in('conversation_id',conversations.map(c=>c.id)).in('status',['pending','claimed'])
        .order('due_at',{ascending:true}).limit(25);
      if(!alive)return;
      setCallbackChoices(tasks??[]);
      const first=tasks?.[0];
      if(!first)return;
      setCallbackPending(true);
      setCallbackWork({owner:first.assigned_to??conversations.find(c=>c.id===first.conversation_id)?.assigned_to??null,
        due:first.due_at??null,status:first.status,conversationId:first.conversation_id,
        requestedAt:first.created_at??null,requestKind:first.request_kind==='callback'?'callback':'live_chat',
        otherRequests:Math.max(0,(tasks?.length??0)-1)});
    };
    void getWork();
    return ()=>{alive=false;};
  },[lead.id,activityRefreshKey]);

  const handleLogContact = async (channel: ContactChannel, notes: string, outcome: string, resolve: boolean, followupAt: string | null) => {
    const {error} = callbackPending && callbackWork?.conversationId
      ? await supabase.rpc('crm_record_chat_contact_outcome',{
          p_conversation:callbackWork.conversationId,p_channel:channel,p_outcome:outcome,
          p_notes:notes,p_resolve:resolve,p_followup_at:followupAt
        })
      : await supabase.rpc('crm_record_contact_outcome',{
          p_lead:lead.id,p_channel:channel,p_outcome:outcome,p_notes:notes,
          p_resolve:resolve,p_followup_at:followupAt
        });
    if(error) throw new Error(error.message);
    const now = new Date().toISOString();
    const nextStatus = lead.status==='new' && (outcome==='spoke'||outcome==='replied') ? 'contacted' : lead.status;
    onLeadUpdate?.({...lead,last_contacted_at:(outcome==='spoke'||outcome==='replied')?now:lead.last_contacted_at,status:nextStatus});
    if(resolve) setCallbackPending(false);
    setActivityRefreshKey(k=>k+1);
    setShowLogModal(false);
    showToast(resolve?'Contact recorded, callback resolved.':'Interaction logged. Follow-up or next action remains tracked.');
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
              Lead created {formatDate(lead.created_at)}
            </span>
          </div>
          {callbackPending&&callbackWork?.requestedAt&&<div className="flex items-center gap-2 pl-5">
            <span className="text-xs font-semibold text-[#dfc391]">{callbackWork.requestKind==='callback'?'Callback requested':'Live chat requested'} {formatDate(callbackWork.requestedAt)}</span>
          </div>}
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
                type="button"
                className={'flex items-center justify-center gap-1.5 rounded-lg w-full min-h-11 px-3 text-[13px] font-semibold transition-all duration-150 '+(callbackPending?'border border-[#ead19f] bg-gradient-to-r from-[#efd8a5] via-[#d8b471] to-[#ba8d44] text-[#191208] shadow-[0_5px_18px_rgba(212,171,102,.2)] hover:brightness-110':'border border-white/10 bg-white/5 text-[#c7b9a3] hover:border-white/25 hover:text-white')}
              >
                <ClipboardList size={14} />
                {callbackPending ? 'Record Contact Outcome' : 'Record Interaction'}
              </button>
            </div>
          </div>
        )}

        {callbackPending && <section aria-label="Callback next action" className="rounded-xl border border-red-500/50 bg-[#281316]/80 p-4 text-sm text-[#f5d9d2]">
          <p className="font-semibold text-red-200">{callbackWork?.requestKind==='callback'?'Callback needs attention':'Chat request needs attention'}</p>
          {callbackChoices.length>1&&<div className="mt-3 space-y-2">
            <label htmlFor="crm-callback-request" className="block text-xs font-semibold text-amber-200">Active callback requests ({callbackChoices.length})</label>
            <select id="crm-callback-request" value={callbackWork?.conversationId??''}
              onChange={e=>{const t=callbackChoices.find(x=>x.conversation_id===e.target.value);if(t)setCallbackWork({
                owner:t.assigned_to??null,due:t.due_at,status:t.status,conversationId:t.conversation_id,
                requestKind:t.request_kind==='callback'?'callback':'live_chat',
                requestedAt:t.created_at,otherRequests:callbackChoices.length-1
              });}}
              className="w-full min-h-11 rounded-lg border border-amber-200/40 bg-[#201719] p-2 text-xs text-[#f5dfbd]">
              {callbackChoices.map((t,i)=><option key={t.conversation_id} value={t.conversation_id}>{t.request_kind==='callback'?'Request':'Live chat'} {i+1} · {t.request_kind==='callback'?'Received':'Started'} {new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(t.created_at))}</option>)}
            </select>
            <p className="text-xs leading-relaxed text-[#edd1a4]">Only outstanding requests appear in this action selector. Historical and completed requests remain in the customer timeline below. The times shown are when each request was received, not scheduled appointments.</p>
          </div>}
          {callbackWork?.conversationId&&<Link className="mt-2 inline-flex min-h-10 items-center rounded-lg border border-amber-200/40 px-3 py-2 text-xs font-semibold text-[#f2d4a3]" to={'/dashboard/conversations?conversation='+encodeURIComponent(callbackWork.conversationId)}>Open requested conversation</Link>}
          <p className="mt-2">Assigned to: {callbackWork?.owner?({'yourcustomerflowguy@gmail.com':'Josh','heberherrera92@gmail.com':'Heber','missydourshomes@gmail.com':'Missy'} as Record<string,string>)[callbackWork.owner.toLowerCase()]??'Team member':'Unassigned'}</p>
          <p className="mt-1">Next action: Review the conversation, contact the visitor when appropriate, then record a confirmed outcome or schedule follow-up for this request.</p>
          {callbackWork?.requestedAt&&<div className="mt-3 text-xs leading-relaxed text-[#e9d7b8]">
            <p>Request received · Your local time: {formatDashboardDateTime(callbackWork.requestedAt)}</p>
            <p>Texas office time: {formatDallasDateTime(callbackWork.requestedAt)}</p>
          </div>}
          <div className="mt-2 space-y-1 text-xs leading-relaxed text-[#f4cfac]">
            <p className="font-semibold">Staff response status · {callbackWork?.status==='claimed'?'Assigned, outcome required':'Awaiting staff attention'}</p>
            {callbackWork?.due&&callbackWork.requestedAt&&new Date(callbackWork.due).getTime()>new Date(callbackWork.requestedAt).getTime()+5000
             ?<><p>Next scheduled staff follow-up · {formatDallasDateTime(callbackWork.due)}</p><p className="text-[#cdb79a]">This is a staff-planned follow-up, not a customer-confirmed appointment unless separately agreed.</p></>
             :<><p>Callback appointment · Not yet scheduled</p><p className="text-[#cdb79a]">The request timestamp is not a promised call time. Choose a future Dallas office-hours appointment when recording an outcome.</p></>}
          </div>
          <p className="mt-3 text-xs text-[#e6c89c]">Use the Record Contact Outcome action in Quick Actions above to log the call, text, or email and resolve or schedule follow-up.</p>
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

        <RelatedLeadReview lead={{id:lead.id,name:lead.name,phone:lead.phone,email:lead.email}} />

        {/* Combined customer timeline, including archived or completed linked chats. */}
        <ActivityHistory
          leadId={lead.id}
          sourcePage={lead.source_page}
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
