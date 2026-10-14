-- =====================================================================================
-- Security hardening + workspace model
--
-- Fixes found in the audit:
--  * Any signed-in user could set profiles.company_id to another company's UUID and read
--    that company's deals, contracts, scenarios and member emails (tenant takeover).
--  * company_id / created_by / user_id / deal_id were client-controlled on INSERT and
--    UPDATE, so rows could be injected into (or moved to) another company.
--  * Viewer role was not enforced for writes to company data.
--  * deals.value / probability, contracts.contract_value etc. accepted negative or absurd
--    numbers (e.g. probability 500, value -5).
--  * Contracts could be attached to any deal id, including deals that are not "won".
--  * Payment rows could be silently rewritten (amount, client, status) and "verified"
--    payments reversed, with no record of who verified them; no duplicate-UTR protection.
--  * payment-proofs bucket had no size or MIME limit; lead payloads were unbounded.
--  * "First user becomes admin" was racy.
--
-- Model after this migration
--  * Platform staff (user_roles admin / sales_manager) review payments and leads: is_staff().
--  * Workspaces: profiles.company_id + profiles.company_role (owner / editor / viewer).
--    Users can ONLY create/join/leave a workspace through the RPCs below.
--  * can_edit() = platform staff OR workspace owner/editor. Used for company-shared rows.
-- =====================================================================================

-- ---------- 1. Helpers --------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_role text;
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_company_role_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_company_role_chk
  CHECK (company_role IS NULL OR company_role IN ('owner', 'editor', 'viewer'));
-- A role only makes sense inside a workspace.
UPDATE public.profiles SET company_role = NULL WHERE company_id IS NULL;
UPDATE public.profiles SET company_role = 'editor' WHERE company_id IS NOT NULL AND company_role IS NULL;
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_needs_company_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_needs_company_chk
  CHECK ((company_id IS NULL) = (company_role IS NULL));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS invite_code text NOT NULL
  DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
CREATE UNIQUE INDEX IF NOT EXISTS companies_invite_code_key ON public.companies (invite_code);

CREATE OR REPLACE FUNCTION public.current_company_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_role FROM public.profiles WHERE id = auth.uid();
$$;

-- Platform staff: may review payments and inbound leads (previously called can_edit()).
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales_manager');
$$;

-- May edit company-shared rows (policies always pair this with company_id = current_company_id()).
CREATE OR REPLACE FUNCTION public.can_edit()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff() OR COALESCE(public.current_company_role() IN ('owner', 'editor'), false);
$$;

REVOKE EXECUTE ON FUNCTION public.current_company_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_company_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ---------- 2. Profiles & companies: no direct tenant switching ---------------------

-- Profile rows are created by the signup trigger only; users may edit just their display fields.
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
REVOKE INSERT, DELETE, UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (full_name, job_title, avatar_url) ON public.profiles TO authenticated;

-- Backfill any auth user that is missing a profile (previously the client could insert one).
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, u.raw_user_meta_data ->> 'full_name'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Companies are created via create_workspace(); only the owner edits public fields;
-- the invite code is never readable through the table API.
DROP POLICY IF EXISTS "Users without a company can create one" ON public.companies;
DROP POLICY IF EXISTS "Anyone signed in can create a company" ON public.companies;
DROP POLICY IF EXISTS "Admins update their company" ON public.companies;
REVOKE INSERT, UPDATE, DELETE, SELECT ON public.companies FROM authenticated, anon;
GRANT SELECT (id, name, website, industry, team_size, created_at, updated_at) ON public.companies TO authenticated;
GRANT UPDATE (name, website, industry, team_size) ON public.companies TO authenticated;
CREATE POLICY "Owners update their company" ON public.companies
  FOR UPDATE TO authenticated
  USING (id = public.current_company_id() AND public.current_company_role() = 'owner')
  WITH CHECK (id = public.current_company_id() AND char_length(btrim(name)) BETWEEN 1 AND 200);

