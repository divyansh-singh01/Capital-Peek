import { lazy, Suspense, useState } from "react";
import { FileText, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RoiCalculator } from "@/components/landing/roi-calculator";

const ContractRoiCalculator = lazy(() =>
  import("@/components/contract-roi/contract-roi-calculator").then((m) => ({
    default: m.ContractRoiCalculator,
  })),
);

type Mode = "sales" | "contract";

const MODES = [
  { key: "sales", label: "Sales returns", icon: TrendingUp },
  { key: "contract", label: "Contract savings", icon: FileText },
] as const;

export function CalculatorSwitcher() {
  const [mode, setMode] = useState<Mode>("sales");

  return (
    <div id="calculator" className="scroll-mt-20 pt-16 sm:pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="type-section-title">
            Explore two ways to plan with confidence
          </h2>
          <p className="mt-3 text-muted-foreground">
            Choose Sales ROI to explore how sales performance may affect revenue, or Contract ROI to estimate the time and cost impact of contract handling. No login is needed to try the calculators.
          </p>
          <div
            role="tablist"
            aria-label="Choose calculator"
            className="mt-6 inline-flex rounded-xl border border-border bg-card/70 p-1 shadow-soft backdrop-blur"
          >
            {MODES.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                className={`press inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  mode === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {mode === "sales" ? (
        <RoiCalculator />
      ) : (
        <section className="pb-16 pt-10 sm:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<Skeleton className="h-[480px] w-full rounded-3xl" />}>
              <ContractRoiCalculator publicMode />
            </Suspense>
          </div>
        </section>
      )}
    </div>
  );
}
