import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webkit,devices } from 'playwright';

// Guard the actual deployed API route allowlist, not only the browser's mocked
// endpoints. A missing /typing route silently disables early iPhone pushes.
const apiSource=readFileSync(new URL('../supabase/functions/concierge-api/index.ts',import.meta.url),'utf8');

const activityCenter=readFileSync(new URL('../src/components/dashboard/CrmActivityCenter.tsx',import.meta.url),'utf8');
const activityContext=readFileSync(new URL('../src/components/dashboard/CrmActivityContext.tsx',import.meta.url),'utf8');

const resetSource=readFileSync(new URL('../src/pages/dashboard/ResetPasswordPage.tsx',import.meta.url),'utf8');
const loginSource=readFileSync(new URL('../src/pages/dashboard/LoginPage.tsx',import.meta.url),'utf8');
const ownerAdminSource=readFileSync(new URL('../src/pages/dashboard/OwnerAdminPage.tsx',import.meta.url),'utf8');
const correctionsMigration=readFileSync(new URL('../supabase/migrations/20261111082000_crm_recovery_owner_account_badge_corrections.sql',import.meta.url),'utf8');
assert.ok(loginSource.includes('Forgot password?') &&
 resetSource.includes('supabase.auth.resetPasswordForEmail') &&
 resetSource.includes('supabase.auth.updateUser({password})') &&
 !ownerAdminSource.includes('encrypted_password'),
 'Password recovery must use Supabase Auth without exposing passwords');
assert.ok(correctionsMigration.includes('badge_correction_enabled boolean NOT NULL DEFAULT false') &&
 correctionsMigration.includes('crm_schedule_badge_correction_after_consolidation') &&
 correctionsMigration.includes('crm_badge_device_state') &&
 correctionsMigration.includes("now()+interval '60 seconds'"),
 'Badge correction notifications must be opt-in, event-driven and coalesced');

const groupedCountsSource=readFileSync(new URL('../supabase/migrations/20261111153000_group_active_notifications_by_customer.sql',import.meta.url),'utf8');
assert.ok(activityCenter.includes("const customerKey=(item:CrmActivity)=>item.callback_lead_id?") &&
  activityCenter.includes('customerRequestCount:tasks.length') &&
  activityCenter.includes('groupEventIds:') &&
  activityCenter.includes("if(filter==='urgent')return isUrgent(e)") &&
  activityCenter.includes('Open Lead · Review Requests'),
  'Customer-linked notification requests must show one newest-first card while retaining all underlying actions');
assert.ok(groupedCountsSource.includes("count(DISTINCT group_key) FILTER(WHERE is_active)") &&
  groupedCountsSource.includes("coalesce(c.lead_id::text,'conversation:'||ht.conversation_id::text)") &&
  groupedCountsSource.includes('public.crm_visible_notification_count_service'),
  'Bell and push badge totals must group callbacks by canonical lead without combining unrelated visitors');
assert.ok(activityContext.includes("callback_assignee?:string|null") &&
 activityContext.includes("callback_connection?:VisitorConnection|null") &&
 activityContext.includes("callback_outcome?:'follow_up'|'resolved'|null"),
 'Notification cards need authoritative assignment, presence and recorded outcome fields');
assert.ok(activityContext.includes("from('ai_concierge_handoff_outcomes')") &&
 activityContext.includes("from('ai_concierge_visitor_presence')"),
 'Use actual recorded outcomes and recent presence, not guessed follow-up states');
assert.ok(activityContext.includes("expiry<=Date.now()?'expired'") &&
 activityContext.includes("Date.now()-lastSeen<75000"),
 'Expired session and live visitor presence must be distinguished');
assert.ok(activityCenter.includes("item.callback_status==='claimed'?'Callback Requests · Follow-Up Needed'") &&
 activityCenter.includes("staffName(item.callback_assignee)"),
 'A claimed chat must show the work status and the responsible team member');
assert.ok(activityCenter.includes("if(filter==='urgent')return isUrgent(e)") &&
 activityCenter.includes("item.callback_outcome==='follow_up'") &&
 activityCenter.includes("!item.callback_escalated_at"),
 'Keep an unresolved escalation urgent until its recorded outcome resets the task escalation');
assert.ok(activityCenter.includes("(isChatRequest(item)&&activeChat(item))") &&
 !activityCenter.includes('Hide notification') &&
 !activityCenter.includes('hideNotice('),
 'All unresolved callbacks remain actionable, without a manual hide control');
assert.ok(activityCenter.includes("Overdue 24h+") &&
 activityCenter.includes("Chat Session Expired") &&
 activityCenter.includes("Visitor Offline"),
 'Urgent cards must identify overdue and unavailable visitor sessions');
assert.ok(activityCenter.includes("item.callback_lead_id") &&
 activityCenter.includes("Open Lead · Follow Up"),
 'Offline callback with linked lead should offer follow-up instead of pretending live response is possible');

const settingsSource=readFileSync(new URL('../src/pages/dashboard/SettingsPage.tsx',import.meta.url),'utf8');
assert.ok(activityContext.includes("new BroadcastChannel('missy-crm-badge-'+email)") &&
 activityContext.includes("badgeChannelRef.current?.postMessage({kind:'receipt-updated'})"),
 'Receipt updates must refresh matching app tabs without extra native alerts');
assert.ok(activityContext.includes("table:'ai_conversations'") &&
 activityContext.includes("window.addEventListener('focus',visible)") &&
 activityContext.includes("window.addEventListener('pageshow',visible)"),
 'Open CRM should reconcile badges on conversation transitions and device refocus');
