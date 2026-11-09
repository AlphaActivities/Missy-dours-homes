import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Calendar, FileText, CheckCircle2, Clock, StickyNote, Paperclip, Trash2, AlertCircle, MessagesSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { LeadActivity } from '../types';

interface ActivityHistoryProps {
  leadId: string;
  createdAt: string;
  notesJson: string;
  refreshKey: number;
}

interface ActivityDisplay {
  icon: React.ReactNode;
  color: string;
  description: string;
  actor: string | null;
  timestamp: string;
  href?: string;
  category?: 'chat'|'callback'|'crm';
}

const ICON_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  inquiry:               { icon: <Calendar size={12} />,        color: 'var(--ds-text-tertiary)' },
  contact_logged:        { icon: <Phone size={12} />,           color: '#9ec5e0' },
  followup_scheduled:    { icon: <Calendar size={12} />,        color: '#d9bc85' },
  followup_completed:    { icon: <CheckCircle2 size={12} />,    color: '#7dbfa0' },
  followup_cancelled:    { icon: <AlertCircle size={12} />,     color: 'var(--ds-text-tertiary)' },
  followup_rescheduled:  { icon: <Clock size={12} />,           color: '#d9bc85' },
  status_changed:        { icon: <CheckCircle2 size={12} />,    color: 'var(--ds-text-secondary)' },
  note_saved:            { icon: <StickyNote size={12} />,      color: 'var(--ds-text-tertiary)' },
  attachment_added:      { icon: <Paperclip size={12} />,       color: 'var(--ds-text-tertiary)' },
  attachment_removed:    { icon: <Trash2 size={12} />,          color: 'var(--ds-text-tertiary)' },
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ActivityHistory({ leadId, createdAt, notesJson, refreshKey }: ActivityHistoryProps) {
  const [activities, setActivities] = useState<ActivityDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleLimit,setVisibleLimit]=useState(25);
  const [historyWarning,setHistoryWarning]=useState<string|null>(null);
  const [available, setAvailable] = useState(true);

  const fetchActivities = useCallback(async () => {
    const [activityResult, conversationsResult, followupsResult] = await Promise.all([
      supabase.from('lead_activities').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(500),
      supabase.from('ai_conversations').select('id,title,started_at,last_message_at,status,opportunity_kind')
        .eq('lead_id',leadId).order('started_at',{ascending:false}).limit(500),
      supabase.from('lead_followups').select('id,created_at,due_at,task,status,completed_at')
        .eq('lead_id',leadId).order('created_at',{ascending:false}).limit(500)
    ]);
    const {data,error}=activityResult;

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        setAvailable(false);
      }
      setActivities([]);
      setLoading(false);
      return;
    }

    const dbActivities = (data as LeadActivity[]) ?? [];

    // Build display items: inquiry event from created_at + DB activities + notes from JSON
    const items: ActivityDisplay[] = [];
    const warnings:string[]=[];
    if(conversationsResult.error)warnings.push('Linked chat history could not be loaded.');
    if(followupsResult.error)warnings.push('Scheduled follow-up history could not be loaded.');
    if((conversationsResult.data?.length??0)===500 || (data?.length??0)===500 || (followupsResult.data?.length??0)===500)
      warnings.push('Some older history may require a separate export.');
    setHistoryWarning(warnings.length?warnings.join(' '):null);
    const linkedChats=conversationsResult.data??[];
    for(const chat of linkedChats){
      items.push({
        icon:<MessagesSquare size={12}/>, color:'#e2bb7c',category:'chat',
        description:'Chatbot conversation started'+(chat.opportunity_kind?' · '+chat.opportunity_kind:'')+
         ' · '+(chat.status==='closed'?'Closed':chat.status==='human'?'Staff assigned':chat.status==='waiting_human'?'Awaiting staff':'AI conversation'),
        actor:null,timestamp:chat.started_at,
        href:'/dashboard/conversations?conversation='+encodeURIComponent(chat.id)
      });
    }
    if(linkedChats.length){
      const ids=linkedChats.map(c=>c.id);
      for(let offset=0;offset<ids.length;offset+=100){
        const result=await supabase.from('ai_concierge_tasks')
          .select('id,conversation_id,created_at,completed_at,status,request_kind,assigned_to')
          .in('conversation_id',ids.slice(offset,offset+100));
        if(result.error){warnings.push('Callback task history could not be loaded.');continue;}
        for(const task of result.data??[]){
          const href='/dashboard/conversations?conversation='+encodeURIComponent(task.conversation_id);
          items.push({icon:<Phone size={12}/>,color:'#e1ae83',category:'callback',
           description:(task.request_kind==='callback'?'Callback requested':'Human assistance requested')+
            ' · '+(task.status==='completed'?'Completed':task.status==='claimed'?'Assigned':'Pending'),
           actor:task.assigned_to,timestamp:task.created_at,href});
          if(task.completed_at)items.push({icon:<CheckCircle2 size={12}/>,color:'#7dbfa0',category:'callback',
            description:'Callback task completed',actor:task.assigned_to,timestamp:task.completed_at,href});
        }
      }
    }
    for(const followup of followupsResult.data??[]){
      items.push({icon:<Calendar size={12}/>,color:'#d9bc85',category:'crm',
        description:'Follow-up '+(followup.status==='completed'?'completed':followup.status==='cancelled'?'cancelled':'scheduled')+
          ' · '+followup.task+' · Due '+formatDateTime(followup.due_at),
        actor:null,timestamp:followup.created_at});
      if(followup.completed_at)items.push({icon:<CheckCircle2 size={12}/>,color:'#7dbfa0',
        description:'Follow-up completed · '+followup.task,actor:null,timestamp:followup.completed_at});
    }
    if(warnings.length)setHistoryWarning([...new Set(warnings)].join(' '));

    // Always show inquiry received
    items.push({
      icon: ICON_MAP.inquiry.icon,
      color: ICON_MAP.inquiry.color,
      description: 'Inquiry received',
      actor: null,
      timestamp: createdAt,
    });

    // Add DB-recorded activities
    for (const a of dbActivities) {
      const iconCfg = ICON_MAP[a.event_type] ?? { icon: <FileText size={12} />, color: 'var(--ds-text-tertiary)' };
      items.push({
        icon: iconCfg.icon,
        color: iconCfg.color,
        description: a.description,
        actor: a.actor,
        timestamp: a.created_at,
      });
    }

    // Parse existing notes JSON and show as note events with their real timestamps
    if (notesJson) {
      try {
        const parsed = JSON.parse(notesJson);
        if (Array.isArray(parsed)) {
          for (const note of parsed) {
            if (note.text || (note.attachments && note.attachments.length > 0)) {
              const attCount = note.attachments?.length ?? 0;
              const plural = attCount > 1 ? 's' : '';
              let desc: string;
              if (note.text) {
                const truncated = note.text.slice(0, 80) + (note.text.length > 80 ? '…' : '');
                desc = attCount > 0 ? `${truncated} (+${attCount} file${plural})` : truncated;
              } else {
                desc = `Private note with ${attCount} file${plural}`;
              }
              items.push({
                icon: ICON_MAP.note_saved.icon,
                color: ICON_MAP.note_saved.color,
                description: desc,
                actor: note.author || null,
                timestamp: note.created_at,
              });
            }
          }
        }
      } catch {
        // Legacy free-text note
        if (notesJson.trim()) {
          items.push({
            icon: ICON_MAP.note_saved.icon,
            color: ICON_MAP.note_saved.color,
            description: notesJson.slice(0, 80) + (notesJson.length > 80 ? '…' : ''),
            actor: null,
            timestamp: createdAt,
          });
        }
      }
    }

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setActivities(items);
    setAvailable(true);
    setLoading(false);
  }, [leadId, createdAt, notesJson]);

  useEffect(() => {
    setVisibleLimit(25);
    setLoading(true);
    setAvailable(true);
    fetchActivities();
  }, [leadId, createdAt, notesJson, refreshKey, fetchActivities]);

  if (!available) return null;
  if (loading) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 pl-2.5" style={{ borderLeft: '2px solid var(--ds-gold-dim)' }}>
        <p className="text-[10px] font-medium tracking-[0.14em] uppercase" style={{ color: 'var(--ds-text-secondary)' }}>
          Complete Customer Timeline
        </p>
      </div>

      {historyWarning&&<p role="status" className="mt-2 rounded-lg border border-amber-500/30 p-2 text-xs text-amber-200">{historyWarning}</p>}
      <p className="mt-2 text-[11px] text-[#bca68b]">Original inquiry, staff actions, follow-ups, and linked chat history. Unlinked anonymous chats are not assigned to this customer.</p>
      <div className="mt-2 space-y-0.5">
        {activities.slice(0, visibleLimit).map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 py-2 px-1 rounded-lg"
            style={{ borderBottom: i < Math.min(activities.length, visibleLimit) - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: item.color }}>
              {item.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-snug" style={{ color: 'var(--ds-text-secondary)' }}>{item.description}</p>
              {item.href&&<Link to={item.href} className="mt-1 inline-flex min-h-9 items-center text-xs font-semibold text-[#edce94] underline underline-offset-2">Open saved transcript</Link>}
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--ds-text-tertiary)' }}>
                  {formatDateTime(item.timestamp)}
                </span>
                {item.actor && (
                  <span className="text-[10px]" style={{ color: 'var(--ds-text-tertiary)' }}>
                    · {item.actor.split('@')[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {activities.length>visibleLimit&&<button type="button" onClick={()=>setVisibleLimit(n=>n+25)}
       className="mt-3 min-h-10 w-full rounded-lg border border-[#b89b69]/40 px-3 text-xs font-semibold text-[#e8cc9a]">Show older activity ({activities.length-visibleLimit} remaining)</button>}
    </div>
  );
}
