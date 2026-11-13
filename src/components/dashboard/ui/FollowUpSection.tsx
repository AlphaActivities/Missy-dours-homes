import TexasCallbackPicker from './TexasCallbackPicker';
import {validateTexasOfficeSlot,texasDateTime} from '../../../lib/texasScheduling';
import { useState, useEffect, useCallback } from 'react';
import { Calendar, CalendarPlus, Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { LeadFollowup } from '../types';
import { useToast } from '../../../contexts/ToastContext';

interface FollowUpSectionProps {
  leadId: string;
  leadStatus: string;
  onActivity: (eventType: string, description: string) => void;
}

function formatDueDate(iso: string): string {return texasDateTime(iso);}

function getFollowupStatus(fu: LeadFollowup): 'upcoming' | 'today' | 'overdue' | 'completed' | 'cancelled' {
  if (fu.status === 'completed') return 'completed';
  if (fu.status === 'cancelled') return 'cancelled';
  const officeDate=(value:Date)=>new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(value);
  const today=officeDate(new Date());
  const dueDay=officeDate(new Date(fu.due_at));
  if(new Date(fu.due_at).getTime()<Date.now())return 'overdue';
  if(dueDay===today)return 'today';
  return 'upcoming';
}

export default function FollowUpSection({ leadId, onActivity }: FollowUpSectionProps) {
  const { showToast } = useToast();
  const [followups, setFollowups] = useState<LeadFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [task, setTask] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rescheduleId,setRescheduleId]=useState<string|null>(null);
  const [rescheduleValue,setRescheduleValue]=useState('');

  const fetchFollowups = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_followups')
      .select('*')
      .eq('lead_id', leadId)
      .order('due_at', { ascending: true });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        setAvailable(false);
      }
      setLoadError(true);
      setFollowups([]);
      setLoading(false);
      return;
    }
    setAvailable(true);
    setLoadError(false);
    setFollowups((data as LeadFollowup[]) ?? []);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    setLoading(true);
    setAvailable(true);
    fetchFollowups();
  }, [leadId, fetchFollowups]);

  // Show the next actionable appointment first, including overdue work.
  const active = followups.filter(f => f.status === 'active')
    .sort((a,b) => Date.parse(a.due_at) - Date.parse(b.due_at));
  const history = followups.filter(f => f.status !== 'active');

  const handleSave = async () => {
    if (!dueDate || !dueTime || saving) return;
    let dueAt:string;
    try{dueAt=validateTexasOfficeSlot(dueDate,dueTime).toISOString();}
    catch(e){showToast(e instanceof Error?e.message:'Choose a valid Dallas office time.','error');return;}
    setSaving(true);

    const { data: userData } = await supabase.auth.getUser();
    const actor = userData.user?.email ?? null;

    const { data, error } = await supabase
      .from('lead_followups')
      .insert({ lead_id: leadId, due_at: dueAt, task: task.trim() || 'Follow up', status: 'active', created_by: actor })
      .select()
      .single();

    if (error) {
      showToast('Failed to schedule follow-up.', 'error');
      setSaving(false);
      return;
    }

    onActivity('followup_scheduled', `Follow-up scheduled for ${formatDueDate(dueAt)}`);
    setFollowups(prev => [data as LeadFollowup, ...prev]);
    setDueDate('');
    setDueTime('');
    setTask('');
    setShowForm(false);
    setSaving(false);
    showToast('Follow-up scheduled.');
  };

  const handleComplete = async (fu: LeadFollowup) => {
    if(actionId)return;
    setActionId(fu.id);
    const { error } = await supabase
      .from('lead_followups')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', fu.id);

    if (error) {
      showToast('Failed to complete follow-up.', 'error');
      setActionId(null);
      return;
    }

    onActivity('followup_completed', `Follow-up completed: ${fu.task}`);
    setFollowups(prev => prev.map(f => f.id === fu.id ? { ...f, status: 'completed', completed_at: new Date().toISOString() } : f));
    setActionId(null);
    showToast('Follow-up marked complete.');
  };

  const handleCancel = async (fu: LeadFollowup) => {
    if(actionId)return;
    setActionId(fu.id);
    const { error } = await supabase
      .from('lead_followups')
      .update({ status: 'cancelled' })
      .eq('id', fu.id);

    if (error) {
      showToast('Failed to cancel follow-up.', 'error');
      setActionId(null);
      return;
    }

    onActivity('followup_cancelled', `Follow-up cancelled: ${fu.task}`);
    setFollowups(prev => prev.map(f => f.id === fu.id ? { ...f, status: 'cancelled' } : f));
    setActionId(null);
    showToast('Follow-up cancelled.');
  };

  const handleReschedule = async (fu: LeadFollowup) => {
    if(actionId||!rescheduleValue)return;
    let dueAt:string;
    try{dueAt=validateTexasOfficeSlot(rescheduleValue.slice(0,10),rescheduleValue.slice(11,16)).toISOString();}
    catch(e){showToast(e instanceof Error?e.message:'Choose a valid Dallas office time.','error');return;}
    setActionId(fu.id);
    const {error}=await supabase.from('lead_followups').update({due_at:dueAt,status:'active'}).eq('id',fu.id);
    if(error){showToast('Failed to reschedule.','error');setActionId(null);return;}
    onActivity('followup_rescheduled',`Follow-up rescheduled to ${formatDueDate(dueAt)}`);
    setFollowups(prev=>prev.map(f=>f.id===fu.id?{...f,due_at:dueAt,status:'active'}:f));
    setRescheduleId(null);setRescheduleValue('');setActionId(null);
    showToast('Follow-up rescheduled.');
  };

  if (!available) return null;
  if (loading) return null;
  if (loadError) return <div role="alert" className="rounded-xl border border-[#c8a96e]/40 bg-[#241d17] p-3 text-xs text-[#efd4a1]">Follow-ups could not be loaded. <button type="button" onClick={()=>{setLoading(true);void fetchFollowups();}} className="ml-2 underline underline-offset-2">Retry</button></div>;

  const statusColors: Record<string, { text: string; bg: string; ring: string }> = {
    overdue:   { text: '#f08080', bg: 'rgba(240,128,128,0.08)', ring: 'rgba(240,128,128,0.25)' },
    today:     { text: '#d9bc85', bg: 'rgba(200,169,110,0.08)', ring: 'rgba(200,169,110,0.25)' },
    upcoming:  { text: 'var(--ds-text-secondary)', bg: 'rgba(37,29,23,0.78)', ring: 'rgba(186,151,98,0.35)' },
    completed: { text: 'var(--ds-text-tertiary)', bg: 'transparent', ring: 'transparent' },
    cancelled: { text: 'var(--ds-text-tertiary)', bg: 'transparent', ring: 'transparent' },
  };

  return (
    <div>
      <div className="flex min-w-0 items-center justify-between gap-2 pl-2.5" style={{ borderLeft: '2px solid var(--ds-gold-dim)' }}>
        <p className="text-[10px] font-medium tracking-[0.14em] uppercase" style={{ color: 'var(--ds-text-secondary)' }}>
          Next Follow-Up
        </p>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={saving || actionId !== null}
            type="button"
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#c8a96e]/55 bg-[#34291b] px-3 py-2 text-xs font-semibold text-[#efd4a1] shadow-[0_3px_14px_rgba(201,161,108,.12)] transition-[background-color,border-color,transform] duration-150 hover:border-[#efd4a1] hover:bg-[#49371f] active:scale-[.97]"
            style={{ color: 'var(--ds-gold-dim)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-gold-dim)')}
          >
            <CalendarPlus size={15} aria-hidden="true"/> Schedule
          </button>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {/* Active follow-ups, earliest due first */}
        {active.map(fu => {
          const st = getFollowupStatus(fu);
          const sc = statusColors[st];
          return (
            <div
              key={fu.id}
              className="rounded-xl p-3"
              style={{ background: sc.bg, boxShadow: `0 0 0 1px ${sc.ring}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {st === 'overdue' && <AlertCircle size={11} style={{ color: sc.text }} />}
                    {st === 'today' && <Clock size={11} style={{ color: sc.text }} />}
                    {st === 'upcoming' && <Calendar size={11} style={{ color: sc.text }} />}
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: sc.text }}>
                      {st === 'overdue' ? 'Overdue' : st === 'today' ? 'Due today' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--ds-text-primary)' }}>{fu.task}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
                    {formatDueDate(fu.due_at)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  onClick={() => handleComplete(fu)}
                  disabled={actionId !== null}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors duration-150"
                  style={{ color: '#7dbfa0', background: 'rgba(125,191,160,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(125,191,160,0.16)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(125,191,160,0.08)')}
                >
                  {actionId === fu.id ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                  Complete
                </button>
                <button
                  onClick={()=>{setRescheduleId(fu.id);setRescheduleValue('');}}
                  disabled={actionId !== null}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors duration-150"
                  style={{ color: 'var(--ds-text-secondary)', background: 'var(--ds-bg-overlay)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleCancel(fu)}
                  disabled={actionId !== null}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors duration-150"
                  style={{ color: 'var(--ds-text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
                >
                  <X size={9} />
                  Cancel
                </button>
              </div>
              {rescheduleId===fu.id&&<div className="mt-3 space-y-3 rounded-xl border border-[#9b7c52]/50 bg-[#241c16] p-3">
                <p className="text-xs font-semibold text-[#e8c995]">Reschedule follow-up</p>
                <TexasCallbackPicker label="New follow-up" value={rescheduleValue} onChange={setRescheduleValue}/>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className="min-h-11 rounded-xl border border-[#9b7c52]/60 text-xs text-[#ecd0a0]" onClick={()=>{setRescheduleId(null);setRescheduleValue('');}}>Cancel</button>
                  <button type="button" className="min-h-11 rounded-xl bg-[#c9a16c] text-xs font-semibold text-[#21170e] disabled:opacity-40" disabled={!rescheduleValue||actionId!==null} onClick={()=>void handleReschedule(fu)}>Save new time</button>
                </div>
              </div>}
            </div>
          );
        })}

        {/* New follow-up form */}
        {showForm && (
          <div className="min-w-0 max-w-full overflow-x-clip rounded-xl p-3 space-y-2.5" style={{ background: '#241d17', boxShadow: '0 0 0 1px rgba(185,151,96,.35)' }}>
            <TexasCallbackPicker value={dueDate&&dueTime?dueDate+'T'+dueTime:''} onChange={v=>{setDueDate(v.slice(0,10));setDueTime(v.slice(11,16));}} label="Follow-up time"/>
            <input
              type="text"
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="Task description (optional)"
              className="w-full rounded-lg px-2.5 py-2 text-xs outline-none"
              style={{ background: 'var(--ds-bg-raised)', color: 'var(--ds-text-primary)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--ds-gold)')}
              onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07)')}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors duration-150"
                style={{ color: 'var(--ds-text-tertiary)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!dueDate || !dueTime || saving}
                className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-all duration-150 disabled:opacity-40"
                style={{ background: 'var(--ds-gold-muted)', color: 'var(--ds-gold-light)', boxShadow: '0 0 0 1px rgba(196,164,106,0.3)' }}
              >
                {saving ? <Loader2 size={9} className="animate-spin" /> : <Calendar size={9} />}
                Save
              </button>
            </div>
          </div>
        )}

        {/* Completed/cancelled history */}
        {history.length > 0 && (
          <div className="pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] font-medium tracking-[0.1em] uppercase mb-1.5 mt-1.5" style={{ color: 'var(--ds-text-tertiary)' }}>
              History
            </p>
            {history.slice(0, 5).map(fu => (
              <div key={fu.id} className="flex items-center gap-2 py-1">
                <span className="text-[11px]" style={{ color: fu.status === 'completed' ? '#7dbfa0' : 'var(--ds-text-tertiary)' }}>
                  {fu.status === 'completed' ? '✓' : '✕'}
                </span>
                <span className="text-[11px] truncate flex-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                  {fu.task}
                </span>
                <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--ds-text-tertiary)' }}>
                  {formatDueDate(fu.due_at)}
                </span>
              </div>
            ))}
          </div>
        )}

        {active.length === 0 && !showForm && (
          <p className="text-xs py-1" style={{ color: 'var(--ds-text-tertiary)' }}>
            No active follow-up scheduled.
          </p>
        )}
      </div>
    </div>
  );
}
