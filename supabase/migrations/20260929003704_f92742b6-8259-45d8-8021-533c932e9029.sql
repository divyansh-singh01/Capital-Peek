-- Restrict lead reads to admins and sales managers only.
DROP POLICY IF EXISTS "Signed-in users read leads" ON public.leads;

CREATE POLICY "Editors read leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.can_edit());