assert.ok(activityContext.includes("lastSyncedAt:new Date().toISOString()") &&
 activityContext.includes("status:'unsupported'"),
 'App badge diagnostics must distinguish successful request from unsupported browser');
assert.ok(settingsSource.includes('App Badge Diagnostics') &&
 settingsSource.includes('Sync notification count now') &&
 settingsSource.includes('onClick={()=>void syncBadgeNow()}') &&
 activityContext.includes('setBadgeSyncRevision(n=>n+1)') &&
 settingsSource.includes('Accepted by browser'),
 'Settings must show transparent current-device badge diagnostics and manual sync');

const pushDelivery=readFileSync(new URL('../supabase/functions/concierge-push-delivery/index.ts',import.meta.url),'utf8');
const badgeMigration=readFileSync(new URL('../supabase/migrations/20261109_unify_crm_visible_notification_badge.sql',import.meta.url),'utf8');

const entranceSource=readFileSync(new URL('../src/components/dashboard/ui/ConciergeSignatureEntrance.tsx',import.meta.url),'utf8');
const outcomeSource=readFileSync(new URL('../src/pages/dashboard/ConversationsPage.tsx',import.meta.url),'utf8');
const calendarSource=readFileSync(new URL('../src/pages/dashboard/CalendarPage.tsx',import.meta.url),'utf8');
assert.ok(calendarSource.includes("from('lead_followups')") &&
 calendarSource.includes("from('ai_concierge_tasks')") &&
 calendarSource.includes('Date.parse(t.due_at)>Date.parse(t.created_at)+5000') &&
 calendarSource.includes("timeZone:zone"),
 'Calendar must include scheduled follow-ups and only explicitly scheduled chatbot task times in Dallas time');
assert.ok(outcomeSource.includes('const pendingGroups=useMemo') &&
 outcomeSource.includes("const id=leadId?'lead:'+leadId:'conversation:'") &&
 outcomeSource.includes('group.tasks.map') &&
 outcomeSource.includes('md:min-h-[520px]') &&
 outcomeSource.includes('max-h-[315px]') &&
 outcomeSource.includes('disabled={linkBusy||!canCreateSeparateLead}') &&
 outcomeSource.includes('if(createSeparate && !canCreateSeparateLead)'),
 'Conversations must group by verified customer, preserve tasks, expand tablet/desktop list without changing mobile or unsafe lead creation');

const leadDrawerSource=readFileSync(new URL('../src/components/dashboard/ui/LeadDrawer.tsx',import.meta.url),'utf8');
const attentionSource=readFileSync(new URL('../src/components/dashboard/ui/CallbackAttentionPanel.tsx',import.meta.url),'utf8');
const contactModalSource=readFileSync(new URL('../src/components/dashboard/ui/LogContactModal.tsx',import.meta.url),'utf8');
const customerTimelineSource=readFileSync(new URL('../src/components/dashboard/ui/ActivityHistory.tsx',import.meta.url),'utf8');
const relatedLeadSource=readFileSync(new URL('../src/components/dashboard/ui/RelatedLeadReview.tsx',import.meta.url),'utf8');
assert.ok(relatedLeadSource.includes("const showReview=!loading&&(items.length>0||Boolean(error));") &&
 relatedLeadSource.includes('{showReview&&<section aria-label="Potential duplicate customer records"') &&
 relatedLeadSource.includes('{completed&&createPortal(') &&
 relatedLeadSource.includes("setExpanded(true);setItems([]);"),
 'Duplicate review should disappear when there are zero candidates, stay absent while loading, preserve merge success and reveal lookup errors');

const followupSectionSource=readFileSync(new URL('../src/components/dashboard/ui/FollowUpSection.tsx',import.meta.url),'utf8');
const matchingMigration=readFileSync(new URL('../supabase/migrations/20261109_preserve_identity_name_word_boundaries.sql',import.meta.url),'utf8');
const quickReviewMigration=readFileSync(new URL('../supabase/migrations/20261110_quick_consolidation_verification.sql',import.meta.url),'utf8');
const oneConfirmMigration=readFileSync(new URL('../supabase/migrations/20261110_single_confirm_customer_merge.sql',import.meta.url),'utf8');
const excludedCandidatesMigration=readFileSync(new URL('../supabase/migrations/20261111_exclude_consolidated_lead_candidates.sql',import.meta.url),'utf8');
assert.ok(excludedCandidatesMigration.includes('crm_review_phone_lead_candidates') &&
 excludedCandidatesMigration.includes('consolidated.secondary_lead_id = l.id') &&
 excludedCandidatesMigration.includes('crm_lead_consolidations'),
 'Server candidate lookup must never offer already consolidated secondary records');
assert.ok(relatedLeadSource.includes("from('crm_lead_consolidations')") &&
 relatedLeadSource.includes("consolidatedIds.has(row.id)") &&
 relatedLeadSource.includes("setItems([]);setLoading(false);return;") &&
 relatedLeadSource.includes("setVersion(n=>n+1)"),
 'Duplicate UI must reconcile recorded consolidations and refresh candidates instead of leaving stale actions');
assert.ok(relatedLeadSource.includes('Customer Records Combined') &&
 relatedLeadSource.includes('Done · Return to Customer') &&
 relatedLeadSource.includes('setCompleted({primary:lead.name,secondary:selected.name})') &&
 relatedLeadSource.includes('This record has already been consolidated.'),
 'Successful or stale consolidation must show an accessible persistent result, not an invisible toast');
