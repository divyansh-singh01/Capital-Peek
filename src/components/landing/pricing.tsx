import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, QrCode, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/reveal";
import { ScanAndPayDialog } from "@/components/payment/scan-and-pay";
import { ContactSalesDialog } from "@/components/landing/contact-sales";

const PLANS = [
  {
    name: "Starter",
    price: "₹0",
    cadence: "forever",
    blurb: "For individuals exploring a business idea or sales plan.",
    features: [
      "Sales & Contract ROI calculators",
      "PDF audit export",
      "Save scenarios to your dashboard",
      "Personal pipeline & deals",
    ],
    cta: "Start free",
    featured: false,
    action: "signup" as const,
    payAmount: 0,
  },
  {
    name: "Growth",
    price: "₹999",
    cadence: "per month (~$12)",
    blurb: "For teams that want to manage opportunities and share their plans.",
    features: [
      "Everything in Starter",
      "Shared team workspace",
      "Owner, editor and viewer roles",
      "Deals, contracts and activity timeline",
    ],
    cta: "Pay ₹999 & get started",
    featured: true,
    action: "pay" as const,
    payAmount: 999,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "annual",
    blurb: "For organisations with broader reporting, rollout or integration needs.",
    features: [
      "Rollout planning for larger teams",
      "Custom reporting needs",
      "Integration requests (roadmap)",
      "Direct line to the team",
    ],
    cta: "Talk to sales",
    featured: false,
    action: "contact" as const,
    payAmount: 0,
  },
];

export function Pricing() {
  const [payPlan, setPayPlan] = useState<{ plan: string; amount: number } | null>(null);
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">
            <Sparkles className="size-3.5 text-primary" />
            Simple pricing
          </Badge>
          <h2 className="type-section-title text-balance">
            Choose a plan that fits your team
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start with the free tools, upgrade when you need team features, or contact us to discuss a larger rollout.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 90} className="min-w-0">
              <div
                className={`glass-panel glass-hover flex h-full flex-col gap-5 rounded-3xl p-7 ${
                  plan.featured ? "surface-gradient ring-1 ring-primary/30 lg:-translate-y-2" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">{plan.name}</h3>
                  {plan.featured ? <Badge>Most popular</Badge> : null}
                </div>
                <div>
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  <span className="ml-1 text-sm text-muted-foreground">{plan.cadence}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.blurb}</p>
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.action === "pay" ? (
                  <Button
                    className="press mt-auto w-full"
                    onClick={() => setPayPlan({ plan: plan.name, amount: plan.payAmount })}
                  >
                    <QrCode className="size-4" />
                    {plan.cta}
                  </Button>
                ) : plan.action === "contact" ? (
                  <Button
                    variant="outline"
                    className="press mt-auto w-full"
                    onClick={() => setContactOpen(true)}
                  >
                    {plan.cta}
                  </Button>
                ) : (
                  <Button asChild className="press mt-auto w-full" variant="outline">
                    <Link to="/auth">{plan.cta}</Link>
                  </Button>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      <ContactSalesDialog open={contactOpen} onOpenChange={setContactOpen} />
      <ScanAndPayDialog
        open={payPlan !== null}
        onOpenChange={(v) => !v && setPayPlan(null)}
        plan={payPlan?.plan}
        amount={payPlan?.amount}
      />
    </section>
  );
}
