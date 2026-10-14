import { ArrowRight, BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";

const STATS = [
  { value: "2", label: "ROI calculators" },
  { value: "7 stages", label: "From lead to closed deal" },
  { value: "1 click", label: "Downloadable PDF report" },
];

export function Hero() {
  return (
    <section className="relative">
      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="glass-panel inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <Sparkles className="size-3.5 text-primary" />
              Clear financial planning for growing businesses
            </span>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="type-display-xl mt-6 text-balance">
              Understand your numbers. <span className="text-gold-gradient">Plan your growth.</span>
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              CapitalPeek helps you understand how your sales efforts may affect revenue, costs and returns. Enter your business numbers and get a clearer picture of what could happen next.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-pretty text-sm text-muted-foreground/80 sm:text-base">
              Compare sales and contract scenarios, explore the assumptions behind your results, and download a clear report you can share with your team.
            </p>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="press group w-full sm:w-auto">
                <a href="#calculator">
                  Try the ROI calculator
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="press w-full sm:w-auto">
                <a href="#case-studies">See example scenarios</a>
              </Button>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-success" /> No login required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BarChart3 className="size-3.5 text-primary" /> Live charts and PDF export
              </span>
            </div>
          </Reveal>
        </div>

        <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={400 + i * 80}>
              <div className="glass-panel glass-hover rounded-2xl p-5 text-center">
                <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