assert.ok(relatedLeadSource.includes('crm-consolidation-success-title') &&
 relatedLeadSource.includes('pb-[max(1rem,env(safe-area-inset-bottom))]'),
 'Success confirmation must fit mobile viewport and keep its Done action visible');

assert.ok(oneConfirmMigration.includes("'staff_confirmed_same_customer'") &&
 oneConfirmMigration.includes("p_confirmation is distinct from 'CONFIRM SAME CUSTOMER'") &&
 oneConfirmMigration.includes("if length(ap)<>10 or ap<>bp") &&
 oneConfirmMigration.includes('Conflicting emails require additional identity verification') &&
 oneConfirmMigration.includes('crm_lead_consolidations'),
 'One-step consolidation keeps staff authorization, matching phone, conflicting-email guard and audit');
assert.ok(relatedLeadSource.includes('I confirm these records belong to the same customer.') &&
 relatedLeadSource.includes("p_verification_note:'staff_confirmed_same_customer'") &&
 !relatedLeadSource.includes('How was the customer verified?') &&
 !relatedLeadSource.includes('Customer confirmed directly') &&
 !relatedLeadSource.includes('Independently verified records'),
 'Confirmation dialog must not require staff to select or describe a verification method');

assert.ok(quickReviewMigration.includes("'customer_confirmed','records_verified'") &&
 quickReviewMigration.includes("p_confirmation is distinct from 'CONFIRM SAME CUSTOMER'") &&
 quickReviewMigration.includes("if length(ap)<>10 or ap<>bp") &&
 quickReviewMigration.includes("Conflicting emails require additional identity verification"),
 'Quick verification still requires authorized staff, same phone, no conflicting email and explicit confirmation');

assert.ok(relatedLeadSource.includes('createPortal(') &&
 relatedLeadSource.includes('max-h-[calc(100dvh-1.5rem)]') &&
 relatedLeadSource.includes('overflow-y-auto overscroll-contain') &&
 relatedLeadSource.includes('pb-[max(1rem,env(safe-area-inset-bottom))]') &&
 relatedLeadSource.includes('aria-modal="true"') &&
 relatedLeadSource.includes("document.addEventListener('keydown',onKeys,true)") &&
 relatedLeadSource.includes('triggerRef.current?.focus()'),
 'Consolidation confirmation must be a viewport-safe keyboard-accessible portal, not a card below the scroll list');
assert.ok((leadDrawerSource.match(/<DrawerContent/g)||[]).length===1 &&
 leadDrawerSource.includes('onConsolidated={onConsolidated}') &&
 leadDrawerSource.includes('min-h-0 flex-1 overflow-y-auto'),
 'Lead UI must have only one mounted responsive drawer and refresh after merging');
assert.ok(followupSectionSource.includes('<TexasCallbackPicker label="New follow-up"') &&
 !followupSectionSource.includes("prompt('New date") &&
 followupSectionSource.includes("timeZone:'America/Chicago'"),
 'Rescheduling and due dates must share Dallas controls with no native browser prompts');
assert.ok(customerTimelineSource.includes("from('lead_contact_events')") &&
 customerTimelineSource.includes('Original archived note') &&
 customerTimelineSource.includes('original attachment(s), open source record'),
 'Lead history must include actual contact outcomes and reachable archived original notes');
assert.ok(matchingMigration.includes("'[^[:alnum:][:space:]]+'") &&
 matchingMigration.includes("'[[:space:]]+'") &&
 !matchingMigration.includes("'[^a-z0-9]+'"),
 'Identity normalizer must preserve name word boundaries for conservative auto-matching');

const conversationsHistorySource=readFileSync(new URL('../src/pages/dashboard/ConversationsPage.tsx',import.meta.url),'utf8');
assert.ok(attentionSource.includes('Active Requests') &&
 leadDrawerSource.includes('<RelatedLeadReview') &&
 leadDrawerSource.includes('<ActivityHistory'),
 'Lead must distinguish active callback actions from full linked customer history');
assert.ok(customerTimelineSource.includes("from('ai_conversations')") &&
 customerTimelineSource.includes("from('ai_concierge_tasks')") &&
 customerTimelineSource.includes("from('lead_followups')") &&
 customerTimelineSource.includes('Open saved transcript'),
 'Lead timeline must include linked chats, callback states and follow-up history');
assert.ok(relatedLeadSource.includes("crm_review_phone_lead_candidates") &&
 relatedLeadSource.includes('crm_consolidate_verified_leads') &&
 relatedLeadSource.includes('Phone and normalized name match') &&
 relatedLeadSource.includes('I confirm these records belong to the same customer.') &&
 !relatedLeadSource.includes('How was the customer verified?') &&
 !relatedLeadSource.includes('verificationNote.trim().length<20'),
 'Possible identity matches must be read-only and rely on verified staff lookup');
assert.ok(conversationsHistorySource.includes('range(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE-1)') &&
 conversationsHistorySource.includes('setTotalConversations(count??0)') &&
 conversationsHistorySource.includes('Search names, summaries, titles or phone'),
 'Conversation history must paginate server-side and search saved metadata');
assert.ok(conversationsHistorySource.includes("filter==='qa'") &&
 conversationsHistorySource.includes("'[PRIVATE VISITOR QA] %'") &&
 conversationsHistorySource.includes('PRIVATE QA TEST · NOT A CUSTOMER'),
 'Owner private QA sessions must have a distinct clearly labeled history filter');
assert.ok(conversationsHistorySource.includes('setLifecycleReviewIds(humanIds.filter(id=>!pending.has(id)))'),
 'Historical human sessions without an open task must be identified without automatically closing them');

