import { useEffect, useRef, useState } from 'react';
import { X, Calendar, MessageSquare, ClipboardList, PhoneCall } from 'lucide-react';
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
import CallbackAttentionPanel from './CallbackAttentionPanel';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../contexts/ToastContext';
import { formatDate } from '../../../utils/formatDate';
import { displayLeadMessage, isRecoveredCallbackMessage } from '../../../utils/leadMessage';

interface LeadDrawerProps {
  lead: Lead | null;
  onClose: () => void;
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>;
  onSaveNotes: (id: string, notes: string, expectedNotes: string) => Promise<void>;
  onLeadUpdate?: (lead: Lead) => void;
  onConsolidated?: () => void;
}

const ANIMATION_DURATION = 300;

export default function LeadDrawer({ lead, onClose, onStatusChange, onSaveNotes, onLeadUpdate, onConsolidated }: LeadDrawerProps) {
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

  useEffect(()=>{
    if(!isRendered)return;
    const handler=(e:KeyboardEvent)=>{
      if(e.key==='Escape'&&!document.querySelector('[aria-labelledby="crm-consolidation-title"],[aria-label="Record customer interaction"]'))onClose();
    };
    document.addEventListener('keydown',handler);
    return()=>document.removeEventListener('keydown',handler);
  },[isRendered,onClose]);

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
        className={'fixed bottom-0 left-0 right-0 z-50 flex max-h-[92dvh] min-h-0 flex-col overflow-hidden rounded-t-[20px] bg-[#191613] shadow-[0_-8px_40px_rgba(0,0,0,.55)] transition-transform duration-300 sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:max-h-full sm:w-[420px] sm:rounded-none sm:shadow-[-8px_0_40px_rgba(0,0,0,.5)] '+(isVisible?'translate-y-0 sm:translate-x-0':'translate-y-full sm:translate-y-0 sm:translate-x-full')}
        role="dialog" aria-modal="true" aria-label={`Lead: ${displayLead.name}`}>
        <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden">
          <div className="h-1 w-9 rounded-full bg-white/20"/>
        </div>
        <DrawerContent
          lead={displayLead}
          onClose={onClose}
          onStatusChange={handleStatusChange}
          onSaveNotes={onSaveNotes}
          onLeadUpdate={onLeadUpdate}
          onConsolidated={onConsolidated}
          updatingStatus={updatingStatus}
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
  onConsolidated,
  updatingStatus,
}: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (status: LeadStatus) => Promise<void>;
  onSaveNotes: (id: string, notes: string, expectedNotes: string) => Promise<void>;
  onLeadUpdate?: (lead: Lead) => void;
  onConsolidated?: () => void;
  updatingStatus: boolean;
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
        // Display the newest received request first. Due dates are for scheduling,
         // not for deciding which customer submission is shown by default.
         .order('created_at',{ascending:false})
         .order('conversation_id',{ascending:false}).limit(25);
      if(!alive)return;
      setCallbackChoices(tasks??[]);
      const first=tasks?.[0]; // Most recently received request
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
            {(lead.name || 'Unknown').replace(/\bJosh\s+Lad\b/gi,'Josh')}
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 space-y-6">

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
              {!callbackPending&&<button
                onClick={() => setShowLogModal(true)}
                type="button"
                className={'flex items-center justify-center gap-1.5 rounded-lg w-full min-h-11 px-3 text-[13px] font-semibold transition-all duration-150 '+(callbackPending?'border border-[#ead19f] bg-gradient-to-r from-[#efd8a5] via-[#d8b471] to-[#ba8d44] text-[#191208] shadow-[0_5px_18px_rgba(212,171,102,.2)] hover:brightness-110':'border border-white/10 bg-white/5 text-[#c7b9a3] hover:border-white/25 hover:text-white')}
              >
                <ClipboardList size={14} />
                Record Interaction
              </button>}
            </div>
          </div>
        )}

        {callbackPending&&lead.status!=='archived'&&<CallbackAttentionPanel choices={callbackChoices} selected={callbackWork}
         onSelect={t=>setCallbackWork({owner:t.assigned_to,due:t.due_at,status:t.status,
         conversationId:t.conversation_id,requestKind:t.request_kind==='callback'?'callback':'live_chat',
         requestedAt:t.created_at,otherRequests:callbackChoices.length-1})}
         onOutcome={()=>setShowLogModal(true)}/>}

        {callbackPending&&lead.status==='archived'&&<p className="rounded-lg border border-white/10 px-3 py-2 text-xs text-[#cbb995]">Archived customer · Outstanding callback history is retained. Restore the lead to resume follow-up.</p>}

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

        {/* Older recovered callbacks are internal CRM intake markers, not customer-written messages. */}
        {lead.message && (
          <div>
            <Label icon={isRecoveredCallbackMessage(lead.message)?<PhoneCall size={11}/>:<MessageSquare size={11}/>}>
              {isRecoveredCallbackMessage(lead.message)?'Callback request':'Customer message'}
            </Label>
            <div className="relative mt-2 overflow-hidden rounded-xl border border-[#dfbb7b]/70 bg-gradient-to-br from-[#342719] via-[#251d17] to-[#1e1915] p-4 shadow-[0_0_0_1px_rgba(240,195,121,.10),0_8px_28px_rgba(199,143,71,.13),inset_0_1px_rgba(255,245,216,.09)]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-full bg-[#eac588] shadow-[0_0_12px_rgba(234,197,136,.65)]"/>
              {isRecoveredCallbackMessage(lead.message)&&
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#eacc95]">
                  <PhoneCall size={14} aria-hidden="true"/> Previous callback request
                </div>}
              <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium not-italic text-[#f6ebda]">
                {displayLeadMessage(lead.message)}
              </p>
            </div>
          </div>
        )}

        <RelatedLeadReview lead={{id:lead.id,name:lead.name,phone:lead.phone,email:lead.email}}
         onConsolidated={()=>{setActivityRefreshKey(n=>n+1);onConsolidated?.();}} />

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

        <div className="h-4 sm:hidden" />
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
