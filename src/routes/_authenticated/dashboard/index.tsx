import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BadgeIndianRupee,
  KanbanSquare,
  Layers,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/animated-number";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/roi";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: Overview,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

type Deal = {
  id: string;
  value: number | null;
  stage: string;
  won_at: string | null;
  stage_changed_at: string | null;
};

function Overview() {
  const { user } = useSession();
  const { data: profile } = useProfile(user);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const [scenarios, deals, payments] = await Promise.all([
        supabase.from("roi_calculations").select("id, results"),
        supabase.from("deals").select("id, value, stage, won_at, stage_changed_at"),
        supabase.from("payment_submissions").select("id, amount, status"),
      ]);
      // A failed core query must not render as a believable "0": surface it instead.
      if (scenarios.error) throw scenarios.error;
      if (deals.error) throw deals.error;
      const dealRows = (deals.data ?? []) as Deal[];
      const open = dealRows.filter((d) => d.stage !== "won" && d.stage !== "lost");
      const won = dealRows.filter((d) => d.stage === "won");
      const lost = dealRows.filter((d) => d.stage === "lost");
      const closed = won.length + lost.length;

      // 6-month won-value trend from deal timestamps
      const months: { label: string; key: string; value: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: d.toLocaleString(undefined, { month: "short" }),
          key: `${d.getFullYear()}-${d.getMonth()}`,
          value: 0,
        });
      }
      // Bucket by the month the deal was WON (not created), so the chart shows when revenue closed.
      for (const d of won) {
        const when = d.won_at ?? d.stage_changed_at;
        if (!when) continue;
        const dt = new Date(when);
        const m = months.find((x) => x.key === `${dt.getFullYear()}-${dt.getMonth()}`);
        if (m) m.value += Number(d.value ?? 0);
      }
      const wonLast12 = won
        .filter((d) => {
          const when = d.won_at ?? d.stage_changed_at;
          return when ? Date.now() - new Date(when).getTime() <= 365 * 86_400_000 : false;
        })
        .reduce((sum, d) => sum + Number(d.value ?? 0), 0);

      const scenarioRows = scenarios.data ?? [];
      const plannedRevenue = scenarioRows.reduce(
        (sum, s) => sum + Number((s.results as Record<string, number> | null)?.["extraRevenueYear"] ?? 0),
        0,
      );

      return {
        scenarios: scenarioRows.length,
        openDeals: open.length,
        pipelineValue: open.reduce((sum, d) => sum + Number(d.value ?? 0), 0),
        wonValue: won.reduce((sum, d) => sum + Number(d.value ?? 0), 0),
        wonLast12,
        winRate: closed ? (won.length / closed) * 100 : 0,
        pendingPayments: (payments.data ?? []).filter((p) => p.status === "pending").length,
        verifiedAmount: (payments.data ?? [])
          .filter((p) => p.status === "verified")
          .reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
        trend: months,
        plannedRevenue,
      };
    },
  });

  const kpis = [
    {
      label: "Open pipeline",
      value: data?.pipelineValue ?? 0,
      money: true,
      icon: KanbanSquare,
      context: `${data?.openDeals ?? 0} active deals`,
    },
    {
      label: "Closed won",
      value: data?.wonValue ?? 0,
      money: true,
      icon: TrendingUp,
      context: "win rate · won ÷ closed deals",
      delta: data?.winRate ?? 0,
    },
    {
      label: "Saved scenarios",
      value: data?.scenarios ?? 0,
      money: false,
      icon: Layers,
      context: "Financial models stored",
    },
    {
      label: "Payments to verify",
      value: data?.pendingPayments ?? 0,
      money: false,
      icon: BadgeIndianRupee,
      context: `${formatCurrency(data?.verifiedAmount ?? 0, true)} verified`,
    },
  ];

  const name = profile?.full_name?.split(" ")[0] || profile?.email?.split("@")[0] || "there";
  const planned = data?.plannedRevenue ?? 0;
  // Plan is a 12-month uplift, so compare it with the last 12 months of closed revenue.
  const actual = data?.wonLast12 ?? 0;
  const variance = planned > 0 ? ((actual - planned) / planned) * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Management hero */}
      <header className="flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="type-display-lg mt-3">
            {greeting()}, <span className="capitalize">{name}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Here's how your company is performing and where your growth opportunities stand.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className="press group">
            <Link to="/">
              New ROI scenario
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="press">
            <Link to="/dashboard/pipeline">Open pipeline</Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="press">
            <Link to="/dashboard/contract-roi">Contract ROI</Link>
          </Button>
        </div>
      </header>

      {error ? (
        <div className="glass-panel rounded-2xl p-5 text-sm text-destructive">
          Couldn't load your overview: {(error as Error).message}
        </div>
      ) : null}

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card-soft rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <span className="text-sm text-muted-foreground">{kpi.label}</span>
              <kpi.icon className="size-4 text-muted-foreground/70" />
            </div>
            {isLoading ? (
              <Skeleton className="mt-4 h-8 w-28" />
            ) : (
              <div className="num mt-3 text-[1.75rem] font-semibold leading-none">
                <AnimatedNumber
                  value={kpi.value}
                  format={(v) =>
                    kpi.money ? formatCurrency(v, true) : String(Math.round(v))
                  }
                />
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {typeof kpi.delta === "number" && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  {Math.round(kpi.delta)}%
                </span>
              )}
              <span>{kpi.context}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue trend + plan vs actual */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-soft rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="type-heading-md">Closed revenue</h2>
              <p className="text-xs text-muted-foreground">Won deal value, last 6 months</p>
            </div>
            <span className="num text-sm font-medium">{formatCurrency(data?.wonValue ?? 0, true)}</span>
          </div>
          <div className="mt-5 h-56">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.trend ?? []} margin={{ left: 4, right: 4, top: 8 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--color-border)"
                  />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
                    tickFormatter={(v: number) => formatCurrency(v, true)}
                  />
                  <Tooltip
                    cursor={{ stroke: "var(--color-border)" }}
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                      color: "var(--color-popover-foreground)",
                    }}
                    formatter={(v: number) => [formatCurrency(v), "Closed won"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    fill="url(#revFill)"
                    animationDuration={600}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card-soft rounded-2xl p-5">
          <h2 className="type-heading-md">Plan vs actual</h2>
          <p className="text-xs text-muted-foreground">
            Modelled uplift (all saved scenarios) vs revenue won in the last 12 months
          </p>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Planned</dt>
              <dd className="num mt-1 text-xl font-semibold">{formatCurrency(planned, true)}</dd>
            </div>
            <div className="h-px bg-border" />
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Actual</dt>
              <dd className="num mt-1 text-xl font-semibold">{formatCurrency(actual, true)}</dd>
            </div>
          </dl>
          <div className="mt-5 rounded-xl bg-muted/60 p-3 text-xs">
            {planned === 0 ? (
              <span className="text-muted-foreground">
                Save an ROI scenario to compare your plan against results.
              </span>
            ) : (
              <span
                className={
                  variance >= 0 ? "font-medium text-success" : "font-medium text-destructive"
                }
              >
                {variance >= 0 ? "Ahead of plan" : "Behind plan"} by {Math.abs(Math.round(variance))}%
              </span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
