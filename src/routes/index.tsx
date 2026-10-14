import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { CalculatorSwitcher } from "@/components/landing/calculator-switcher";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { CaseStudies } from "@/components/landing/case-studies";
import { Pricing } from "@/components/landing/pricing";
import { SiteFooter } from "@/components/landing/site-footer";
import { lazy, Suspense } from "react";

const GoldenTunnelBackground = lazy(() => import("@/components/GoldenTunnelBackground"));

const TITLE = "CapitalPeek — Sales ROI calculator & revenue performance platform";
const DESCRIPTION =
  "Model your sales funnel, forecast extra revenue, ROI and payback, track pipeline and export board-ready reports. Free interactive calculator, no login required.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="dashboard-tunnel relative min-h-screen">
      <Suspense fallback={null}><GoldenTunnelBackground /></Suspense>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-background/40" />
      <div className="relative z-10">
        <SiteHeader />
        <main className="pb-24 lg:pb-0">
          <Hero />
          <CalculatorSwitcher />
          <Features />
          <HowItWorks />
          <CaseStudies />
          <Pricing />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

