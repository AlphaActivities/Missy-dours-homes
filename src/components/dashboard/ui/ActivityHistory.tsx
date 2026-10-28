import { useState, useEffect, useCallback } from 'react';
import { Phone, Calendar, FileText, CheckCircle2, Clock, StickyNote, Paperclip, Trash2, AlertCircle } from 'lucide-react';
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
  const [available, setAvailable] = useState(true);

  const fetchActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

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
          Activity History
        </p>
      </div>

      <div className="mt-2 space-y-0.5">
        {activities.slice(0, 15).map((item, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 py-2 px-1 rounded-lg"
            style={{ borderBottom: i < Math.min(activities.length, 15) - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
          >
            <span className="shrink-0 mt-0.5" style={{ color: item.color }}>
              {item.icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-snug" style={{ color: 'var(--ds-text-secondary)' }}>
                {item.description}
              </p>
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
    </div>
  );
}
