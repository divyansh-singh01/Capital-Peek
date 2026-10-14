CREATE TABLE public.payment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL CHECK (char_length(client_name) BETWEEN 1 AND 150),
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency IN ('INR','USD')),
  utr text CHECK (utr IS NULL OR char_length(utr) <= 64),
  proof_path text,
  plan text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.payment_submissions TO anon, authenticated;
GRANT SELECT, UPDATE ON public.payment_submissions TO authenticated;
GRANT ALL ON public.payment_submissions TO service_role;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit payment" ON public.payment_submissions FOR INSERT TO anon, authenticated WITH CHECK (status = 'pending');
CREATE POLICY "Editors read payments" ON public.payment_submissions FOR SELECT TO authenticated USING (public.can_edit());
CREATE POLICY "Editors update payments" ON public.payment_submissions FOR UPDATE TO authenticated USING (public.can_edit());
CREATE POLICY "Anyone can upload payment proof" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'payment-proofs');
CREATE POLICY "Editors view payment proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs' AND public.can_edit());