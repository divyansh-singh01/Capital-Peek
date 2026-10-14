import {
  BarChart3,
  BadgeIndianRupee,
  FileDown,
  FileText,
  KanbanSquare,
  Layers,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";

const FEATURES = [
  {
    icon: BarChart3,
    title: "Understand your sales ROI",
    body: "Enter your sales and marketing costs, leads, deal size and expected improvement. See how the numbers could affect yearly revenue, estimated return and payback — without building a spreadsheet.",
    span: "lg:col-span-2 lg:row-span-2",
    featured: true,
  },
  {
    icon: KanbanSquare,
    title: "Track deals in one place",
    body: "Follow each opportunity from first contact to a closed deal. Keep deal stages organised and understand how changes affect your sales forecast.",
    span: "lg:col-span-2",
  },
  {
    icon: Stethoscope,
    title: "Know which deals need attention",
    body: "Clear, rule-based indicators help you spot deals that may be stuck and suggest a practical next step. You can see why a deal is flagged.",
    span: "",
  },
  {
    icon: FileText,
    title: "Estimate contract savings",
    body: "Compare the time and costs involved in your current contract process with your planned approach. Save the assumptions so your team can review them.",
    span: "",
  },
  {
    icon: FileDown,
    title: "Download a shareable report",
    body: "Export your calculator results and assumptions to a PDF you can save or share with colleagues. The report is generated in your browser.",
    span: "",
  },
  {
    icon: Layers,
    title: "Save and compare plans",
    body: "Keep different business plans in your dashboard and compare your estimates with the revenue you eventually close.",
    span: "",
  },
  {
    icon: ShieldCheck,
    title: "Work together with clear access",
    body: "Invite teammates and choose who can manage the workspace, update information or simply view it.",
    span: "lg:col-span-2",
  },
  {
    icon: BadgeIndianRupee,
    title: "UPI payments with review",
    body: "Customers can pay using UPI and submit their transaction reference. Your team can review and record the payment status.",
    span: "lg:col-span-2",
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">
            <Sparkles className="size-3.5 text-primary" />
            Built for revenue teams
          </Badge>
          <h2 className="type-section-title text-balance">
            The tools to understand your business numbers
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Estimate returns, track opportunities, compare plans and share the results with your team.
          </p>
        </Reveal>

        <div className="mt-12 grid auto-rows-[minmax(150px,auto)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Reveal
                key={feature.title}
                delay={i * 70}
                className={`${feature.span} min-w-0`}
              >
                <div
                  className={`glass-panel glass-hover flex h-full flex-col gap-3 rounded-3xl p-6 ${
                    feature.featured ? "surface-gradient" : ""
                  }`}
                >
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                    <Icon className="size-5" />
                  </span>
                  <h3
                    className={`font-semibold ${feature.featured ? "text-xl tracking-tight" : "text-sm"}`}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={`text-muted-foreground ${feature.featured ? "text-base" : "text-sm"}`}
                  >
                    {feature.body}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