CREATE OR REPLACE FUNCTION public.create_workspace(p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Workspace name must be 1-200 characters' USING ERRCODE = '22023';
  END IF;
  IF public.current_company_id() IS NOT NULL THEN
    RAISE EXCEPTION 'Leave your current workspace first' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.companies (name) VALUES (btrim(p_name)) RETURNING id INTO cid;
  UPDATE public.profiles SET company_id = cid, company_role = 'owner' WHERE id = auth.uid();
  -- Existing personal data follows the user into the workspace they just created.
  UPDATE public.deals SET company_id = cid WHERE created_by = auth.uid() AND company_id IS NULL;
  UPDATE public.contracts SET company_id = cid WHERE created_by = auth.uid() AND company_id IS NULL;
  UPDATE public.deal_activities SET company_id = cid WHERE created_by = auth.uid() AND company_id IS NULL;
  UPDATE public.roi_calculations SET company_id = cid WHERE user_id = auth.uid() AND company_id IS NULL;
  UPDATE public.contract_roi_calculations SET company_id = cid WHERE user_id = auth.uid() AND company_id IS NULL;
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.join_workspace(p_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  IF public.current_company_id() IS NOT NULL THEN
    RAISE EXCEPTION 'Leave your current workspace first' USING ERRCODE = '42501';
  END IF;
  SELECT id INTO cid FROM public.companies WHERE invite_code = lower(btrim(coalesce(p_code, '')));
  IF cid IS NULL THEN RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = '22023'; END IF;
  UPDATE public.profiles SET company_id = cid, company_role = 'viewer' WHERE id = auth.uid();
  RETURN cid;
END $$;

CREATE OR REPLACE FUNCTION public.leave_workspace()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; others int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  cid := public.current_company_id();
  IF cid IS NULL THEN RETURN; END IF;
  IF public.current_company_role() = 'owner' THEN
    SELECT count(*) INTO others FROM public.profiles WHERE company_id = cid AND id <> auth.uid();
    IF others > 0 THEN
      RAISE EXCEPTION 'Make another member the owner or remove all members before leaving' USING ERRCODE = '42501';
    END IF;
  END IF;
  UPDATE public.profiles SET company_id = NULL, company_role = NULL WHERE id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.set_member_role(p_user uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  IF p_role NOT IN ('owner', 'editor', 'viewer') THEN
    RAISE EXCEPTION 'Unknown role' USING ERRCODE = '22023';
  END IF;
  cid := public.current_company_id();
  IF cid IS NULL OR public.current_company_role() <> 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can change roles' USING ERRCODE = '42501';
  END IF;
  IF p_user = auth.uid() THEN
    RAISE EXCEPTION 'Transfer ownership by promoting another member instead' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user AND company_id = cid) THEN
    RAISE EXCEPTION 'Member not found' USING ERRCODE = '22023';
  END IF;
  UPDATE public.profiles SET company_role = p_role WHERE id = p_user;
  -- Promoting someone to owner transfers ownership (exactly one owner).
  IF p_role = 'owner' THEN
    UPDATE public.profiles SET company_role = 'editor' WHERE id = auth.uid();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.remove_member(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000'; END IF;
  cid := public.current_company_id();
  IF cid IS NULL OR public.current_company_role() <> 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can remove members' USING ERRCODE = '42501';
  END IF;
  IF p_user = auth.uid() THEN
    RAISE EXCEPTION 'Use "Leave workspace" to remove yourself' USING ERRCODE = '42501';
  END IF;
  UPDATE public.profiles SET company_id = NULL, company_role = NULL WHERE id = p_user AND company_id = cid;
END $$;

CREATE OR REPLACE FUNCTION public.get_invite_code()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.invite_code FROM public.companies c
  WHERE c.id = public.current_company_id() AND public.current_company_role() = 'owner';
$$;

CREATE OR REPLACE FUNCTION public.rotate_invite_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE code text;
BEGIN
  IF public.current_company_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Only the workspace owner can rotate the invite code' USING ERRCODE = '42501';
  END IF;
  code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  UPDATE public.companies SET invite_code = code WHERE id = public.current_company_id();
  RETURN code;
END $$;

REVOKE EXECUTE ON FUNCTION public.create_workspace(text), public.join_workspace(text), public.leave_workspace(),
  public.set_member_role(uuid, text), public.remove_member(uuid), public.get_invite_code(),
  public.rotate_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_workspace(text), public.join_workspace(text), public.leave_workspace(),
  public.set_member_role(uuid, text), public.remove_member(uuid), public.get_invite_code(),
  public.rotate_invite_code() TO authenticated;

-- ---------- 3. Server-authoritative ownership & company scope -----------------------

-- Columns that decide who owns / can see a row must never change after insert.
CREATE OR REPLACE FUNCTION public.lock_columns()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c text;
BEGIN
  -- Only guard direct client writes. Internal writes (SECURITY DEFINER functions, FK actions,
  -- migrations, service role) run as the table owner and are trusted.
  IF auth.uid() IS NULL OR current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  FOREACH c IN ARRAY TG_ARGV LOOP
    IF to_jsonb(NEW) -> c IS DISTINCT FROM to_jsonb(OLD) -> c THEN
      RAISE EXCEPTION 'Column "%" cannot be changed', c USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.lock_columns() FROM PUBLIC, anon, authenticated;

-- Top-level rows: the server decides company_id from the caller's workspace, never the client.
CREATE OR REPLACE FUNCTION public.scope_company_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  cid := public.current_company_id();
  IF cid IS NOT NULL AND NOT public.can_edit() THEN
    RAISE EXCEPTION 'Your role in this workspace is view-only.' USING ERRCODE = '42501';
  END IF;
  NEW.company_id := cid;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.scope_company_on_insert() FROM PUBLIC, anon, authenticated;

-- Child rows inherit the deal's company and require edit rights on that deal.
CREATE OR REPLACE FUNCTION public.scope_from_deal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE d record; cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.deal_id IS NULL THEN
    -- Only contracts may be deal-less; treat them like any other top-level row.
    cid := public.current_company_id();
    IF cid IS NOT NULL AND NOT public.can_edit() THEN
      RAISE EXCEPTION 'Your role in this workspace is view-only.' USING ERRCODE = '42501';
    END IF;
    NEW.company_id := cid;
    RETURN NEW;
  END IF;
  SELECT id, company_id, created_by, stage::text AS stage INTO d FROM public.deals WHERE id = NEW.deal_id;
  IF NOT FOUND OR NOT (
    d.created_by = auth.uid()
    OR (d.company_id IS NOT NULL AND d.company_id = public.current_company_id() AND public.can_edit())
  ) THEN
    RAISE EXCEPTION 'You do not have permission to add to this deal.' USING ERRCODE = '42501';
  END IF;
  IF TG_TABLE_NAME = 'contracts' AND d.stage <> 'won' THEN
    RAISE EXCEPTION 'A contract can only be created for a won deal.' USING ERRCODE = '23514';
  END IF;
  NEW.company_id := d.company_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.scope_from_deal() FROM PUBLIC, anon, authenticated;

-- A deal that has a contract is a financial record: it cannot be deleted out from under it,
-- and a contract cannot be re-pointed at a different deal.
CREATE OR REPLACE FUNCTION public.protect_deal_with_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.contracts WHERE deal_id = OLD.id) THEN
    RAISE EXCEPTION 'This deal has a contract. Delete or cancel the contract first.' USING ERRCODE = '23503';
  END IF;
  RETURN OLD;
END $$;
REVOKE EXECUTE ON FUNCTION public.protect_deal_with_contract() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lock_contract_deal()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_user IN ('authenticated', 'anon')
     AND NEW.deal_id IS NOT NULL AND NEW.deal_id IS DISTINCT FROM OLD.deal_id THEN
    RAISE EXCEPTION 'A contract cannot be moved to a different deal.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.lock_contract_deal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS deals_scope_insert ON public.deals;
CREATE TRIGGER deals_scope_insert BEFORE INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION public.scope_company_on_insert();
DROP TRIGGER IF EXISTS roi_scope_insert ON public.roi_calculations;
CREATE TRIGGER roi_scope_insert BEFORE INSERT ON public.roi_calculations FOR EACH ROW EXECUTE FUNCTION public.scope_company_on_insert();
DROP TRIGGER IF EXISTS contract_roi_scope_insert ON public.contract_roi_calculations;
CREATE TRIGGER contract_roi_scope_insert BEFORE INSERT ON public.contract_roi_calculations FOR EACH ROW EXECUTE FUNCTION public.scope_company_on_insert();
DROP TRIGGER IF EXISTS team_scope_insert ON public.team_members;
CREATE TRIGGER team_scope_insert BEFORE INSERT ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.scope_company_on_insert();
DROP TRIGGER IF EXISTS case_studies_scope_insert ON public.case_studies;
CREATE TRIGGER case_studies_scope_insert BEFORE INSERT ON public.case_studies FOR EACH ROW EXECUTE FUNCTION public.scope_company_on_insert();
DROP TRIGGER IF EXISTS contracts_scope_insert ON public.contracts;
CREATE TRIGGER contracts_scope_insert BEFORE INSERT ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.scope_from_deal();
DROP TRIGGER IF EXISTS activities_scope_insert ON public.deal_activities;
CREATE TRIGGER activities_scope_insert BEFORE INSERT ON public.deal_activities FOR EACH ROW EXECUTE FUNCTION public.scope_from_deal();

DROP TRIGGER IF EXISTS deals_lock ON public.deals;
CREATE TRIGGER deals_lock BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.lock_columns('created_by', 'company_id');
DROP TRIGGER IF EXISTS contracts_lock ON public.contracts;
CREATE TRIGGER contracts_lock BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.lock_columns('created_by', 'company_id');
DROP TRIGGER IF EXISTS contracts_lock_deal ON public.contracts;
CREATE TRIGGER contracts_lock_deal BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.lock_contract_deal();
DROP TRIGGER IF EXISTS activities_lock ON public.deal_activities;
CREATE TRIGGER activities_lock BEFORE UPDATE ON public.deal_activities FOR EACH ROW EXECUTE FUNCTION public.lock_columns('created_by', 'company_id', 'deal_id', 'type');
DROP TRIGGER IF EXISTS roi_lock ON public.roi_calculations;
CREATE TRIGGER roi_lock BEFORE UPDATE ON public.roi_calculations FOR EACH ROW EXECUTE FUNCTION public.lock_columns('user_id', 'company_id');
DROP TRIGGER IF EXISTS contract_roi_lock ON public.contract_roi_calculations;
CREATE TRIGGER contract_roi_lock BEFORE UPDATE ON public.contract_roi_calculations FOR EACH ROW EXECUTE FUNCTION public.lock_columns('user_id', 'company_id');
DROP TRIGGER IF EXISTS team_lock ON public.team_members;
CREATE TRIGGER team_lock BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.lock_columns('created_by', 'company_id');
DROP TRIGGER IF EXISTS case_studies_lock ON public.case_studies;
CREATE TRIGGER case_studies_lock BEFORE UPDATE ON public.case_studies FOR EACH ROW EXECUTE FUNCTION public.lock_columns('created_by', 'company_id');
DROP TRIGGER IF EXISTS deals_protect_contract ON public.deals;
CREATE TRIGGER deals_protect_contract BEFORE DELETE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.protect_deal_with_contract();

-- Users may log only human activity types; stage/value changes come from the deal trigger.
DROP POLICY IF EXISTS "Users add activities" ON public.deal_activities;
CREATE POLICY "Users add activities" ON public.deal_activities FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND type IN ('call', 'email', 'meeting', 'note', 'task', 'contract_created'));

-- ---------- 4. Data-integrity constraints ------------------------------------------

UPDATE public.deals SET value = GREATEST(0, LEAST(value, 1000000000000)),
                        probability = GREATEST(0, LEAST(probability, 100))
WHERE value < 0 OR value > 1000000000000 OR probability < 0 OR probability > 100;
UPDATE public.contracts SET contract_value = GREATEST(0, LEAST(contract_value, 1000000000000))
WHERE contract_value < 0 OR contract_value > 1000000000000;
UPDATE public.contracts SET end_date = NULL WHERE end_date IS NOT NULL AND start_date IS NOT NULL AND end_date < start_date;

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_value_chk;
ALTER TABLE public.deals ADD CONSTRAINT deals_value_chk CHECK (value >= 0 AND value <= 1000000000000);
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_probability_chk;
ALTER TABLE public.deals ADD CONSTRAINT deals_probability_chk CHECK (probability BETWEEN 0 AND 100);
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_text_len_chk;
ALTER TABLE public.deals ADD CONSTRAINT deals_text_len_chk CHECK (
  char_length(btrim(account_name)) BETWEEN 1 AND 200
  AND (deal_name IS NULL OR char_length(deal_name) <= 200)
  AND (contact_name IS NULL OR char_length(contact_name) <= 200)
  AND (owner_name IS NULL OR char_length(owner_name) <= 200)
  AND (next_action IS NULL OR char_length(next_action) <= 300)
) NOT VALID;

ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_value_chk;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_value_chk CHECK (contract_value >= 0 AND contract_value <= 1000000000000);
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_dates_chk;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_dates_chk CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date);
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_text_len_chk;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_text_len_chk CHECK (
  char_length(btrim(customer_name)) BETWEEN 1 AND 200
  AND char_length(btrim(contract_name)) BETWEEN 1 AND 200
  AND (notes IS NULL OR char_length(notes) <= 5000)
) NOT VALID;

