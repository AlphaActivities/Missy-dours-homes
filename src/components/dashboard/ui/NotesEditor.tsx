import { useState, useRef, useEffect } from 'react';
import { Save, Check } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface NotesEditorProps {
  leadId: string;
  initialNotes: string;
  onSave: (leadId: string, notes: string) => Promise<void>;
}

export default function NotesEditor({ leadId, initialNotes, onSave }: NotesEditorProps) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when lead changes
  useEffect(() => {
    setNotes(initialNotes ?? '');
    setError(null);
    setSavedFlash(false);
  }, [leadId, initialNotes]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [notes]);

  const isDirty = notes !== (initialNotes ?? '');

  const handleSave = async () => {
    if (!isDirty || saving) return;
    setError(null);
    setSaving(true);
    try {
      await onSave(leadId, notes);
      setSaving(false);
      setSavedFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2000);
    } catch {
      setSaving(false);
      setError('Failed to save. Please try again.');
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        ref={textareaRef}
        value={notes}
        onChange={e => { setNotes(e.target.value); setError(null); setSavedFlash(false); }}
        disabled={saving}
        placeholder="Add private notes about this lead…"
        rows={3}
        className="w-full resize-none rounded-xl px-3.5 py-3 text-xs leading-relaxed outline-none transition-all duration-200 disabled:opacity-50"
        style={{
          background: 'var(--ds-bg-overlay)',
          color: 'var(--ds-text-primary)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.07)',
          minHeight: '76px',
        }}
        onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 1.5px var(--ds-gold)')}
        onBlur={e => (e.currentTarget.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.07)')}
      />

      <div className="flex items-center justify-between gap-3">
        {/* Error or saved confirmation */}
        <div className="text-xs transition-all duration-200" style={{ minHeight: '18px' }}>
          {error && <span style={{ color: '#f87171' }}>{error}</span>}
          {savedFlash && !error && (
            <span className="flex items-center gap-1" style={{ color: '#6ee7b7' }}>
              <Check size={11} />
              Saved
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || saving}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{
            background: isDirty && !saving ? 'var(--ds-gold-muted)' : 'var(--ds-bg-overlay)',
            color: isDirty && !saving ? 'var(--ds-gold-light)' : 'var(--ds-text-tertiary)',
            boxShadow: isDirty && !saving
              ? '0 0 0 1px rgba(196,164,106,0.3)'
              : '0 0 0 1px rgba(255,255,255,0.07)',
          }}
        >
          {saving
            ? <><LoadingSpinner size="sm" /> Saving…</>
            : <><Save size={11} /> Save note</>
          }
        </button>
      </div>
    </div>
  );
}