assert.ok(attentionSource.includes('Received') &&
 attentionSource.includes('Request {choices.length-i}') &&
 attentionSource.includes("month:'short',day:'numeric'"),
 'Request picker labels must distinguish arrival timestamps from booked callback appointments');
assert.ok(leadDrawerSource.includes(".order('created_at',{ascending:false})") &&
  leadDrawerSource.includes(".order('conversation_id',{ascending:false})") &&
  leadDrawerSource.includes('const first=tasks?.[0]'),
  'Multiple active submissions must default to the most recently received request, not the earliest due date');
assert.ok(attentionSource.includes('No appointment has been scheduled.'),
 'Selector should explicitly explain that request times are not actual appointments');
assert.ok(attentionSource.includes("value={request?.conversation_id??''}") &&
 attentionSource.includes('value={r.conversation_id}'),
 'Selector must retain exact conversation IDs and existing selection behavior');

const callbackPickerSource=readFileSync(new URL('../src/components/dashboard/ui/TexasCallbackPicker.tsx',import.meta.url),'utf8');
assert.ok(entranceSource.includes("supabase.rpc('crm_activity_totals')") &&
 entranceSource.includes("(data as {total?:unknown}|null)?.total"),
 'Entrance must use the exact same active inbox total as the CRM bell');
assert.ok(!entranceSource.includes("supabase.rpc('crm_attention_summary')"),
 'Loading screen must not use old deduplicated-work summary instead of visible notification total');
assert.ok(entranceSource.includes("+' active '+"),
 'Loading screen must not incorrectly describe previously read active notifications as new');
assert.ok(outcomeSource.includes('aria-label="Record chat outcome before returning to AI"') &&
 outcomeSource.includes('min-w-0 max-w-full space-y-3 overflow-x-clip'),
 'Outcome form must constrain intrinsic iOS date/time field width');
assert.ok(outcomeSource.includes('<TexasCallbackPicker') &&
 callbackPickerSource.includes('type="date"') &&
 callbackPickerSource.includes('<select aria-label=') &&
 callbackPickerSource.includes('flex w-full min-w-0 max-w-full flex-col gap-3') &&
 callbackPickerSource.includes('box-border rounded-xl') &&
 !callbackPickerSource.includes('grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]'),
 'Shared native iOS follow-up picker must remain clickable but clipped to its bordered container');
assert.ok(contactModalSource.includes('max-h-[calc(100dvh-2rem)]') &&
 contactModalSource.includes('overflow-y-auto overscroll-contain') &&
 contactModalSource.includes("document.body.style.overflow='hidden'") &&
 contactModalSource.includes('shrink-0 items-center justify-end'),
 'Customer interaction form must lock background scroll and keep its own scrollable content and fixed actions');
assert.ok(attentionSource.includes('Callback Needs Attention') &&
 attentionSource.includes('View Chat') &&
 attentionSource.includes('Record Outcome') &&
 attentionSource.includes('<details'),
 'Urgent callback card must present a compact request summary and direct actions');
assert.ok(activityContext.includes('setAttentionCount(verifiedTotal)') &&
 activityContext.includes("throw new Error('Invalid CRM notification total')"),
 'Bell and foreground app badges must count actual active inbox cards, not duplicate work records');
assert.ok(pushDelivery.includes("crm_visible_notification_count_service',{p_staff_email:device.staff_email}"),
 'Native push badge must count visible cards separately for each subscribed staff account');
assert.ok(!pushDelivery.includes("client.rpc('crm_attention_count_service')"),
 'Native push must not use raw leads + tasks + waiting conversation totals');
assert.ok(activityCenter.includes('filterCounts[key]')&&activityCenter.includes('data-count={filterCounts[key]}'),
 'Every notification filter must show its own exact card count');
assert.ok(activityCenter.includes("key!=='history'&&filterCounts[key]>0"),
 'Only positive-count non-History filters should render a red badge');
assert.ok(activityCenter.includes('data-filter-corner-badge={key}')
 &&activityCenter.includes('pointer-events-none absolute -right-1.5 -top-2 z-20'),
 'Number circles must float outside the top-right filter button corner, without changing touch targets');
assert.ok(activityCenter.includes("key==='history'?' ('+filterCounts[key]+')':''"),
 'History should display its count in parentheses inside the button instead of a circle');
assert.ok(activityCenter.includes('flex h-11 w-full min-w-0 items-center justify-center overflow-hidden'),
 'Existing mobile filter button dimensions must be preserved');
assert.ok(activityCenter.includes("key==='history'?items:activeEvents")&&activityCenter.includes('matchesFilter(e,key)'),
 'Filter badges must share the same classification as rendered notifications');
assert.ok(badgeMigration.includes('crm_visible_notification_count_service(p_staff_email text)')
 &&badgeMigration.includes('r.staff_email=lower(p_staff_email)')
 &&badgeMigration.includes("grant execute on function public.crm_visible_notification_count_service(text) to service_role"),
 'Push badge counting must respect per-user hidden receipts and restrict service access');

const routes=apiSource.match(/if\(!\[(.*?)\]\.includes\(url\.pathname\)\)/s)?.[1];
assert.ok(routes,'Concierge endpoint allowlist must exist');
for(const route of ['typing','ack']){
 for(const prefix of ['/functions/v1/concierge-api/','/concierge-api/']){
  assert.ok(routes.includes("'"+prefix+route+"'"),'Missing authenticated visitor API route: '+prefix+route);
 }
}
assert.match(apiSource,/\/\/ Fallback for speech dictation/,'Message send must have a notification fallback');
assert.match(apiSource,/event_type:'visitor_engaged'/,'Visitor engagement push must be queued');