ALTER TABLE public.deal_activities DROP CONSTRAINT IF EXISTS deal_activities_body_len;
ALTER TABLE public.deal_activities ADD CONSTRAINT deal_activities_body_len CHECK (body IS NULL OR char_length(body) <= 5000) NOT VALID;

ALTER TABLE public.roi_calculations DROP CONSTRAINT IF EXISTS roi_name_len_chk;
ALTER TABLE public.roi_calculations ADD CONSTRAINT roi_name_len_chk CHECK (char_length(btrim(name)) BETWEEN 1 AND 200 AND (notes IS NULL OR char_length(notes) <= 2000) AND pg_column_size(inputs) < 20000 AND pg_column_size(results) < 20000) NOT VALID;
ALTER TABLE public.contract_roi_calculations DROP CONSTRAINT IF EXISTS contract_roi_name_len_chk;
ALTER TABLE public.contract_roi_calculations ADD CONSTRAINT contract_roi_name_len_chk CHECK (char_length(btrim(name)) BETWEEN 1 AND 200 AND pg_column_size(inputs) < 20000 AND pg_column_size(results) < 20000) NOT VALID;

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_payload_size_chk;
ALTER TABLE public.leads ADD CONSTRAINT leads_payload_size_chk CHECK (inputs IS NULL OR pg_column_size(inputs) < 10000) NOT VALID;

