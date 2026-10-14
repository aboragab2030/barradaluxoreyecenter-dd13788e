CREATE POLICY "Anyone uploads instapay evidence" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'instapay-evidence' AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp','pdf'));
CREATE POLICY "Reviewers read instapay evidence" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'instapay-evidence' AND public.can_review_instapay(auth.uid()));