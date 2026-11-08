-- Visitor presence is an ephemeral signal, separate from messages or auth.
-- Public/anonymous clients have no table access. Only the token-verifying
-- Edge Function, using the service role, can write heartbeat timestamps.
create table if not exists public.ai_concierge_visitor_presence (
 conversation_id uuid primary key references public.ai_conversations(id) on delete cascade,
 last_seen_at timestamptz not null default now(),
 chat_visible boolean not null default false
);
alter table public.ai_concierge_visitor_presence enable row level security;
revoke all on public.ai_concierge_visitor_presence from anon, authenticated;
grant select on public.ai_concierge_visitor_presence to authenticated;
drop policy if exists "approved staff read visitor presence" on public.ai_concierge_visitor_presence;
create policy "approved staff read visitor presence" on public.ai_concierge_visitor_presence
 for select to authenticated using (
  (auth.jwt()->>'email') = any (array[
   'missydourshomes@gmail.com', 'yourcustomerflowguy@gmail.com',
   'heberherrera92@gmail.com'
  ])
 );
create index if not exists ai_concierge_visitor_presence_seen_idx
 on public.ai_concierge_visitor_presence (last_seen_at desc);
