import { LeadStatus } from './ui/StatusBadge';

export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  source_page: string;
  listing_slug: string;
  status: LeadStatus;
  notes: string;
  last_contacted_at?: string | null;
}

export type ContactChannel = 'call' | 'text' | 'email';

export interface LeadFollowup {
  id: string;
  lead_id: string;
  due_at: string;
  task: string;
  status: 'active' | 'completed' | 'cancelled';
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  event_type: 'inquiry' | 'contact_logged' | 'followup_scheduled' | 'followup_completed' | 'followup_cancelled' | 'followup_rescheduled' | 'status_changed' | 'note_saved' | 'attachment_added' | 'attachment_removed';
  description: string;
  actor: string | null;
  created_at: string;
}

export interface LeadContactEvent {
  id: string;
  lead_id: string;
  channel: ContactChannel;
  notes: string;
  contacted_by: string | null;
  created_at: string;
}
