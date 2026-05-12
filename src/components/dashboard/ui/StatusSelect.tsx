import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { LeadStatus } from './StatusBadge';

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: 'new',       label: 'New',       color: '#7dd3fc', bg: 'rgba(14,116,144,0.15)',  border: 'rgba(125,211,252,0.2)' },
  { value: 'contacted', label: 'Contacted', color: '#fbbf24', bg: 'rgba(120,53,15,0.2)',    border: 'rgba(251,191,36,0.2)'  },
  { value: 'qualified', label: 'Qualified', color: '#6ee7b7', bg: 'rgba(6,78,59,0.2)',      border: 'rgba(110,231,183,0.2)' },
  { value: 'closed',    label: 'Closed',    color: '#8c8880', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)'},
  { value: 'archived',  label: 'Archived',  color: '#5a5856', bg: 'transparent',            border: 'rgba(255,255,255,0.06)'},
];

interface StatusSelectProps {
  status: LeadStatus;
  disabled?: boolean;
  onChange: (next: LeadStatus) => void;
}

interface DropdownPos {
  top: number;
  right: number;
}

export default function StatusSelect({ status, disabled = false, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const current = STATUS_OPTIONS.find(o => o.value === status)!;

  const measureAndOpen = useCallback(() => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: rect.bottom + 6,
      // align dropdown right edge with trigger right edge
      right: window.innerWidth - rect.right,
    });
    setOpen(v => !v);
  }, [disabled]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) setOpen(false);
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

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const handleSelect = (value: LeadStatus) => {
    setOpen(false);
    if (value !== status) onChange(value);
  };

  return (
    <>
      {/* Trigger badge */}
      <button
        ref={triggerRef}
        type="button"
        onClick={measureAndOpen}
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

      {/* Dropdown — rendered at document root to escape overflow:hidden ancestors */}
      {open && pos && createPortal(
        <div
          className="fixed z-[150] min-w-[140px] rounded-xl overflow-hidden py-1"
          style={{
            top: pos.top,
            right: pos.right,
            background: 'var(--ds-bg-overlay)',
            boxShadow: 'var(--ds-shadow-float)',
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
        </div>,
        document.body
      )}
    </>
  );
}
