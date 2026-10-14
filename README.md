# Capital Peek

ROI modelling, financial feasibility audits (downloadable PDF), pipeline tracking and
payment tools for B2B revenue teams. Built with TanStack Start, React, Tailwind CSS and Supabase.

## Getting started

```sh
npm install
cp .env.example .env   # then fill in your Supabase values
npm run dev            # http://localhost:8080
```

Apply the SQL files in `supabase/migrations/` (in filename order) to your Supabase project.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint the project |

## Environment variables

See `.env.example`. Never commit `.env`; it is git-ignored.

## Before you deploy

- Add your UPI QR image as `public/upi-qr.png` (the Scan & Pay dialog loads `/upi-qr.png`).
- Set the Supabase environment variables in your hosting provider.
- In Supabase, add your production URL under Authentication → URL Configuration.

## Key places

- Financial maths: `src/lib/roi.ts`
- Audit PDF: `src/lib/audit-pdf.ts`
- UPI payment details: `src/lib/payment-config.ts`
