# CapitalPeek — setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in your backend values.
3. Apply the SQL files in `supabase/migrations/` in order to your database.
4. Start the app: `npm run dev` → http://localhost:8080

Key places:
- Financial maths: `src/lib/roi.ts`
- Audit PDF: `src/lib/audit-pdf.ts`
- UPI payment details (QR + UPI ID): `src/lib/payment-config.ts`
