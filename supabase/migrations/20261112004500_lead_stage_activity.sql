CREATE OR REPLACE FUNCTION public.crm_log_lead_stage_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('contacted','qualified','closed') THEN
  INSERT INTO public.crm_activity_events(event_key,category,title,summary,target_path)
  VALUES ('staff:stage:'||NEW.id::text||':'||pg_catalog.gen_random_uuid()::text,
          'staff','Lead Moved to '||initcap(NEW.status),
          left(coalesce(nullif(btrim(NEW.name),''),'Customer'),90)||' moved from '||initcap(OLD.status)||' to '||initcap(NEW.status),
          '/dashboard/leads?lead='||NEW.id::text);
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS crm_lead_stage_activity ON public.leads;
CREATE TRIGGER crm_lead_stage_activity AFTER UPDATE OF status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.crm_log_lead_stage_transition();
REVOKE ALL ON FUNCTION public.crm_log_lead_stage_transition() FROM PUBLIC,anon,authenticated;