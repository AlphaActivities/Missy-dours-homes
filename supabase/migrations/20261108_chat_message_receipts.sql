-- Message acknowledgements are independent from visitor-presence heartbeats.
-- NULL means no verified delivery/read acknowledgement has been received.
alter table public.ai_conversation_messages
 add column if not exists delivered_to_staff_at timestamptz,
 add column if not exists read_by_staff_at timestamptz,
 add column if not exists delivered_to_visitor_at timestamptz,
 add column if not exists read_by_visitor_at timestamptz;

-- Approved staff may acknowledge only visitor messages in a conversation
-- they can access; client UI must be foreground and viewing the transcript
-- before requesting read=true.
create or replace function public.ai_concierge_ack_staff_messages(p_conversation uuid,p_read boolean default false)
returns integer language plpgsql security definer set search_path to ''
as $function$
declare actor text:=lower(coalesce(auth.jwt()->>'email','')); updated_count integer:=0;
begin
 if actor not in ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com') then
  raise exception 'not authorized';
 end if;
 if not exists (select 1 from public.ai_conversations where id=p_conversation) then return 0; end if;
 update public.ai_conversation_messages
 set delivered_to_staff_at=coalesce(delivered_to_staff_at,now()),
     read_by_staff_at=case when p_read then coalesce(read_by_staff_at,now()) else read_by_staff_at end
 where conversation_id=p_conversation and sender='visitor'
   and (delivered_to_staff_at is null or (p_read and read_by_staff_at is null));
 get diagnostics updated_count=row_count;
 return updated_count;
end $function$;
revoke all on function public.ai_concierge_ack_staff_messages(uuid,boolean) from public,anon;
grant execute on function public.ai_concierge_ack_staff_messages(uuid,boolean) to authenticated;

-- Never let browser clients mutate receipt columns directly.
revoke update (delivered_to_staff_at,read_by_staff_at,delivered_to_visitor_at,read_by_visitor_at)
 on table public.ai_conversation_messages from anon,authenticated;
