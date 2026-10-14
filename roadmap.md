- [x] Add client-entered unit economics and P&L view to the calculator.
- [x] Add downloadable one-page Financial Feasibility Audit PDF and verify the calculator/report flow.
- [x] Set real UPI ID and open Scan & Pay from the pricing plans.
- [x] Private dashboard (overview, saved calculations, pipeline, payments, settings).
- [x] Premium visual overhaul: mesh/ambient backgrounds, glassmorphism cards, bento feature grid, scroll-reveal and stagger animations, polished badges/states.
- [x] Export the full app source as a downloadable zip file.
- [ ] Publish the app and optionally connect a custom domain.

## Audit follow-ups (Oct 2026)
- [x] DB hardening migration `20261013090000_security_hardening.sql` (workspace RPCs, immutable ownership, staff-only payments/leads, constraints).
- [x] Sales ROI scenarios can be saved; Contracts page; workspace/roles UI in Settings.
- [ ] Enforce plan limits / activate plans after a payment is verified (plans are informational today).
- [ ] Payments against contracts and actual-ROI tracking (Deals → Contracts → Payments → ROI).
- [ ] Transactional email (ROI breakdown, invites) via an Edge Function + Resend/SES.
- [ ] Rate-limit anonymous inserts (leads, payment submissions) with Turnstile/hCaptcha.
