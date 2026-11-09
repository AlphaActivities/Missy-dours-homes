import TexasCallbackPicker from './TexasCallbackPicker';
import {validateTexasOfficeSlot} from '../../../lib/texasScheduling';
import { useState } from 'react';
import { Phone, MessageSquare, Mail, X } from 'lucide-react';
import { ContactChannel } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface LogContactModalProps {
  leadName: string;
  onLog: (channel: ContactChannel, notes: string, outcome: string, resolve: boolean, followupAt: string | null) => Promise<void>;
  callbackPending?: boolean;
  onClose: () => void;
}

const CHANNELS: { value: ContactChannel; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'call',  label: 'Call',  icon: <Phone size={14} />,        color: '#7dbfa0' },
  { value: 'text',  label: 'Text',  icon: <MessageSquare size={14} />, color: '#9ec5e0' },
  { value: 'email', label: 'Email', icon: <Mail size={14} />,          color: '#c8a96e' },
];

export default function LogContactModal({ leadName, onLog, onClose, callbackPending = false }: LogContactModalProps) {
  const [channel, setChannel] = useState<ContactChannel>('call');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('no_answer');
  const [resolve, setResolve] = useState(false);
  const [followupAt, setFollowupAt] = useState('');
  const outcomeOptions = channel === 'call' ? [{value:'spoke',label:'Spoke with customer'},{value:'no_answer',label:'No answer'},{value:'voicemail',label:'Voicemail left'}] : channel === 'text' ? [{value:'text_sent',label:'Text sent'},{value:'replied',label:'Customer replied'}] : [{value:'email_sent',label:'Email sent'},{value:'replied',label:'Customer replied'}];
  const reached = outcome === 'spoke' || outcome === 'replied';
  const invalid = notes.trim().length < 3 || (callbackPending && !resolve && !followupAt);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (saving || invalid) return;
    setSaving(true);
    setError(null);
    try {
      const appointment=followupAt?validateTexasOfficeSlot(followupAt.slice(0,10),followupAt.slice(11,16)):null;
      await onLog(channel, notes.trim(), outcome, callbackPending && resolve, appointment?.toISOString()??null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to record interaction. Please try again.');
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-[61] w-[calc(100%-2rem)] max-w-sm min-w-0 -translate-x-1/2 -translate-y-1/2 rounded-2xl"
        style={{ background: 'var(--ds-bg-raised)', boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Record customer interaction"
      >
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
            Record Customer Interaction
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--ds-text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>
            Recording interaction for <span style={{ color: 'var(--ds-text-secondary)' }}>{leadName || 'this lead'}</span>
          </p>

          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] uppercase mb-2" style={{ color: 'var(--ds-text-secondary)' }}>
              Channel
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map(ch => {
                const active = channel === ch.value;
                return (
                  <button
                    key={ch.value}
                    onClick={() => { setChannel(ch.value); setOutcome(ch.value === 'call' ? 'no_answer' : ch.value === 'text' ? 'text_sent' : 'email_sent'); setResolve(false); }}
                    className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-all duration-150"
                    style={{
                      color: active ? ch.color : 'var(--ds-text-tertiary)',
                      background: active ? `${ch.color}15` : 'var(--ds-bg-overlay)',
                      boxShadow: active ? `0 0 0 1px ${ch.color}55` : '0 0 0 1px rgba(255,255,255,0.06)',
                    }}
                  >
                    {ch.icon}
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-medium tracking-[0.14em] uppercase mb-2" style={{ color: 'var(--ds-text-secondary)' }}>Outcome</p>
            <select aria-label="Contact outcome" className="w-full rounded-lg bg-[#24201b] p-3 text-sm text-white" value={outcome} onChange={e => {setOutcome(e.target.value);setResolve(false);}}>
              {outcomeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <p className="mt-3 text-[10px] font-medium tracking-[0.14em] uppercase mb-2" style={{ color: 'var(--ds-text-secondary)' }}>What happened? (required)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Summarize what happened and the next step."
              rows={3}
              className="w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none transition-all duration-200"
              style={{
                background: 'var(--ds-bg-overlay)',
                color: 'var(--ds-text-primary)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
              }}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--ds-gold)')}
              onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07)')}
            />
          </div>

          {callbackPending && <div className="min-w-0 max-w-full space-y-3 rounded-xl border border-[#c8a96e]/30 bg-[#211a12]/60 p-3 text-sm">
            <p className="text-[#f0d5a4]">Callback still requires action until a confirmed outcome is recorded.</p>
            {reached && <label className="flex items-center gap-2"><input type="checkbox" checked={resolve} onChange={e=>setResolve(e.target.checked)}/> Confirm customer was helped and resolve callback</label>}
            {!resolve && <TexasCallbackPicker value={followupAt} onChange={setFollowupAt} label="Next follow-up (required)"/>}
          </div>}
          {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="text-xs font-medium px-3.5 py-2 rounded-xl transition-colors duration-150"
              style={{ color: 'var(--ds-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || invalid}
              className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl transition-all duration-150 disabled:opacity-50"
              style={{
                background: 'var(--ds-gold-muted)',
                color: 'var(--ds-gold-light)',
                boxShadow: '0 0 0 1px rgba(196,164,106,0.3)',
              }}
            >
              {saving ? <LoadingSpinner size="sm" /> : null}
              {saving ? 'Saving…' : 'Save Interaction'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
