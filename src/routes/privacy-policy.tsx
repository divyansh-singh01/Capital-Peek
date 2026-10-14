import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, Database, FileText, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { SiteHeader } from "@/components/landing/site-header";
import { SiteFooter } from "@/components/landing/site-footer";

const TITLE = "Privacy Policy — Capital Peek";
const DESCRIPTION =
  "Learn what information Capital Peek collects, how it uses Google sign-in data, how business and ROI information is handled, and how to make a privacy request.";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPolicyPage,
});

const toc = [
  ["information-we-collect", "Information we collect"],
  ["google-sign-in", "Google sign-in and Google data"],
  ["how-we-use", "How we use information"],
  ["sharing", "When information is shared"],
  ["storage-security", "Storage and security"],
  ["retention-deletion", "Retention and deletion"],
  ["your-choices", "Your choices and rights"],
  ["browser-storage", "Browser storage and logs"],
  ["changes", "Changes to this policy"],
  ["contact", "Contact and privacy requests"],
] as const;

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border/60 py-7 last:border-b-0">
      <h2 className="type-heading-md text-foreground">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to Capital Peek
          </Link>

          <header className="mt-8 rounded-3xl border border-border/70 bg-card/70 p-6 shadow-soft sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Privacy and transparency
            </div>
            <h1 className="type-display-lg mt-5">Privacy Policy</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">
              This policy explains how Capital Peek handles information when you visit the website,
              use its sales and contract ROI calculators, create an account, manage a workspace,
              submit an enquiry, or send payment confirmation details.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span>Last updated: 14 October 2026</span>
              <span>Applies to: capital-peek.vercel.app and the Capital Peek application</span>
            </div>
          </header>

          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
            <article className="min-w-0 rounded-3xl border border-border/70 bg-card/50 px-5 py-2 sm:px-8">
              <Section id="about" title="About Capital Peek">
                <p>
                  Capital Peek is a business-planning application that helps users estimate sales
                  and contract return on investment (ROI), explore revenue scenarios, export reports,
                  and manage sales information such as leads, deals, contracts, activities, and team
                  workspaces. In this policy, “Capital Peek,” “we,” and “us” refer to the service
                  operating under the Capital Peek name.
                </p>
                <p>
                  Please enter only information you are authorised to provide. Business forecasts
                  and ROI calculations are estimates; avoid placing passwords, payment-card details,
                  government identity numbers, or other unnecessary sensitive information in notes,
                  contact fields, or uploaded screenshots.
                </p>
              </Section>

              <Section id="information-we-collect" title="1. Information we collect">
                <p>
                  The information handled depends on the features you choose to use. It may include:
                </p>
                <ul className="list-disc space-y-2 pl-5 marker:text-primary">
                  <li>
                    <strong className="text-foreground">Account and profile information:</strong>{" "}
                    email address, account identifier, authentication provider, full name, profile
                    image or avatar when available, job title, and account/workspace role. Password
                    authentication is managed by Supabase Authentication; Capital Peek’s application
                    tables do not store your plaintext password.
                  </li>
                  <li>
                    <strong className="text-foreground">Company and workspace information:</strong>{" "}
                    company name, website, industry, team size, workspace membership and roles, and
                    information you enter about team members.
                  </li>
                  <li>
                    <strong className="text-foreground">Sales and business records:</strong>{" "}
                    leads, customer or account names, contact names, deal values and stages, owners,
                    expected close dates, activity titles or notes, contract names and values, contract
                    dates and status, and case-study summaries or metrics you choose to save.
                  </li>
                  <li>
                    <strong className="text-foreground">ROI and planning data:</strong>{" "}
                    calculator assumptions, inputs, calculated outputs, saved scenario names and notes,
                    contract-analysis figures, and revenue or profit estimates. Entering numbers in
                    the public calculator alone does not submit them to our database. They are sent
                    when you choose a feature that saves or submits them, such as saving a scenario
                    or submitting the optional follow-up form.
                  </li>
                  <li>
                    <strong className="text-foreground">Enquiries and follow-up requests:</strong>{" "}
                    the name, email address, optional company and message you submit through a sales
                    enquiry or ROI follow-up form. ROI figures associated with a follow-up submission
                    may also be stored with that enquiry.
                  </li>
                  <li>
                    <strong className="text-foreground">Payment confirmation details:</strong>{" "}
                    name or business name, email address or phone number, amount, currency, plan,
                    optional transaction reference/UTR, and an optional image of payment evidence.
                    The current form accepts image uploads up to 5 MB. Do not include unrelated
                    financial or personal details in an uploaded image.
                  </li>
                  <li>
                    <strong className="text-foreground">Technical and operational information:</strong>{" "}
                    service providers may process network, device/browser, request and diagnostic
                    information to deliver, secure, and maintain the website and authentication
                    service. The exact logs available depend on the provider and its settings.
                  </li>
                </ul>
              </Section>

              <Section id="google-sign-in" title="2. Google sign-in and Google user data">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-foreground">
                  <p className="text-sm font-semibold">What Google sign-in is used for</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    If you choose “Continue with Google,” Capital Peek uses Google OAuth through
                    Supabase Authentication to verify your identity and help create or access your
                    Capital Peek account. Depending on the information Google returns, this may
                    include your Google account identifier, email address, name, and profile image.
                  </p>
                </div>
                <p>
                  The current sign-in implementation requests Google sign-in and does not ask for
                  Gmail, Google Drive, Calendar, or Contacts access. We do not read those services
                  through this sign-in feature. Google account information is used to authenticate
                  you, associate your sign-in with your Capital Peek account, and support account
                  functions such as displaying your profile.
                </p>
                <p>
                  We do not sell Google user data or use it for advertising. We do not use Google
                  sign-in data for purposes unrelated to providing Capital Peek’s account and
                  user-facing features. Access to authentication data is handled through Supabase
                  and the configured Google sign-in flow. Google’s own processing of your account
                  information is also governed by Google’s policies.
                </p>
                <p>
                  Capital Peek’s use and transfer of information received from Google APIs will
                  adhere to the Google API Services User Data Policy, including its Limited Use
                  requirements. If the application’s Google permissions or data use changes, this
                  policy must be updated before that new use begins.
                </p>
              </Section>

              <Section id="how-we-use" title="3. How we use information">
                <p>We use information for the following service-related purposes:</p>
                <ul className="list-disc space-y-2 pl-5 marker:text-primary">
                  <li>Provide sign-in, account sessions, profiles, workspaces and membership roles.</li>
                  <li>Calculate ROI and revenue estimates, create reports, and save scenarios you request.</li>
                  <li>Manage business records such as leads, deals, contracts, activities and team information.</li>
                  <li>Respond to sales enquiries, ROI follow-up requests and payment-confirmation submissions.</li>
                  <li>Review submitted payment details and any optional payment evidence.</li>
                  <li>Maintain application functionality, troubleshoot errors, protect the service from abuse, and comply with applicable legal obligations.</li>
                </ul>
                <p>
                  You can use the public ROI calculator without creating an account. Choosing to
                  submit a form or save information changes what is transmitted to and stored by
                  the service, as described above.
                </p>
              </Section>

              <Section id="sharing" title="4. When information is shared">
                <p>
                  We do not sell personal information. Information may be processed by the service
                  providers needed to operate Capital Peek or disclosed in limited circumstances:
                </p>
                <ul className="list-disc space-y-2 pl-5 marker:text-primary">
                  <li>
                    <strong className="text-foreground">Supabase:</strong> authentication, application
                    database, and storage for records and optional payment-proof images.
                  </li>
                  <li>
                    <strong className="text-foreground">Vercel:</strong> application hosting and deployment;
                    its platform may process technical information and operational logs.
                  </li>
                  <li>
                    <strong className="text-foreground">Google:</strong> identity verification when you
                    choose Google sign-in.
                  </li>
                  <li>
                    <strong className="text-foreground">Payment services you choose:</strong> if you pay
                    through a UPI application or financial institution, that transaction is processed
                    by the provider you use under its own terms and privacy policy. Capital Peek
                    receives the payment-confirmation information you submit through its form.
                  </li>
                  <li>
                    <strong className="text-foreground">Legal and safety reasons:</strong> information may
                    be disclosed when reasonably necessary to comply with law, respond to lawful
                    requests, protect users or the service, or investigate fraud or abuse.
                  </li>
                </ul>
                <p>
                  These providers process information according to their own service terms and
                  privacy documentation. Their handling of information outside Capital Peek is not
                  controlled by this policy.
                </p>
              </Section>

              <Section id="storage-security" title="5. Storage and security">
                <p>
                  Account profiles, saved business records, ROI scenarios, leads, payment submissions
                  and related files are handled using the Supabase services configured for Capital
                  Peek. The database migrations include row-level security policies intended to limit
                  access to account and workspace records and to restrict lead/payment review to
                  authorised staff roles. Access depends on the deployed database configuration and
                  permissions being correctly maintained.
                </p>
                <p>
                  We use the access controls available in the application and its service providers,
                  but no website, transmission method or storage system can be guaranteed completely
                  secure. Keep your login details private and avoid uploading unnecessary sensitive
                  information. If you believe that an account or submission has been accessed without
                  permission, contact us using the privacy-request method below.
                </p>
              </Section>

              <Section id="retention-deletion" title="6. Retention and deletion">
                <p>
                  Information is retained for as long as reasonably needed to provide the service,
                  maintain account and workspace records, respond to enquiries, verify payments,
                  protect the service, resolve disputes, and meet applicable recordkeeping or legal
                  obligations. Retention may differ by record type; we do not publish a fixed deletion
                  period for every category of information.
                </p>
                <p>
                  You can remove certain saved records through the features provided in the app, where
                  available. The current interface does not provide a self-service account-deletion
                  control. To request deletion of your account or personal information, use the
                  “Talk to sales” form linked from the homepage and begin your message with
                  “Privacy request — deletion.” We will review the request and may need to retain
                  limited records where required to verify payments, protect the service, resolve a
                  dispute, or comply with law.
                </p>
              </Section>

              <Section id="your-choices" title="7. Your choices and rights">
                <ul className="list-disc space-y-2 pl-5 marker:text-primary">
                  <li>You may use the public calculator without signing in.</li>
                  <li>You may choose not to use Google sign-in and instead use another sign-in method offered by Capital Peek.</li>
                  <li>You can update your name and job title through profile settings, where the relevant controls are available.</li>
                  <li>You can choose whether to submit a follow-up enquiry or optional payment evidence.</li>
                  <li>You may request access to, correction of, or deletion of personal information by using the privacy-request method above.</li>
                </ul>
                <p>
                  The options available to you may depend on your location and applicable law. To
                  help us locate the relevant records, identify the account email and describe your
                  request. Do not send passwords, secret keys, or payment credentials in a request.
                </p>
              </Section>

              <Section id="browser-storage" title="8. Browser storage, cookies and analytics">
                <p>
                  Capital Peek stores your selected theme preference in your browser’s local storage.
                  If you start saving a calculator scenario and need to sign in first, the scenario
                  may be kept temporarily in session storage so it can be carried into the save flow.
                  Supabase Authentication also manages browser session state needed to keep you signed in.
                </p>
                <p>
                  The reviewed application source does not include a dedicated advertising or
                  cross-site tracking SDK. Hosting, authentication and security providers may still
                  process technical logs or use necessary technologies to deliver their services;
                  their own documentation describes those practices.
                </p>
              </Section>

              <Section id="changes" title="9. Changes to this policy">
                <p>
                  We may update this policy when the service, its data handling, or applicable
                  requirements change. The “Last updated” date at the top will be revised when a new
                  version is published. If a change materially affects how Google user data is used,
                  we will update the relevant disclosures and request any consent required before
                  beginning the new use.
                </p>
              </Section>

              <Section id="contact" title="10. Contact and privacy requests">
                <p>
                  For a privacy question, access/correction request, or deletion request, open the
                  Capital Peek homepage, go to the Pricing section, and select “Talk to sales.” Start
                  the message with “Privacy request” so it can be identified for review. The form asks
                  for your name and email, with company and message details optional.
                </p>
                <Link
                  to="/"
                  hash="pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 font-semibold text-primary transition-colors hover:bg-primary/15"
                >
                  Open Capital Peek contact options
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </Section>
            </article>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <div className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-soft">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-4 text-primary" aria-hidden="true" />
                  On this page
                </div>
                <nav aria-label="Privacy policy sections" className="mt-3 space-y-1">
                  {toc.map(([id, label]) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      className="block rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {label}
                    </a>
                  ))}
                </nav>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card/50 p-5">
                <Database className="size-5 text-primary" aria-hidden="true" />
                <h2 className="mt-3 text-sm font-semibold">Business data stays purposeful</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use Capital Peek to estimate and organise business information. Only submit the
                  customer, financial, and payment details needed for the feature you are using.
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card/50 p-5">
                <UserRound className="size-5 text-primary" aria-hidden="true" />
                <h2 className="mt-3 text-sm font-semibold">Need help with your data?</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use “Talk to sales” on the homepage and start your message with “Privacy request.”
                </p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-card/50 p-5">
                <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
                <h2 className="mt-3 text-sm font-semibold">Google sign-in</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The current Google sign-in flow is for authentication; it does not request access
                  to Gmail, Drive, Calendar, or Contacts.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