const conversationSource=readFileSync(new URL('../src/pages/dashboard/ConversationsPage.tsx',import.meta.url),'utf8');
const visitorSource=readFileSync(new URL('../src/components/ui/ConciergeWidget.tsx',import.meta.url),'utf8');
// Source-level regression checks cover the production AI API and staff CRM,
// not just mocked browser replies.
const syncSelect=apiSource.match(/if\(url\.pathname\.endsWith\('\/sync'\)\)[\s\S]*?\.select\('([^']+)'\)/)?.[1]??'';
assert.ok(syncSelect,'Visitor sync response must exist');
assert.ok(!syncSelect.includes('sender_actor'),'Do not expose staff email identifiers to visitor sync');
assert.ok(apiSource.includes(".replace(/\\s*—\\s*/g,'... ')"),
  'AI replies must normalize em dashes before saving');
assert.ok(apiSource.includes("reply=payload.reply.trim().slice(0,5000)"),'Reply normalization must happen before commit');
for(const [email,name] of [
 ['yourcustomerflowguy@gmail.com','Josh'],
 ['missydourshomes@gmail.com','Missy'],
 ['heberherrera92@gmail.com','Heber']
]){
 assert.ok(conversationSource.includes("'"+email+"':'"+name+"'"),'Missing safe assignment display name for '+name);
}
assert.ok(conversationSource.includes('assignedStaffName(active.assigned_to)'),'Assigned staff email must not be rendered verbatim');
assert.ok(conversationSource.includes('mb-4 flex flex-col items-stretch'),'Mobile assignment and outcome actions should stack without collision');
assert.ok(visitorSource.includes("renderConciergeText(m.text, m.sender !== 'human')"),
 'Only AI-written bubbles should receive automatic punctuation normalization');


// Test the real deployed intent expressions instead of copying regexes into a mock.
// Previously "sell my 1 million dollar home" was saved as warm with no seller
// opportunity, so no prioritized seller push could ever be created.
const detectIntent=(name,utterance)=>{
 const declaration=apiSource.split('\n').find(line=>line.includes('const '+name+'=/'));
 assert.ok(declaration,'Missing intent matcher: '+name);
 const match=declaration.match(/=(\/.*\/i)\.test\(lower\);$/);
 assert.ok(match,'Intent matcher must remain a directly testable regex: '+name);
 const literal=match[1];
 return new RegExp(literal.slice(1,-2),'i').test(utterance.toLowerCase());
};
for(const utterance of [
 'I want to sell my 1 million dollar home',
 'I want to sell my one million dollar home',
 'I would like to sell my $1,000,000 home',
 'I want to sell my home',
 'I need a home valuation'
]) assert.equal(detectIntent('sellerIntent',utterance),true,'Missed seller lead: '+utterance);
for(const utterance of [
 'I am looking to buy a 1 million dollar house',
 'I want to buy a luxury home',
 'I want to buy a home',
 'I want to schedule a showing'
]) assert.equal(detectIntent('buyerIntent',utterance),true,'Missed buyer lead: '+utterance);
for(const utterance of ['I want to sell my car and move into a home','I just want to browse houses']) {
 assert.equal(detectIntent('sellerIntent',utterance),false,'False seller alert: '+utterance);
}
assert.equal(detectIntent('buyerIntent','I want to sell my 1 million dollar home'),false,
 'Do not mislabel a seller-only conversation as a buyer');


