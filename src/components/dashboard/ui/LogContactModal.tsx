import TexasCallbackPicker from './TexasCallbackPicker';
import {validateTexasOfficeSlot} from '../../../lib/texasScheduling';
import { useState,useEffect } from 'react';
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
  useEffect(()=>{
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!saving)onClose();};
    window.addEventListener('keydown',escape);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape);};
  },[onClose,saving]);

  const handleSave = async () => {
    if (saving || invalid) return;
    setSaving(true);
    setError(null);
    try {
      const appointment=followupAt&&!(callbackPending&&resolve)?validateTexasOfficeSlot(followupAt.slice(0,10),followupAt.slice(11,16)):null;
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
        onClick={()=>{if(!saving)onClose();}}
        aria-hidden
      />
      <div
        className="fixed left-1/2 top-1/2 z-[61] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] max-w-lg min-w-0 -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-[#9c7a52]/50"
        style={{ background: 'linear-gradient(155deg,#241c17,#151211 80%)', boxShadow: '0 28px 65px rgba(0,0,0,0.72), 0 0 0 1px rgba(198,160,97,0.16)' }}
        role="dialog"
        aria-modal="true"
        aria-label="Record customer interaction"
      >
        <div className="flex shrink-0 items-center justify-between bg-[#292018]/70 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--ds-text-primary)' }}>
            Record Customer Interaction
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="p-1 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--ds-text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-4">
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
                      background: active ? '#312a21' : '#221c18',
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
            <select aria-label="Contact outcome" className="min-h-12 w-full rounded-xl border border-[#94754f]/40 bg-[#1c1714] p-3 text-sm text-[#f1dfc7]" value={outcome} onChange={e => {setOutcome(e.target.value);setResolve(false);}}>
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
                background: '#211a16',
                color: 'var(--ds-text-primary)',
                boxShadow: '0 0 0 1px rgba(188,155,104,.38)',
              }}
              onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--ds-gold)')}
              onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(188,155,104,.38)')}
            />
          </div>

          {callbackPending && <div className="min-w-0 max-w-full space-y-3 rounded-xl border border-[#c8a96e]/30 bg-[#211a12]/60 p-3 text-sm">
            <p className="text-[#f0d5a4]">Choose what happens next. A callback stays open until the customer is reached or a follow-up is recorded.</p>
            {reached && <label className="flex items-center gap-2"><input type="checkbox" checked={resolve} onChange={e=>setResolve(e.target.checked)}/> Confirm customer was helped and resolve callback</label>}
            {!resolve && <TexasCallbackPicker value={followupAt} onChange={setFollowupAt} label="Next follow-up (required)"/>}
          </div>}
          {error && <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>}

        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[#8b714d]/30 bg-[#201913] px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              onClick={onClose}
              disabled={saving}
              className="min-h-11 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-150"
              style={{ color: 'var(--ds-text-secondary)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-secondary)')}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || invalid}
              className="flex min-h-11 items-center gap-1.5 rounded-xl px-5 py-2 text-sm font-semibold transition-all duration-150 disabled:opacity-50"
              style={{
                background: 'linear-gradient(100deg,#f0d8a5,#be904b)',
                color: '#1b150f',
                boxShadow: '0 0 0 1px rgba(235,203,147,0.65)',
              }}
            >
              {saving ? <LoadingSpinner size="sm" /> : null}
              {saving ? 'Saving…' : 'Save Interaction'}
            </button>
          </div>
        </div>
    </>
  );
}
