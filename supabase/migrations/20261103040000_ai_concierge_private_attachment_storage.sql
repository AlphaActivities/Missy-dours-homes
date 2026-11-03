-- Private visitor uploads are accepted only through the authenticated
-- Concierge Edge Function while a staff agent owns the conversation.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('missy-concierge-attachments','missy-concierge-attachments',false,10485760,
        ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Browser roles cannot upload or read private objects except approved staff
-- reading attachments inside the existing authenticated CRM.
CREATE POLICY "Approved Missy staff view concierge attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
 bucket_id='missy-concierge-attachments'
 AND lower(coalesce(auth.jwt()->>'email','')) IN (
   'missydourshomes@gmail.com','yourcustomerflowguy@gmail.com','heberherrera92@gmail.com'
 )
);
