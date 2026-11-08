-- Enable staff-RLS-protected real-time change events for the CRM.
-- Existing SELECT RLS policies continue to control who receives row changes.
do $$
begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='crm_activity_events') then
  alter publication supabase_realtime add table public.crm_activity_events;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ai_conversations') then
  alter publication supabase_realtime add table public.ai_conversations;
 end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ai_conversation_messages') then
  alter publication supabase_realtime add table public.ai_conversation_messages;
 end if;
end $$;