-- ---------- 5. Payments: tamper-evident, staff-only review --------------------------

ALTER TABLE public.payment_submissions
  ADD COLUMN IF NOT EXISTS contact text,
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.payment_submissions DROP CONSTRAINT IF EXISTS payment_status_chk;
ALTER TABLE public.payment_submissions ADD CONSTRAINT payment_status_chk CHECK (status IN ('pending', 'verified', 'rejected')) NOT VALID;
ALTER TABLE public.payment_submissions DROP CONSTRAINT IF EXISTS payment_amount_max_chk;
ALTER TABLE public.payment_submissions ADD CONSTRAINT payment_amount_max_chk CHECK (amount <= 100000000) NOT VALID;
ALTER TABLE public.payment_submissions DROP CONSTRAINT IF EXISTS payment_text_len_chk;
ALTER TABLE public.payment_submissions ADD CONSTRAINT payment_text_len_chk CHECK (
  (plan IS NULL OR char_length(plan) <= 100)
  AND (contact IS NULL OR char_length(contact) BETWEEN 3 AND 200)
) NOT VALID;

-- The same transaction id cannot back two live submissions.
CREATE UNIQUE INDEX IF NOT EXISTS payment_submissions_utr_unique
  ON public.payment_submissions (lower(btrim(utr)))
  WHERE utr IS NOT NULL AND btrim(utr) <> '' AND status <> 'rejected';

