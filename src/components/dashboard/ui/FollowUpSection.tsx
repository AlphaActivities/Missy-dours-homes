import { useState, useEffect, useCallback } from 'react';
import { Calendar, Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { LeadFollowup } from '../types';
import { useToast } from '../../../contexts/ToastContext';

interface FollowUpSectionProps {
  leadId: string;
  leadStatus: string;
  onActivity: (eventType: string, description: string) => void;
}

function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
  return d.toLocaleDateString('en-US', opts);
}

function getFollowupStatus(fu: LeadFollowup): 'upcoming' | 'today' | 'overdue' | 'completed' | 'cancelled' {
  if (fu.status === 'completed') return 'completed';
  if (fu.status === 'cancelled') return 'cancelled';
  const now = new Date();
  const due = new Date(fu.due_at);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  return 'upcoming';
}

export default function FollowUpSection({ leadId, onActivity }: FollowUpSectionProps) {
  const { showToast } = useToast();
  const [followups, setFollowups] = useState<LeadFollowup[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [task, setTask] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchFollowups = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_followups')
      .select('*')
      .eq('lead_id', leadId)
      .order('due_at', { ascending: false });

    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
        setAvailable(false);
      }
      setFollowups([]);
      setLoading(false);
      return;
    }
    setAvailable(true);
    setFollowups((data as LeadFollowup[]) ?? []);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    setLoading(true);
    setAvailable(true);
    fetchFollowups();
  }, [leadId, fetchFollowups]);

  const active = followups.filter(f => f.status === 'active');
  const history = followups.filter(f => f.status !== 'active');

  const handleSave = async () => {
    if (!dueDate || saving) return;
    setSaving(true);
    const timePart = dueTime || '09:00';
    const dueAt = new Date(`${dueDate}T${timePart}`).toISOString();

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
    const newDate = prompt('New date (YYYY-MM-DD):', fu.due_at.slice(0, 10));
    if (!newDate) return;
    const newTime = prompt('New time (HH:MM), or cancel for 9am:', '') || '09:00';
    const dueAt = new Date(`${newDate}T${newTime}`).toISOString();

    setActionId(fu.id);
    const { error } = await supabase
      .from('lead_followups')
      .update({ due_at: dueAt, status: 'active' })
      .eq('id', fu.id);

    if (error) {
      showToast('Failed to reschedule.', 'error');
      setActionId(null);
      return;
    }

    onActivity('followup_rescheduled', `Follow-up rescheduled to ${formatDueDate(dueAt)}`);
    setFollowups(prev => prev.map(f => f.id === fu.id ? { ...f, due_at: dueAt, status: 'active' } : f));
    setActionId(null);
    showToast('Follow-up rescheduled.');
  };

  if (!available) return null;
  if (loading) return null;

  const statusColors: Record<string, { text: string; bg: string; ring: string }> = {
    overdue:   { text: '#f08080', bg: 'rgba(240,128,128,0.08)', ring: 'rgba(240,128,128,0.25)' },
    today:     { text: '#d9bc85', bg: 'rgba(200,169,110,0.08)', ring: 'rgba(200,169,110,0.25)' },
    upcoming:  { text: 'var(--ds-text-secondary)', bg: 'var(--ds-bg-overlay)', ring: 'rgba(255,255,255,0.06)' },
    completed: { text: 'var(--ds-text-tertiary)', bg: 'transparent', ring: 'transparent' },
    cancelled: { text: 'var(--ds-text-tertiary)', bg: 'transparent', ring: 'transparent' },
  };

  return (
    <div>
      <div className="flex items-center justify-between pl-2.5" style={{ borderLeft: '2px solid var(--ds-gold-dim)' }}>
        <p className="text-[10px] font-medium tracking-[0.14em] uppercase" style={{ color: 'var(--ds-text-secondary)' }}>
          Next Follow-Up
        </p>
        {active.length === 0 && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[11px] font-medium transition-colors duration-150"
            style={{ color: 'var(--ds-gold-dim)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-gold-dim)')}
          >
            + Schedule
          </button>
        )}
      </div>

      <div className="mt-2 space-y-2">
        {/* Active follow-ups */}
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
                  disabled={actionId === fu.id}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors duration-150"
                  style={{ color: '#7dbfa0', background: 'rgba(125,191,160,0.08)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(125,191,160,0.16)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(125,191,160,0.08)')}
                >
                  {actionId === fu.id ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                  Complete
                </button>
                <button
                  onClick={() => handleReschedule(fu)}
                  disabled={actionId === fu.id}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors duration-150"
                  style={{ color: 'var(--ds-text-secondary)', background: 'var(--ds-bg-overlay)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleCancel(fu)}
                  disabled={actionId === fu.id}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors duration-150"
                  style={{ color: 'var(--ds-text-tertiary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
                >
                  <X size={9} />
                  Cancel
                </button>
              </div>
            </div>
          );
        })}

        {/* New follow-up form */}
        {showForm && (
          <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'var(--ds-bg-overlay)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
            <div className="flex gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="flex-1 rounded-lg px-2.5 py-2 text-xs outline-none"
                style={{ background: 'var(--ds-bg-raised)', color: 'var(--ds-text-primary)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
              />
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-24 rounded-lg px-2.5 py-2 text-xs outline-none"
                style={{ background: 'var(--ds-bg-raised)', color: 'var(--ds-text-primary)', boxShadow: '0 0 0 1px rgba(255,255,255,0.07)' }}
              />
            </div>
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
                disabled={!dueDate || saving}
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
