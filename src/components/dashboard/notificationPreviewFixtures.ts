import type {CrmActivity} from './CrmActivityContext';

// Visual fixtures only. Never write these to Supabase, push subscriptions or
// receipts. These deliberately use non-UUID ids, so no real record can match.
const base={target_path:'/dashboard/notifications',created_at:'2026-11-07T19:00:00Z',read_at:null,archived_at:null,lead_archived:false,chat_lead_audit:false};
export const notificationPreviewFixtures:CrmActivity[]=[
 { ...base,id:'preview-lead',event_key:'lead:preview',category:'lead',title:'Lead received',
   summary:'Example Buyer · Source: Homepage',lead_status:'new'},
 { ...base,id:'preview-buyer',event_key:'opportunity:preview-buyer',category:'opportunity',title:'Live Buyer Interest',
   summary:'A visitor is discussing a specific property or showing.',callback_status:'ai',opportunity_kind:'buyer',opportunity_online:true},
 { ...base,id:'preview-seller',event_key:'opportunity:preview-seller',category:'opportunity',title:'Live Seller Interest',
   summary:'A visitor is discussing selling a property.',callback_status:'ai',opportunity_kind:'seller',opportunity_online:false},
 { ...base,id:'preview-chat',event_key:'handoff:preview',category:'handoff',title:'Chat Request Received',
   summary:'Example Visitor · Chatbot assistance requested',callback_status:'waiting_human',callback_requested_at:'2026-11-07T18:30:00Z'},
 { ...base,id:'preview-urgent',event_key:'escalation:preview',category:'escalation',title:'Urgent Chat Request',
   summary:'Example Visitor · A visitor needs immediate assistance',callback_status:'waiting_human',callback_requested_at:'2026-11-07T17:30:00Z',callback_escalated_at:'2026-11-07T19:00:00Z',callback_urgency:'urgent'},
 { ...base,id:'preview-staff-completed',event_key:'staff:completed:preview',category:'staff',title:'Follow-up Completed',
   summary:'Example Team Member · Follow-up completed',callback_status:'completed'},
 { ...base,id:'preview-staff-claimed',event_key:'staff:claimed:preview',category:'staff',title:'Team Member Joined',
   summary:'Example Team Member · Chat assigned to staff',callback_status:'claimed'},
 { ...base,id:'preview-chat-done',event_key:'handoff:preview-done',category:'handoff',title:'Chat Request Received',
   summary:'Example Visitor · Team follow-up resolved',callback_status:'completed',callback_requested_at:'2026-11-07T17:10:00Z',read_at:'2026-11-07T19:05:00Z'}
];