DROP POLICY IF EXISTS "Anyone can submit payment" ON public.payment_submissions;
DROP POLICY IF EXISTS "Editors read payments" ON public.payment_submissions;
DROP POLICY IF EXISTS "Editors update payments" ON public.payment_submissions;
CREATE POLICY "Anyone can submit payment" ON public.payment_submissions FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND verified_by IS NULL AND verified_at IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())
    AND contact IS NOT NULL
  );
CREATE POLICY "Staff read payments" ON public.payment_submissions FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff update payment status" ON public.payment_submissions FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Staff can change the status and nothing else (amount, client, UTR, proof are immutable).
REVOKE UPDATE, DELETE ON public.payment_submissions FROM authenticated, anon;
GRANT UPDATE (status) ON public.payment_submissions TO authenticated;
REVOKE SELECT ON public.payment_submissions FROM anon;

CREATE OR REPLACE FUNCTION public.payment_review_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'verified' AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'A verified payment is final and cannot be changed.' USING ERRCODE = '42501';
    END IF;
    NEW.verified_by := CASE WHEN NEW.status = 'verified' THEN auth.uid() ELSE NULL END;
    NEW.verified_at := CASE WHEN NEW.status = 'verified' THEN now() ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.payment_review_audit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS payment_review_audit_trg ON public.payment_submissions;
