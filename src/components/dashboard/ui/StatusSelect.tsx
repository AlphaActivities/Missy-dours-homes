import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { LeadStatus } from './StatusBadge';

const STATUS_OPTIONS: { value: LeadStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: 'new',       label: 'New',       color: '#9ec5e0', bg: 'rgba(30,54,80,0.55)',    border: 'rgba(120,175,215,0.25)' },
  { value: 'contacted', label: 'Contacted', color: '#c8a96e', bg: 'rgba(60,44,18,0.55)',    border: 'rgba(196,164,106,0.28)' },
  { value: 'qualified', label: 'Qualified', color: '#86c9a8', bg: 'rgba(18,52,40,0.55)',    border: 'rgba(110,185,155,0.25)' },
  { value: 'closed',    label: 'Closed',    color: '#a89880', bg: 'rgba(40,36,32,0.6)',     border: 'rgba(168,152,128,0.2)'  },
  { value: 'archived',  label: 'Archived',  color: '#B88A58', bg: 'rgba(184,138,88,0.12)', border: 'rgba(184,138,88,0.35)' },
];

interface StatusSelectProps {
  status: LeadStatus;
  disabled?: boolean;
  onChange: (next: LeadStatus) => void;
}

const MENU_WIDTH = 164;
const VIEWPORT_PADDING = 8;

export default function StatusSelect({ status, disabled = false, onChange }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{top:number;left:number;maxHeight:number}|null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = STATUS_OPTIONS.find(o => o.value === status)!;

  const placeMenu = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuHeight = 212;
    const below = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const above = rect.top - VIEWPORT_PADDING;
    const openAbove = below < menuHeight && above > below;
    const maxHeight = Math.max(70, Math.min(menuHeight,openAbove ? above - 6 : below - 6));
    setPosition({
      top: openAbove ? Math.max(VIEWPORT_PADDING, rect.top - Math.min(menuHeight, maxHeight) - 6) : rect.bottom + 6,
      left: Math.max(VIEWPORT_PADDING, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING)),
      maxHeight,
    });
  };
  const handleOpen = () => {
    if (disabled) return;
    if (!open) placeMenu();
    setOpen(v => !v);
  };
  useLayoutEffect(() => {
    if (!open) return;
    placeMenu();
    const closeOnScroll = () => setOpen(false);
    const onResize = () => placeMenu();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {window.removeEventListener('resize', onResize);window.removeEventListener('scroll', closeOnScroll, true);};
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node) && !(e.target as Element).closest?.('[data-lead-status-menu]')) setOpen(false);
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
        onClick={handleOpen}
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

      {/* Portal escapes the clipped drawer; position is viewport-aware. */}
      {open && position && createPortal(
        <div data-lead-status-menu
          className="fixed w-[164px] overflow-y-auto rounded-xl py-1"
          style={{top:position.top,left:position.left,maxHeight:position.maxHeight,zIndex:2147483000,
            background: '#211c19',
            boxShadow: '0 18px 45px rgba(0,0,0,0.95), 0 0 0 1px rgba(215,181,111,0.3)',
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
        </div>, document.body
      )}
    </div>
  );
}
