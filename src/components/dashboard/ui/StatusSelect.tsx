import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { LeadStatus } from './StatusBadge';

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: 'new',       label: 'New',       color: '#9ec5e0', bg: 'rgba(30,54,80,0.55)',    border: 'rgba(120,175,215,0.25)' },
  { value: 'contacted', label: 'Contacted', color: '#c8a96e', bg: 'rgba(60,44,18,0.55)',    border: 'rgba(196,164,106,0.28)' },
  { value: 'qualified', label: 'Qualified', color: '#86c9a8', bg: 'rgba(18,52,40,0.55)',    border: 'rgba(110,185,155,0.25)' },
  { value: 'closed',    label: 'Closed',    color: '#a89880', bg: 'rgba(40,36,32,0.6)',     border: 'rgba(168,152,128,0.2)'  },
  { value: 'archived',  label: 'Archived',  color: '#5a5856', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' },
];

interface StatusSelectProps {
  status: LeadStatus;
  disabled?: boolean;
  onChange: (next: LeadStatus) => void;
}

export default function StatusSelect({ status, disabled = false, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = STATUS_OPTIONS.find(o => o.value === status)!;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (value: LeadStatus) => {
    setOpen(false);
    if (value !== status) onChange(value);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger badge */}
      <button
        type="button"
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide border transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60"
        style={{
          color: current.color,
          background: current.bg,
          borderColor: open ? current.color : current.border,
          boxShadow: open ? `0 0 0 1px ${current.color}44` : 'none',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current.label}
        <ChevronDown
          size={10}
          className="transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', opacity: disabled ? 0.5 : 0.7 }}
        />
      </button>

      {/* Dropdown — inline, positioned relative to trigger */}
      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 min-w-[140px] rounded-xl py-1 z-50"
          style={{
            background: 'var(--ds-bg-overlay)',
            boxShadow: 'var(--ds-shadow-float)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          role="listbox"
        >
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === status}
              onClick={() => handleSelect(opt.value)}
              className="flex items-center justify-between w-full px-3.5 py-2 text-xs font-medium transition-colors duration-100"
              style={{ color: opt.color }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {opt.label}
              {opt.value === status && (
                <Check size={11} style={{ color: opt.color, opacity: 0.8 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
