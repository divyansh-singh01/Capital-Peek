import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CASE_STUDIES } from "@/lib/roi";

export function CaseStudies() {
  return (
    <section id="case-studies" className="scroll-mt-20 border-t border-border/70 py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="type-section-title">
            See how a business plan can change
          </h2>
          <p className="mt-3 text-muted-foreground">
            Explore fictional examples of how changes to sales processes could affect business results. These examples are for learning only and are not actual customer results or a promise of performance.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CASE_STUDIES.map((study) => (
            <Card key={study.id} className="gap-4 rounded-2xl border-border/70 p-6 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold">{study.company}</h3>
                  <p className="text-xs text-muted-foreground">{study.industry}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Illustration · {study.roi} ROI
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{study.summary}</p>
              <dl className="grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
                {[
                  { label: "Yearly recurring revenue", before: study.beforeArr, after: study.afterArr },
                  { label: "Win rate", before: study.beforeWinRate, after: study.afterWinRate },
                  { label: "Sales time", before: study.beforeCycle, after: study.afterCycle },
                ].map((row) => (
                  <div key={row.label}>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="mt-1 flex items-center justify-center gap-1 text-xs">
                      <span className="text-muted-foreground line-through">{row.before}</span>
                      <ArrowRight className="size-3 text-primary" />
                      <span className="font-semibold">{row.after}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
