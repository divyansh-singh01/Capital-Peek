# Capital Peek

**Model sales ROI. Understand contract efficiency. Track revenue performance.**

Capital Peek is a web application for B2B revenue teams to estimate sales-funnel ROI, explore contract-handling efficiency, manage deals and contracts, save planning scenarios, and generate PDF reports.

**Live app:** [capital-peek.vercel.app](https://capital-peek.vercel.app)  
**Privacy policy:** [capital-peek.vercel.app/privacy-policy](https://capital-peek.vercel.app/privacy-policy)  
**Repository:** [divyansh-singh01/Capital-Peek](https://github.com/divyansh-singh01/Capital-Peek)

> **Important:** ROI, payback, contract-efficiency, and revenue figures are model estimates based on the inputs and assumptions supplied by the user. They are not guarantees, accounting advice, investment advice, or a substitute for professional financial review.

---

## Features

### Sales and ROI planning
- Interactive sales ROI calculator for modelling lead volume, conversion rates, win rates, deal size, sales spend, team costs, and improvement assumptions.
- Revenue, ROI, payback, customer-acquisition-cost, and efficiency estimates.
- Profitability modelling that considers gross margin, variable sales costs, and incremental annual costs.
- Saved scenarios for comparing planning assumptions.

### Contract ROI and efficiency
- Contract-handling efficiency estimates based on annual contract volume, average handling time, employee bands, salary assumptions, renewal coverage, and closure delays.
- Contract ROI calculations and related efficiency indicators.
- Explicitly modelled assumptions that can be reviewed before relying on an estimate.

### Pipeline and revenue operations
- Deal and pipeline views, including stages, expected revenue, close dates, and deal activity information.
- Contract records and contract-related workflows.
- Workspace, profile, and team-member views.
- Lead enquiry and ROI follow-up forms.

### Reporting and payment workflows
- PDF audit/report generation for sharing or reviewing modelled results.
- UPI Scan & Pay information and payment-confirmation submission workflow. The app's payment workflow should not be assumed to process or settle a payment itself.

### Product experience
- Public landing page with an interactive calculator, feature overview, how-it-works content, case-study examples, and pricing information.
- Responsive UI and a warm gold visual identity.
- Dark and light theme support.
- Email/password authentication, email confirmation and password-reset flows, plus Google sign-in when OAuth is configured.
- Public privacy policy at `/privacy-policy`.

Feature availability that requires a signed-in account or configured backend depends on the deployment's Supabase setup and permissions.

---

## Technology stack

- **Application framework:** TanStack Start and TanStack Router
- **UI:** React 19, TypeScript, Tailwind CSS 4
- **Build tooling:** Vite 8 and Nitro
- **Server state and data fetching:** TanStack Query
- **Backend services:** Supabase Auth, Postgres database, and Supabase Storage where configured
- **Forms and validation:** React Hook Form and Zod
- **Charts and visualization:** Recharts and Three.js / React Three Fiber
- **PDF generation:** `pdf-lib` with Fontkit support
- **UI primitives:** Radix UI and Lucide icons
- **Hosting:** Vercel (production deployment)

---

## Getting started locally

### Prerequisites

Install a current supported version of **Node.js (LTS)** and npm. You'll also need access to a Supabase project for authenticated and database-backed features.

### 1. Clone the repository

```bash
git clone https://github.com/divyansh-singh01/Capital-Peek.git
cd Capital-Peek
```

### 2. Install dependencies

```bash
npm ci
```

If `npm ci` cannot be used because the lockfile has changed, review the changes first; use `npm install` only when appropriate.

### 3. Create your local environment file

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS / Linux:**

```bash
cp .env.example .env
```

Open `.env` and fill in the values described below. Do not commit this file.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080). The Vite server is configured to use port `8080`.

---

## Environment variables

The project reads its Supabase URL and publishable key in the browser and also supports server-side fallbacks. Set all six variables so local development and hosting use the intended project consistently.

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Your Supabase project URL, e.g. `https://YOUR_PROJECT_REF.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase **publishable** key (`sb_publishable_…`) |
| `VITE_SUPABASE_PROJECT_ID` | Your Supabase project reference / ID |
| `SUPABASE_URL` | The same Supabase project URL, for server-side fallback |
| `SUPABASE_PUBLISHABLE_KEY` | The same publishable key, for server-side fallback |
| `SUPABASE_PROJECT_ID` | The same Supabase project reference / ID |

The `.env.example` file contains placeholders; replace them only in your local `.env` and your hosting provider's environment-variable settings.

### Key safety rules

- Never commit `.env` or paste its contents into an issue, chat, or screenshot.
- Use a **publishable** Supabase key for the variables above.
- Never place a Supabase secret key, `service_role` key, database password, or Google OAuth client secret in a `VITE_` variable or browser code.
- Keep the `.env` ignore rules in `.gitignore` intact.

---

## Supabase setup

Capital Peek uses Supabase for authentication and its database-backed features. To use the app with a new Supabase project:

1. Create or select the intended Supabase project.
2. Copy its Project URL, publishable key, and project reference into your local `.env`.
3. Review `supabase/migrations/` and apply the SQL migration files to the **intended database**, in filename order, using your chosen migration workflow.
4. Confirm the resulting tables, functions, row-level security (RLS) policies, and Storage configuration match the application's requirements.
5. Test sign-up, sign-in, role/permission behaviour, data access, and upload workflows using test accounts before inviting real users.

**Do not blindly run migrations against an existing production database.** Review each migration first, keep a backup when appropriate, and verify the target project before executing SQL. Some migrations modify policies or functions.

If using the Supabase CLI, verify that `supabase/config.toml` and the CLI's linked project reference point to the Supabase project you actually intend to manage. A stale project reference can direct database commands to the wrong backend.

### Google sign-in (optional)

Google sign-in requires configuration in both Supabase and Google Cloud:

1. Create a Google OAuth **Web application** client in Google Cloud.
2. Add your local origin (`http://localhost:8080`) and the production site's origin under Authorized JavaScript origins.
3. Add the Supabase OAuth callback shown in the Supabase Google provider settings under Authorized redirect URIs. It typically looks like `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.
4. Enter the Google Client ID and Client Secret in **Supabase → Authentication → Sign In / Providers → Google**, enable the provider, and save.
5. In **Supabase → Authentication → URL Configuration**, set the production Site URL and allow the exact local and production post-login redirect paths used by the app.
6. Test the complete round trip locally and on the deployed site.

For an OAuth app in Google's Testing status, only added test users can authorize it, and Google may show an unverified/testing notice. Public OAuth branding verification has separate domain-ownership and privacy-policy requirements; Search Console URL-prefix verification does not guarantee that a shared hosting subdomain will be accepted for OAuth branding.

---

## Production deployment on Vercel

This repository is configured for a TanStack Start + Nitro application. Vercel should build the server-side application when the repository and framework configuration are imported correctly.

1. Import the GitHub repository into Vercel.
2. Verify the project root is the directory containing `package.json`.
3. Use the detected TanStack Start framework settings and the normal `npm run build` command. Do not force the output directory to `dist` unless the framework's current deployment instructions require it.
4. Add the six Supabase environment variables in **Vercel → Project Settings → Environment Variables** for the environments you use (Production, Preview, and Development as needed).
5. Deploy, then confirm the deployment status is **Ready**.
6. Test the live homepage, `/privacy-policy`, authentication, dashboard, ROI calculations, PDF generation, and data permissions.
7. After changing environment variables, redeploy so the new values are applied.
8. Add the production URL to Supabase Authentication → URL Configuration and to the Google OAuth client's Authorized JavaScript origins.

Production URL: [https://capital-peek.vercel.app](https://capital-peek.vercel.app)

If a deployment fails, inspect the Vercel build logs and fix the first underlying error rather than repeatedly changing unrelated build settings.

---

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint checks |
| `npm run format` | Format project files with Prettier |

Run the production build before committing or deploying significant changes:

```bash
npm run build
```

The repository's `lint` and `format` scripts may report formatting issues in existing files. Review the output before applying broad automated formatting because format changes can touch many files.

---

## Project structure

```text
Capital-Peek/
├── public/                 # Static files, favicon, payment QR and verification assets
├── src/
│   ├── components/         # Landing page, dashboard UI, calculator and shared components
│   ├── integrations/supabase/ # Supabase browser/server clients and generated database types
│   ├── lib/                # ROI calculations, contract ROI, reports and utilities
│   ├── routes/             # File-based routes
│   │   ├── index.tsx       # Public landing page
│   │   ├── auth.tsx        # Sign-in and sign-up
│   │   ├── reset-password.tsx
│   │   ├── privacy-policy.tsx
│   │   └── _authenticated/dashboard/ # Authenticated dashboard routes
│   ├── routeTree.gen.ts    # Auto-generated by TanStack Router; avoid manual edits
│   ├── router.tsx
│   ├── server.ts
│   └── styles.css
├── supabase/
│   ├── migrations/         # SQL schema and policy migrations
│   └── config.toml
├── .env.example            # Environment variable template (no live secrets)
├── .gitignore
├── package.json
└── vite.config.ts
```

### Key implementation files

- `src/lib/roi.ts` — sales ROI, profitability and currency calculations
- `src/lib/contract-roi.ts` — contract-efficiency and contract ROI modelling
- `src/lib/audit-pdf.ts` — PDF/report generation
- `src/lib/payment-config.ts` — payment display/configuration values
- `src/components/GoldenTunnelBackground.tsx` — animated landing/dashboard background
- `src/components/theme-toggle.tsx` — theme toggle UI
- `supabase/migrations/` — database schema and access-policy changes

TanStack Router generates `src/routeTree.gen.ts`. Let the framework regenerate it when routes are added or removed; do not edit the generated file manually unless the framework explicitly requires it.

---

## Privacy and data handling

The public privacy policy is available at [capital-peek.vercel.app/privacy-policy](https://capital-peek.vercel.app/privacy-policy). Review it against your actual operating practices, including your support contact, retention and deletion procedures, before using the app with real customer data or submitting OAuth verification.

For local tests, prefer sample data. Before sharing the app beyond a small trusted test group, verify that Supabase row-level security and storage policies prevent users from reading or modifying data belonging to other users or workspaces.

## Contributing

Contributions and issue reports are welcome. For changes:

1. Create a focused branch.
2. Keep unrelated formatting changes out of the pull request.
3. Avoid committing credentials, customer data, build outputs, or generated caches.
4. Run `npm run build` and test affected flows before opening a pull request.
5. Include steps to reproduce bugs and screenshots where useful, without exposing private data.

## License

No license has been specified in this repository yet. Unless a license is added, do not assume the code is available for unrestricted reuse, modification, or redistribution.
