import { Phone, MessageSquare, Mail } from 'lucide-react';

interface AccentColor {
  text: string;
  bg: string;
  ring: string;
  hoverText: string;
  hoverBg: string;
  hoverRing: string;
}

interface QuickActionBarProps {
  phone?: string;
  email?: string;
  compact?: boolean;
}

interface ActionBtnProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  compact?: boolean;
  accent: AccentColor;
}

function ActionBtn({ href, icon, label, compact = false, accent }: ActionBtnProps) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 rounded-lg transition-all duration-150"
      style={{
        color: accent.text,
        background: accent.bg,
        boxShadow: `0 0 0 1px ${accent.ring}`,
        padding: compact ? '0.3rem 0.65rem' : '0.45rem 0.75rem',
        fontSize: compact ? '11px' : '12px',
        fontWeight: 500,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = accent.hoverText;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${accent.hoverRing}`;
        e.currentTarget.style.background = accent.hoverBg;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = accent.text;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${accent.ring}`;
        e.currentTarget.style.background = accent.bg;
      }}
      aria-label={label}
    >
      {icon}
      {!compact && <span>{label}</span>}
    </a>
  );
}

const ACCENT_CALL: AccentColor = {
  text:      '#7dbfa0',
  bg:        'rgba(125,191,160,0.07)',
  ring:      'rgba(125,191,160,0.22)',
  hoverText: '#9dd4b8',
  hoverBg:   'rgba(125,191,160,0.14)',
  hoverRing: 'rgba(125,191,160,0.4)',
};

const ACCENT_TEXT: AccentColor = {
  text:      '#9ec5e0',
  bg:        'rgba(158,197,224,0.07)',
  ring:      'rgba(158,197,224,0.22)',
  hoverText: '#b8d5ec',
  hoverBg:   'rgba(158,197,224,0.14)',
  hoverRing: 'rgba(158,197,224,0.4)',
};

const ACCENT_EMAIL: AccentColor = {
  text:      '#c8a96e',
  bg:        'rgba(200,169,110,0.07)',
  ring:      'rgba(200,169,110,0.22)',
  hoverText: '#d9bc85',
  hoverBg:   'rgba(200,169,110,0.14)',
  hoverRing: 'rgba(200,169,110,0.4)',
};

export default function QuickActionBar({ phone, email, compact = false }: QuickActionBarProps) {
  const hasAny = phone || email;
  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {phone && (
        <ActionBtn
          href={`tel:${phone}`}
          icon={<Phone size={compact ? 11 : 12} />}
          label="Call"
          compact={compact}
          accent={ACCENT_CALL}
        />
      )}
      {phone && (
        <ActionBtn
          href={`sms:${phone}`}
          icon={<MessageSquare size={compact ? 11 : 12} />}
          label="Text"
          compact={compact}
          accent={ACCENT_TEXT}
        />
      )}
      {email && (
        <ActionBtn
          href={`mailto:${email}`}
          icon={<Mail size={compact ? 11 : 12} />}
          label="Email"
          compact={compact}
          accent={ACCENT_EMAIL}
        />
      )}
    </div>
  );
}