// A fully isolated browser test. All visitor API calls are mocked locally.
const browser=await webkit.launch({headless:true});
const context=await browser.newContext({...devices['iPhone 13']});
let mode='ai';
const history=[];
const calls=[];
let completedAiTurns=0;
try {
 await context.addInitScript(()=>{
  window.webkitSpeechRecognition=class FakeSpeechRecognition {
   constructor(){this.onresult=null;this.onend=null;this.onerror=null;this.lang='en-US';this.continuous=true;this.interimResults=true;}
   start(){window.__testRecognition=this;}
   stop(){this.onend?.();}
   abort(){this.onend?.();}
  };
  sessionStorage.setItem('missy_royal_gravity_entrance_v5','1');
  sessionStorage.setItem('missy_concierge_visitor_session_v1',JSON.stringify({
   conversation_id:'11111111-1111-4111-8111-111111111111',
   token:'a'.repeat(64),
   created_at:Date.now()
  }));
 });
 const page=await context.newPage();
 await page.route('https://concierge.test.invalid/functions/v1/concierge-api/**',async route=>{
  const request=route.request(),operation=new URL(request.url()).pathname.split('/').at(-1);
  calls.push(operation);
  const send=(payload,code=200)=>route.fulfill({status:code,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},body:JSON.stringify(payload)});
  if(operation==='sync')return send({status:mode,messages:history});
  if(operation==='typing')return send({ok:true});
  if(operation==='ack'){
   const body=request.postDataJSON();
   assert.ok(Array.isArray(body.message_ids));
   assert.ok(body.message_ids.every(id=>/^[-0-9a-f]{36}$/.test(id)));
   assert.equal(typeof body.read,'boolean');
   return send({ok:true});
  }
  if(operation==='message'){
   const {language,message}=request.postDataJSON();
   assert.equal(language,'auto');
   // Keep request pending long enough to verify honest visitor receipt states.
   await new Promise(resolve=>setTimeout(resolve,550));
   const turn=completedAiTurns++;
 const uuid=(n)=>'11111111-1111-4111-8111-'+String(n).padStart(12,'0');
 history.push({id:uuid(112+turn*3),sender:'visitor',body:message,created_at:new Date().toISOString()});
 const reply=turn===0
  ? 'Gracias. Missy confirmará los detalles. https://missydours.com/listings/14636-southern-pines-dr https://www.consumerfinance.gov/owning-a-home/loan-estimate/ https://www.trec.texas.gov/public/consumer-information/ https://missydours.com.evil.test/phishing'
  : 'Claro, puedo ayudarle a comparar áreas y sus próximos pasos.';
 history.push({id:uuid(113+turn*3),sender:'ai',body:reply,created_at:new Date().toISOString()});
 return send({reply,language:'es'});
  }
  if(operation==='handoff'){
   const body=request.postDataJSON();
   assert.equal(body.name,'Example Visitor');
   assert.equal(body.contact_consent,true);
   assert.equal(body.phone,'(202) 555-0147');
   mode='waiting_human';
   return send({status:mode});
  }
  if(operation==='attachment-upload'){
   assert.equal(mode,'human');
   assert.equal(request.headers()['x-file-type'],'application/pdf');
   return send({filename:'sample.pdf'},201);
  }
  throw new Error('Unexpected mocked operation: '+operation);
 });
 const response=await page.goto('http://127.0.0.1:4173',{waitUntil:'domcontentloaded'});
 assert.ok(response?.ok());
 const launcher=page.getByRole('button',{name:'Chat or call Missy'});
 await launcher.click();
 await page.getByRole('group',{name:'Contact Missy'}).getByRole('button',{name:'Message Missy Directly'}).click();
 const dialog=page.getByRole('dialog',{name:'Missy Dours private concierge'});
 const composer=dialog.getByRole('textbox',{name:"Message Missy's concierge"});
 assert.equal(await dialog.getByRole('button',{name:'Close concierge'}).count(),0);
 assert.equal(await dialog.getByRole('button',{name:'Request a team member'}).count(),0,'Human option should appear after first visitor message');
 const humanButton=dialog.getByRole('button',{name:'Prefer to speak with Missy directly?'});
 assert.equal(await humanButton.count(),0,'Do not offer a handoff before the visitor starts');
 await composer.fill('¿Puede ayudarme a comprar una casa?');
 assert.equal(await humanButton.count(),0,'Do not interrupt draft composition');
 const sentAt=Date.now();
 await dialog.getByRole('button',{name:'Send message'}).click();
 // User bubble renders immediately; AI stays hidden for the entire typing phase.
 await dialog.getByText('¿Puede ayudarme a comprar una casa?',{exact:true}).waitFor();

 const typing=dialog.getByRole('status',{name:'Assistant is typing'});
 const pendingReceipt=dialog.getByText('Sending…',{exact:true});
 await pendingReceipt.waitFor({state:'visible'});
 assert.equal(await typing.count(),0,'AI typing must not precede server acknowledgement');
 await page.waitForTimeout(180);
 assert.equal(await pendingReceipt.isVisible(),true,'A pending request cannot claim Sent');
 await dialog.getByText('Sent',{exact:true}).waitFor({state:'visible'});
 const sentVisibleAt=Date.now();
 assert.equal(await typing.count(),0,'AI typing cannot begin while Sent is visible');
 await dialog.getByText('Received by assistant',{exact:true}).waitFor({state:'visible'});
 const assistantReceivedAt=Date.now();
 assert.ok(assistantReceivedAt-sentVisibleAt>=650,'Sent should remain visible before assistant receipt');
 assert.equal(await typing.count(),0,'Assistant receipt must precede three-dot processing');
 await typing.waitFor({state:'visible'});
 const typingVisibleAt=Date.now();
 assert.equal(await dialog.getByText('Received by assistant',{exact:true}).count(),1,
   'Assistant receipt remains visible once typing begins');
 assert.equal(await dialog.locator('[data-message-arrival="outgoing"]').count(),1,
   'Fresh visitor messages slide into view from below');
 assert.equal(await dialog.getByText('Received by assistant',{exact:true}).count(),1,'Receipt stays visible during processing');
 assert.equal(await dialog.getByText('Sending…',{exact:true}).count(),0,'Once AI dots appear, receipt must not say Sending');
 assert.equal(await humanButton.count(),0,'No handoff during first AI thinking');
 assert.equal(await typing.locator('span[aria-hidden="true"]').count(),3,'Typing indicator has exactly three waving dots');
 assert.equal(await dialog.getByText('Gracias. Missy confirmará los detalles.',{exact:false}).count(),0,
   'Fast model output must not bypass the typing phase');
 await page.waitForTimeout(350);
 assert.equal(await typing.isVisible(),true,'Typing indicator remains visible before the reply');
 await dialog.getByText('Gracias. Missy confirmará los detalles.',{exact:false}).waitFor();
 assert.ok(await dialog.locator('[data-message-arrival="incoming"]').count()>=1,
   'New assistant replies rise into the conversation');
 assert.ok(Date.now()-typingVisibleAt>=3800,'AI reply remains behind the four-second minimum typing presentation');
 await typing.waitFor({state:'hidden'});
 assert.equal(calls.filter(operation=>operation==='typing').length,1,
   'Verified visitor composing a message must signal a single early push event');
 const listingLink=dialog.getByRole('link',{name:'https://missydours.com/listings/14636-southern-pines-dr'});
 await listingLink.waitFor();
 assert.equal(await listingLink.getAttribute('href'),'https://missydours.com/listings/14636-southern-pines-dr');
 assert.equal(await listingLink.getAttribute('target'),'_blank');
 assert.equal(await listingLink.getAttribute('rel'),'noopener noreferrer');
 const officialLink=dialog.getByRole('link',{name:'https://www.consumerfinance.gov/owning-a-home/loan-estimate/'});
 await officialLink.waitFor();
 assert.equal(await officialLink.getAttribute('href'),'https://www.consumerfinance.gov/owning-a-home/loan-estimate/');
 assert.equal(await dialog.getByRole('link',{name:'https://www.trec.texas.gov/public/consumer-information/'}).count(),1);
 assert.equal(await dialog.locator('a[href*="evil.test"]').count(),0,'Unapproved domains must not become links');
 // iOS form zoom prevention: mobile text fields must compute to >=16px.
 assert.equal(await composer.evaluate(el=>Number.parseFloat(getComputedStyle(el).fontSize)>=16),true);
 // The visitor's blue bubble must precede the concierge reply in DOM order.
 const bubbleLabels=await dialog.locator('.missy-concierge-body p.whitespace-pre-wrap').allTextContents();
 assert.ok(bubbleLabels.indexOf('¿Puede ayudarme a comprar una casa?')>=0);
 assert.ok(bubbleLabels.indexOf('¿Puede ayudarme a comprar una casa?')<bubbleLabels.indexOf('Gracias. Missy confirmará los detalles. https://missydours.com/listings/14636-southern-pines-dr https://www.consumerfinance.gov/owning-a-home/loan-estimate/ https://www.trec.texas.gov/public/consumer-information/ https://missydours.com.evil.test/phishing'));
 const visitorBubble=dialog.getByText('¿Puede ayudarme a comprar una casa?',{exact:true}).locator('xpath=..');
 assert.ok((await visitorBubble.getAttribute('class')).includes('bg-[#0A84FF]'));
 assert.ok((await visitorBubble.getAttribute('class')).includes('rounded-[26px]'),'Visitor messages need iPhone-like rounded corners');
 assert.ok((await visitorBubble.getAttribute('class')).includes('rounded-br-[9px]'),'Visitor tail corner should be softened');
 const replyBubble=dialog.locator('.missy-concierge-body p.whitespace-pre-wrap').filter({hasText:'Gracias. Missy confirmará los detalles.'});
 assert.ok((await replyBubble.getAttribute('class')).includes('rounded-bl-[9px]'),'Incoming message tail corner should be softened');
 // Stopping dictation keeps its text and offers a resume microphone.
 const mic=dialog.getByRole('button',{name:'Start voice dictation'});
 await mic.click();
 const stop=dialog.getByRole('button',{name:'Stop dictation and keep transcribed text'});
 await stop.waitFor({state:'visible'});
 await page.evaluate(()=>window.__testRecognition.onresult?.({results:[{0:{transcript:'I am looking in Dallas'},isFinal:true}]}));
 assert.equal(await composer.inputValue(),'I am looking in Dallas');
 await stop.click();
 const resume=dialog.getByRole('button',{name:'Resume voice dictation'});
 await resume.waitFor({state:'visible'});
 await resume.click();
 await page.evaluate(()=>window.__testRecognition.onresult?.({results:[{0:{transcript:'with a garden'},isFinal:true}]}));
 assert.equal(await composer.inputValue(),'I am looking in Dallas with a garden');
 await dialog.getByRole('button',{name:'Stop dictation and keep transcribed text'}).click();
 await resume.waitFor({state:'visible'});
 await composer.fill('');
 // Reactions must be hidden for the welcome bubble, AI replies, and visitor messages.
 assert.equal(await dialog.getByRole('button',{name:/^React to message/}).count(),0);

 assert.equal(await dialog.getByText(/Automatic language assistance/).count(),0);
 // Casual conversations offer human help only after three completed exchanges.
 assert.equal(await humanButton.count(),0,'A single completed AI answer must not trigger handoff');
 await composer.fill('Could you also share the next steps for buying?');
 assert.equal(await humanButton.count(),0,'Do not show while drafting second message');
 await dialog.getByRole('button',{name:'Send message'}).click();
 await typing.waitFor({state:'visible'});
 assert.equal(await humanButton.count(),0,'Do not show while second AI answer is pending');
 await dialog.getByText('Claro, puedo ayudarle a comparar áreas y sus próximos pasos.').waitFor();
 await typing.waitFor({state:'hidden'});
 await composer.evaluate(el=>el.blur());
 assert.equal(await humanButton.count(),0,'No casual handoff after two AI responses');
 await composer.fill('Thank you, just gathering some general information.');
 assert.equal(await humanButton.count(),0,'No handoff while typing third message');
 await dialog.getByRole('button',{name:'Send message'}).click();
 await typing.waitFor({state:'visible'});
 assert.equal(await humanButton.count(),0,'No handoff while third AI response is pending');
 await typing.waitFor({state:'hidden'});
 await composer.evaluate(el=>el.blur());
 await humanButton.waitFor({state:'visible'});
 assert.ok((await humanButton.getAttribute('class')).includes('rounded-full'),'Handoff remains a slim secondary pill');
 assert.equal(await humanButton.isEnabled(),true);
 await composer.focus();
 await humanButton.waitFor({state:'hidden'});
 await composer.evaluate(el=>el.blur());
 await humanButton.waitFor({state:'visible'});
 await humanButton.click();
 const form=dialog.getByRole('form',{name:'Request a callback'});
 await form.waitFor({state:'visible'});
 const callbackAction=form.getByRole('button',{name:'Request a callback'});
 const continueAction=form.getByRole('button',{name:'Keep chatting'});
 const [callbackBox,continueBox]=await Promise.all([callbackAction.boundingBox(),continueAction.boundingBox()]);
 assert.ok(callbackBox&&continueBox,'Both callback actions must render');
 assert.ok(callbackBox.width>=110&&continueBox.width>=110,'Both actions need comfortable mobile tap targets');
 assert.ok(Math.abs(callbackBox.width-continueBox.width)<=2,'Callback and keep-chatting actions must split the form evenly');
 assert.ok(Math.abs(callbackBox.height-continueBox.height)<=2&&callbackBox.height>=48,'Both action buttons need matching, accessible heights');
 assert.ok(continueBox.x>=callbackBox.x+callbackBox.width,'Keep chatting must occupy the right half');
 assert.equal(await continueAction.isEnabled(),true,'Keep chatting must work before entering contact details');
 await continueAction.click();
 await form.waitFor({state:'hidden'});
 await humanButton.waitFor({state:'visible'});
 await humanButton.click();
 await form.waitFor({state:'visible'});
 await form.getByPlaceholder('Full name').fill('Example Visitor');
 const phone=form.getByRole('textbox',{name:'Callback phone number'});
 const submit=form.getByRole('button',{name:'Request a callback'});
 await form.getByRole('checkbox').check();
 assert.equal(await submit.isDisabled(),true,'Consent alone never enables handoff without a phone');
 for(const invalid of ['1234567890','0005070570','4021110570','402507','9115070570']) {
   await phone.fill(invalid);
   assert.equal(await submit.isDisabled(),true,'Must reject invalid number: '+invalid);
   assert.equal(await phone.getAttribute('aria-invalid'),'true');
 }
 await form.getByText('Enter a valid 10-digit U.S. phone number, including area code.').waitFor();
 // Accept digits only and apply a consistent iPhone-friendly phone mask.
 await phone.fill('2025550147');
 assert.equal(await phone.inputValue(),'(202) 555-0147');
 assert.equal(await phone.getAttribute('aria-invalid'),'false');
 assert.equal(await submit.isEnabled(),true);
 // Also accept a pasted US country code without saving it twice.
 await phone.fill('+12025550147');
 assert.equal(await phone.inputValue(),'(202) 555-0147');
 await submit.click();
 await dialog.getByText(/Waiting for a team member/).waitFor();
 // A consented visitor can leave the full-screen chat to reach the very same
 // Contact section as the website navbar (not a blocked /#contact anchor).
 const directContact=dialog.getByRole('button',{name:'Contact Missy directly'});
 assert.ok(await directContact.isVisible());
 assert.ok((await directContact.getAttribute('class')).includes('min-h-12'),'Contact action must have a large touch target');
 await directContact.click();
 await dialog.waitFor({state:'hidden'});
 await page.waitForFunction(()=> {
   const section=document.getElementById('contact');
   if (!section || getComputedStyle(document.body).position==='fixed') return false;
   const wrapper=section.firstElementChild;
   const target=wrapper || section;
   const rect=target.getBoundingClientRect();
   const header=document.querySelector('header');
   const offset=(header?.getBoundingClientRect().height||0)+24;
   return Math.abs(rect.top-offset)<140;
 },{timeout:10000});
 await launcher.click();
 await dialog.waitFor({state:'visible'});
 await dialog.getByText(/Waiting for a team member/).waitFor();
 mode='human';
 history.push({id:'11111111-1111-4111-8111-111111111114',sender:'human',body:'Hi! This is Missy’s team. How can we help?',created_at:new Date().toISOString()});
 await dialog.getByRole('button',{name:'Close',exact:true}).click();
 await launcher.click();
 await dialog.getByText('A member of Missy’s team has joined this conversation.').waitFor();
 await dialog.getByText('Hi! This is Missy’s team. How can we help?').waitFor();
 assert.equal(await dialog.getByRole('status',{name:'Assistant is typing'}).count(),0,'Human messages must never show an AI typing indicator');
 // The real human agent's message is reactable, never the welcome, AI, or visitor messages.
 assert.equal(await dialog.getByRole('button',{name:/^React to message/}).count(),1);
 assert.equal(await dialog.getByRole('button',{name:'React to message 0'}).count(),0);
 assert.equal(await dialog.getByRole('button',{name:'React to message 11111111-1111-4111-8111-111111111113'}).count(),0);
 await dialog.getByRole('button',{name:'React to message 11111111-1111-4111-8111-111111111114'}).click();
 const choices=dialog.getByRole('group',{name:'Choose a message reaction'});
 assert.equal(await choices.getByRole('button').count(),5);
 assert.equal(await choices.getByRole('button',{name:'React with 😊'}).count(),1);
 assert.equal(await choices.getByRole('button',{name:'React with 😂'}).count(),0);
 await choices.getByRole('button',{name:'React with ❤️'}).click();
 assert.equal(await dialog.getByRole('button',{name:'React to message 11111111-1111-4111-8111-111111111114'}).getByText('❤️').count(),1);
 assert.ok(await page.evaluate(()=>sessionStorage.getItem('missy_concierge_reactions_11111111-1111-4111-8111-111111111111')?.includes('❤️')));
 await dialog.locator('input[type=file]').setInputFiles({
  name:'sample.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 fake file')
 });
 await dialog.getByText(/Securely received sample.pdf/).waitFor();
 assert.equal(calls.filter(x=>x==='handoff').length,1);
 console.log('PASS: simulated visitor AI, Spanish reply, consented callback, handoff, and human upload');
}finally{await context.close();await browser.close();}
