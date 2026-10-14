-- companies: only signed-in users without a company may create one, with sane values
DROP POLICY IF EXISTS "Anyone signed in can create a company" ON public.companies;
CREATE POLICY "Users without a company can create one"
ON public.companies FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND public.current_company_id() IS NULL
  AND char_length(btrim(name)) BETWEEN 1 AND 200
);

-- leads: public submissions must be well-formed and start as 'new'
DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a valid lead"
ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  status = 'new'
  AND char_length(email) BETWEEN 3 AND 254
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (full_name IS NULL OR char_length(full_name) <= 150)
  AND (company IS NULL OR char_length(company) <= 200)
);

-- payment-proofs: only uuid-named image files at bucket root
DROP POLICY IF EXISTS "Anyone can upload payment proof" ON storage.objects;
CREATE POLICY "Upload payment proof images with generated names"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] IS NULL
  AND name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|gif|webp|heic|heif|bmp)$'
);