-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'sales_manager', 'viewer');
CREATE TYPE public.deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost');

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  team_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  job_title TEXT,
  avatar_url TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager');
$$;

-- Policies: companies / profiles / roles
CREATE POLICY "Members read their company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());
CREATE POLICY "Anyone signed in can create a company" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "Admins update their company" ON public.companies FOR UPDATE TO authenticated
  USING (id = public.current_company_id() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR (company_id IS NOT NULL AND company_id = public.current_company_id()));
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ROI calculations
CREATE TABLE public.roi_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  inputs JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roi_calculations TO authenticated;
GRANT ALL ON public.roi_calculations TO service_role;
ALTER TABLE public.roi_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company reads scenarios" ON public.roi_calculations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (company_id IS NOT NULL AND company_id = public.current_company_id()));
CREATE POLICY "Editors create scenarios" ON public.roi_calculations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Editors update scenarios" ON public.roi_calculations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));
CREATE POLICY "Editors delete scenarios" ON public.roi_calculations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));

-- Deals
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  owner_name TEXT,
  account_name TEXT NOT NULL,
  contact_name TEXT,
  value NUMERIC NOT NULL DEFAULT 0,
  stage public.deal_stage NOT NULL DEFAULT 'lead',
  probability INTEGER NOT NULL DEFAULT 20,
  expected_close_date DATE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company reads deals" ON public.deals FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (company_id IS NOT NULL AND company_id = public.current_company_id()));
CREATE POLICY "Editors create deals" ON public.deals FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Editors update deals" ON public.deals FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));
CREATE POLICY "Editors delete deals" ON public.deals FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));

-- Team members
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  role_title TEXT,
  quota NUMERIC NOT NULL DEFAULT 0,
  closed_revenue NUMERIC NOT NULL DEFAULT 0,
  win_rate NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company reads team" ON public.team_members FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (company_id IS NOT NULL AND company_id = public.current_company_id()));
CREATE POLICY "Editors create team" ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Editors update team" ON public.team_members FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));
CREATE POLICY "Editors delete team" ON public.team_members FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));

-- Case studies
CREATE TABLE public.case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  client_name TEXT NOT NULL,
  industry TEXT,
  summary TEXT,
  before_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  roi_percent NUMERIC,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_studies TO authenticated;
GRANT SELECT ON public.case_studies TO anon;
GRANT ALL ON public.case_studies TO service_role;
ALTER TABLE public.case_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published case studies are public" ON public.case_studies FOR SELECT TO anon, authenticated
  USING (published = true);
CREATE POLICY "Company reads own case studies" ON public.case_studies FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (company_id IS NOT NULL AND company_id = public.current_company_id()));
CREATE POLICY "Editors create case studies" ON public.case_studies FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Editors update case studies" ON public.case_studies FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));
CREATE POLICY "Editors delete case studies" ON public.case_studies FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR (company_id = public.current_company_id() AND public.can_edit()));

-- Leads (public calculator capture)
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  inputs JSONB,
  extra_revenue_year NUMERIC,
  roi_percent NUMERIC,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT TO anon, authenticated
  WITH CHECK (true);
CREATE POLICY "Signed-in users read leads" ON public.leads FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "Editors update leads" ON public.leads FOR UPDATE TO authenticated
  USING (public.can_edit());

-- updated_at triggers
CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER roi_updated BEFORE UPDATE ON public.roi_calculations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER team_updated BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER case_studies_updated BEFORE UPDATE ON public.case_studies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- New signups get a profile and a default admin role for their own workspace
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();