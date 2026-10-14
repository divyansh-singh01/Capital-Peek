# Audit fixes — do these after deploying
1. Run `supabase/migrations/20261013090000_security_hardening.sql` in the Supabase SQL editor (upgrades existing data; legacy workspace members become editors).
2. Supabase → Authentication → URL Configuration → Redirect URLs: add `https://<your-domain>/auth` and `http://localhost:8080/auth` (magic link, email confirmation and Google now return to /auth).
3. Authentication → Policies: minimum password length 8+, enable leaked-password protection (the client enforces 8; the server setting is the real gate).
4. Enable the Google provider if you want "Continue with Google" to work.
5. The migration upserts the private `payment-proofs` bucket (5 MB, images only).
6. Legacy workspaces have no owner: `update profiles set company_role='owner' where email='you@example.com';`
