import type {CrmActivity} from './CrmActivityContext';

// Visual fixtures only. Never write these to Supabase, push subscriptions or
// receipts. These deliberately use non-UUID ids, so no real record can match.
const base={target_path:'/dashboard/notifications',created_at:'2026-11-07T19:00:00Z',read_at:null,archived_at:null,lead_archived:false,chat_lead_audit:false};
export const notificationPreviewFixtures:CrmActivity[]=[
 { ...base,id:'preview-lead',event_key:'lead:preview',category:'lead',title:'Lead received',
   summary:'Example Buyer · Source: Homepage',lead_status:'new'},
 { ...base,id:'preview-chat',event_key:'handoff:preview',category:'handoff',title:'Chat Request Received',
   summary:'Example Visitor · Chatbot assistance requested',callback_status:'waiting_human'},
 { ...base,id:'preview-urgent',event_key:'escalation:preview',category:'escalation',title:'Urgent Chat Request',
   summary:'Example Visitor · A visitor needs immediate assistance',callback_status:'waiting_human'},
 { ...base,id:'preview-staff-completed',event_key:'staff:completed:preview',category:'staff',title:'Follow-up Completed',
   summary:'Example Team Member · Follow-up completed',callback_status:'completed'},
 { ...base,id:'preview-staff-claimed',event_key:'staff:claimed:preview',category:'staff',title:'Team Member Joined',
   summary:'Example Team Member · Chat assigned to staff',callback_status:'claimed'},
 { ...base,id:'preview-lead-progress',event_key:'lead:preview-progress',category:'lead',title:'Lead Follow-up In Progress',
   summary:'Example Seller · Consultation underway',lead_status:'contacted',read_at:'2026-11-07T19:05:00Z'},
 { ...base,id:'preview-chat-done',event_key:'handoff:preview-done',category:'handoff',title:'Chat Request Received',
   summary:'Example Visitor · Team follow-up resolved',callback_status:'completed',read_at:'2026-11-07T19:05:00Z'}
];
