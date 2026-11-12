CREATE OR REPLACE FUNCTION public.crm_log_archive_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
 IF NEW.status IS DISTINCT FROM OLD.status AND (NEW.status='archived' OR OLD.status='archived') THEN
  INSERT INTO public.crm_activity_events(event_key,category,title,summary,target_path)
  VALUES ('staff:archive:'||NEW.id::text||':'||pg_catalog.gen_random_uuid()::text,
          'staff',
          CASE WHEN NEW.status='archived' THEN 'Lead Archived' ELSE 'Lead Restored' END,
          left(coalesce(nullif(btrim(NEW.name),''),'Customer'),90)||
          CASE WHEN NEW.status='archived' THEN ' moved to Archived' ELSE ' restored from Archived' END,
          '/dashboard/leads?lead='||NEW.id::text);
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS crm_lead_archive_activity ON public.leads;
CREATE TRIGGER crm_lead_archive_activity AFTER UPDATE OF status ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.crm_log_archive_transition();
REVOKE ALL ON FUNCTION public.crm_log_archive_transition() FROM PUBLIC, anon, authenticated;