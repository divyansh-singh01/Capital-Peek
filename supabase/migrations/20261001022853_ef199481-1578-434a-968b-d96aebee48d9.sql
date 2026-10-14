CREATE TABLE public.contract_roi_calculations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  name text NOT NULL,
  department text,
  inputs jsonb NOT NULL,
  results jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contract_roi_user_idx ON public.contract_roi_calculations (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_roi_calculations TO authenticated;
GRANT ALL ON public.contract_roi_calculations TO service_role;

ALTER TABLE public.contract_roi_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company reads contract analyses" ON public.contract_roi_calculations
FOR SELECT TO authenticated
USING ((user_id = auth.uid()) OR ((company_id IS NOT NULL) AND (company_id = public.current_company_id())));

CREATE POLICY "Users create own contract analyses" ON public.contract_roi_calculations
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own contract analyses" ON public.contract_roi_calculations
FOR UPDATE TO authenticated
USING ((user_id = auth.uid()) OR ((company_id = public.current_company_id()) AND public.can_edit()));

CREATE POLICY "Users delete own contract analyses" ON public.contract_roi_calculations
FOR DELETE TO authenticated
USING ((user_id = auth.uid()) OR ((company_id = public.current_company_id()) AND public.can_edit()));

CREATE TRIGGER contract_roi_updated BEFORE UPDATE ON public.contract_roi_calculations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();