CREATE TRIGGER payment_review_audit_trg BEFORE UPDATE ON public.payment_submissions FOR EACH ROW EXECUTE FUNCTION public.payment_review_audit();

-- Leads & proof storage: staff only (platform-wide data, not workspace data).
DROP POLICY IF EXISTS "Editors read leads" ON public.leads;
DROP POLICY IF EXISTS "Editors update leads" ON public.leads;
CREATE POLICY "Staff read leads" ON public.leads FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "Staff update leads" ON public.leads FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
REVOKE UPDATE ON public.leads FROM authenticated;
GRANT UPDATE (status) ON public.leads TO authenticated;
REVOKE DELETE ON public.leads FROM authenticated;

DROP POLICY IF EXISTS "Editors view payment proofs" ON storage.objects;
CREATE POLICY "Staff view payment proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.is_staff());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('payment-proofs', 'payment-proofs', false, 5242880,
        ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/bmp'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 5242880,
      allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/bmp'];

-- ---------- 6. Signup: race-free "first user is platform admin" ---------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, left(NEW.raw_user_meta_data ->> 'full_name', 150))
  ON CONFLICT (id) DO NOTHING;

  -- Serialise concurrent first signups so exactly one becomes admin.
  PERFORM pg_advisory_xact_lock(hashtext('capitalpeek.first_admin'));
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'viewer') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------- 7. Row access follows CURRENT membership, not authorship ----------------
-- Before: "created_by = me OR same company". A member who was removed from a workspace (or
-- left) kept reading/editing/deleting every company row they had ever created. Now a row is
-- either personal (company_id IS NULL, visible to its creator) or a workspace row (visible
-- to current members; editable by owners/editors).

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('deals', 'created_by'),
      ('contracts', 'created_by'),
      ('deal_activities', 'created_by'),
      ('roi_calculations', 'user_id'),
      ('contract_roi_calculations', 'user_id'),
      ('team_members', 'created_by'),
      ('case_studies', 'created_by')
    ) AS v(tbl, owner_col)
  LOOP
    -- drop the old SELECT / UPDATE / DELETE policies, whatever they were called
    EXECUTE (
      SELECT coalesce(string_agg(format('DROP POLICY %I ON public.%I;', policyname, r.tbl), ' '), '')
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = r.tbl AND cmd IN ('SELECT', 'UPDATE', 'DELETE')
        AND policyname <> 'Published case studies are public'
    );
    EXECUTE format($f$CREATE POLICY "Read personal or workspace rows" ON public.%1$I FOR SELECT TO authenticated
      USING ((%2$I = auth.uid() AND company_id IS NULL) OR company_id = public.current_company_id())$f$, r.tbl, r.owner_col);
    EXECUTE format($f$CREATE POLICY "Update personal or workspace rows" ON public.%1$I FOR UPDATE TO authenticated
      USING ((%2$I = auth.uid() AND company_id IS NULL) OR (company_id = public.current_company_id() AND public.can_edit()))
      WITH CHECK ((%2$I = auth.uid() AND company_id IS NULL) OR (company_id = public.current_company_id() AND public.can_edit()))$f$, r.tbl, r.owner_col);
    EXECUTE format($f$CREATE POLICY "Delete personal or workspace rows" ON public.%1$I FOR DELETE TO authenticated
      USING ((%2$I = auth.uid() AND company_id IS NULL) OR (company_id = public.current_company_id() AND public.can_edit()))$f$, r.tbl, r.owner_col);
  END LOOP;
END $$;

-- ---------- 8. Deal bookkeeping fix ---------------------------------------------------
-- won_at was never cleared when a deal left "won", so it kept counting as closed revenue timing.
CREATE OR REPLACE FUNCTION public.deal_track_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    NEW.stage_changed_at := now();
    NEW.last_activity_at := now();
    IF NEW.stage::text = 'won' THEN
      IF NEW.won_at IS NULL THEN NEW.won_at := now(); END IF;
    ELSE
      NEW.won_at := NULL;
    END IF;
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
