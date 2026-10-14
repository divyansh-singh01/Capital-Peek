ALTER TYPE public.deal_stage ADD VALUE IF NOT EXISTS 'contract' BEFORE 'won';

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS deal_name text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_due date,
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS won_at timestamptz;

CREATE TABLE public.deal_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id),
  created_by uuid NOT NULL,
  type text NOT NULL DEFAULT 'note',
  title text NOT NULL,
  body text,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_activities_type_chk CHECK (type IN ('call','email','meeting','note','task','stage_change','value_change','contract_created')),
  CONSTRAINT deal_activities_title_len CHECK (char_length(title) BETWEEN 1 AND 300)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_activities TO authenticated;
GRANT ALL ON public.deal_activities TO service_role;
ALTER TABLE public.deal_activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX deal_activities_deal_idx ON public.deal_activities(deal_id, created_at DESC);
CREATE POLICY "Company reads activities" ON public.deal_activities FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (company_id IS NOT NULL AND company_id = public.current_company_id()));
CREATE POLICY "Users add activities" ON public.deal_activities FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM public.deals d WHERE d.id = deal_id AND (d.created_by = auth.uid() OR (d.company_id IS NOT NULL AND d.company_id = public.current_company_id()))));
CREATE POLICY "Editors update activities" ON public.deal_activities FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));
CREATE POLICY "Editors delete activities" ON public.deal_activities FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id),
  created_by uuid NOT NULL,
  customer_name text NOT NULL,
  contract_name text NOT NULL,
  owner_name text,
  contract_value numeric NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contracts_status_chk CHECK (status IN ('draft','active','completed','cancelled'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE UNIQUE INDEX contracts_deal_unique ON public.contracts(deal_id) WHERE deal_id IS NOT NULL;
CREATE POLICY "Company reads contracts" ON public.contracts FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (company_id IS NOT NULL AND company_id = public.current_company_id()));
CREATE POLICY "Users create contracts" ON public.contracts FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Editors update contracts" ON public.contracts FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));
CREATE POLICY "Editors delete contracts" ON public.contracts FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));
CREATE TRIGGER contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.deal_track_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
    NEW.last_activity_at := now();
    IF NEW.stage::text = 'won' AND NEW.won_at IS NULL THEN NEW.won_at := now(); END IF;
    INSERT INTO public.deal_activities (deal_id, company_id, created_by, type, title)
    VALUES (NEW.id, NEW.company_id, COALESCE(auth.uid(), NEW.created_by), 'stage_change',
      'Stage changed: ' || initcap(OLD.stage::text) || ' → ' || initcap(NEW.stage::text));
  END IF;
  IF NEW.value IS DISTINCT FROM OLD.value THEN
    NEW.last_activity_at := now();
    INSERT INTO public.deal_activities (deal_id, company_id, created_by, type, title)
    VALUES (NEW.id, NEW.company_id, COALESCE(auth.uid(), NEW.created_by), 'value_change',
      'Deal value updated: ' || OLD.value::text || ' → ' || NEW.value::text);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.deal_track_changes() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER deals_track_changes BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.deal_track_changes();

CREATE OR REPLACE FUNCTION public.activity_touch_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.type NOT IN ('stage_change','value_change') THEN
    UPDATE public.deals SET last_activity_at = now() WHERE id = NEW.deal_id;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.activity_touch_deal() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER deal_activities_touch AFTER INSERT ON public.deal_activities FOR EACH ROW EXECUTE FUNCTION public.activity_touch_deal();