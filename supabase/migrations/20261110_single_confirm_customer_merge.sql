-- Replace unnecessary staff verification-method questionnaire with
-- one explicit confirmation checkbox in the CRM.
-- Keep reviewer identity, timestamp, original record snapshot,
-- matched phone and conflicting-email protection unchanged.
CREATE OR REPLACE FUNCTION public.crm_consolidate_verified_leads(p_primary uuid, p_secondary uuid, p_confirmation text, p_verification_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_staff text:=lower(coalesce(auth.jwt()->>'email',''));
 a public.leads%rowtype; b public.leads%rowtype; ap text; bp text;
begin
 if v_staff not in ('missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com') then raise exception 'Unauthorized';end if;
 if p_primary is null or p_secondary is null or p_primary=p_secondary then raise exception 'Select two different leads';end if;
 if p_confirmation is distinct from 'CONFIRM SAME CUSTOMER' then raise exception 'Explicit confirmation required';end if;
 select * into a from public.leads where id=p_primary for update;
 select * into b from public.leads where id=p_secondary for update;
 if a.id is null or b.id is null or a.status='archived' then raise exception 'Primary must be an active lead and both leads must exist';end if;
 if exists(select 1 from public.crm_lead_consolidations where secondary_lead_id=p_secondary) then raise exception 'Already consolidated';end if;
 ap:=regexp_replace(a.phone,'[^0-9]','','g'); bp:=regexp_replace(b.phone,'[^0-9]','','g');
 if length(ap)=11 and left(ap,1)='1' then ap:=right(ap,10);end if;
 if length(bp)=11 and left(bp,1)='1' then bp:=right(bp,10);end if;
 if length(ap)<>10 or ap<>bp then raise exception 'Phone mismatch';end if;
 -- No staff verification-method questionnaire. The CRM requires an explicit
 -- staff confirmation for different-name records; the same-phone and
 -- conflicting-email safeguards continue to apply.
 if public.crm_normalize_identity_name(a.name)<>public.crm_normalize_identity_name(b.name)
    and p_verification_note is distinct from 'staff_confirmed_same_customer'
 then raise exception 'Confirm both records belong to the same customer';end if;
 if a.email<>'' and b.email<>'' and lower(a.email)<>lower(b.email)
 then raise exception 'Conflicting emails require additional identity verification';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(ap,0));
 insert into public.crm_lead_consolidations(primary_lead_id,secondary_lead_id,reviewed_by,verification_note,original_secondary)
 values(p_primary,p_secondary,v_staff,nullif(btrim(p_verification_note),''),to_jsonb(b));
 update public.ai_conversations set lead_id=p_primary where lead_id=p_secondary;
 update public.lead_contact_events set lead_id=p_primary where lead_id=p_secondary;
 update public.lead_followups set lead_id=p_primary where lead_id=p_secondary;
 update public.lead_activities set lead_id=p_primary where lead_id=p_secondary;
 update public.crm_callback_reminder_queue set lead_id=p_primary where lead_id=p_secondary;
 insert into public.lead_activities(lead_id,event_type,description,actor)
 values(p_primary,'note_saved','Staff consolidated a verified identity. Original submission and notes remain preserved in archived source record.',v_staff);
 update public.leads set status='archived' where id=p_secondary;
 return p_primary;
end $function$
;