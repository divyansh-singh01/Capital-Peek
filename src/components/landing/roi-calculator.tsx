import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeDollarSign,
  CalendarClock,
  Coins,
  Download,
  Gauge,
  Handshake,
  LineChart as LineChartIcon,
  Percent,
  RefreshCw,
  Scale,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  calculateProfit,
  calculateRoi,
  formatCurrency as fmtCurrency,
  type Currency,
  formatNumber,
  type ProfitInputs,
  type RoiInputs,
} from "@/lib/roi";
import { LeadCaptureForm } from "@/components/landing/lead-capture-form";
import { SaveScenario } from "@/components/landing/save-scenario";

type FieldKey = keyof RoiInputs;

const FIELDS: Array<{
  key: FieldKey;
  label: string;
  help: string;
  icon: typeof Wallet;
  prefix?: string;
  suffix?: string;
  step: number;
  min: number;
  max: number;
}> = [
  { key: "monthlySpend", label: "Monthly sales and marketing spend", help: "What you spend each month to attract leads and win customers.", icon: Wallet, prefix: "¤", step: 500, min: 0, max: 20000000 },
  { key: "leadsPerMonth", label: "New leads each month", help: "People or businesses that show interest in your product or service.", icon: Target, step: 10, min: 0, max: 5000 },
  { key: "leadToOpp", label: "Leads that become sales opportunities", help: "The percentage of leads that are qualified enough for a sales conversation.", icon: Percent, suffix: "%", step: 1, min: 1, max: 100 },
  { key: "winRate", label: "Opportunities that become customers", help: "Of the qualified opportunities, what percentage usually result in a sale?", icon: Handshake, suffix: "%", step: 1, min: 1, max: 100 },
  { key: "avgDealSize", label: "Average value of one sale", help: "The typical amount a customer pays for a deal. Use the same currency selected above.", icon: BadgeDollarSign, prefix: "¤", step: 500, min: 100, max: 50000000 },
  { key: "salesCycleDays", label: "Average time to close a sale", help: "The usual number of days from first sales conversation to a completed deal.", icon: CalendarClock, suffix: "days", step: 1, min: 1, max: 365 },
  { key: "salesReps", label: "People on your sales team", help: "How many team members actively work on sales.", icon: Users, step: 1, min: 1, max: 200 },
  { key: "costPerRep", label: "Monthly cost per salesperson", help: "Include salary and other costs you want to count for each salesperson.", icon: Coins, prefix: "¤", step: 250, min: 0, max: 5000000 },
  { key: "currentArr", label: "Current yearly recurring revenue", help: "For subscription businesses, enter the recurring revenue expected over a year. Otherwise use your current annual revenue estimate.", icon: LineChartIcon, prefix: "¤", step: 50000, min: 0, max: 10000000000 },
  { key: "improvement", label: "Expected sales improvement", help: "Your estimate of how much sales performance could improve. Try a conservative value if you are unsure.", icon: TrendingUp, suffix: "%", step: 1, min: 1, max: 200 },
];

const EMPTY = Object.fromEntries(FIELDS.map((f) => [f.key, ""])) as Record<FieldKey, string>;

const PROFIT_FIELDS: Array<{ key: keyof ProfitInputs; label: string; money?: boolean }> = [
  { key: "grossMargin", label: "Gross margin" },
  { key: "variableSalesCost", label: "Variable selling cost" },
  { key: "incrementalAnnualCost", label: "Extra yearly investment", money: true },
];
const EMPTY_PROFIT = { grossMargin: "", variableSalesCost: "", incrementalAnnualCost: "" } as Record<keyof ProfitInputs, string>;

export function RoiCalculator() {
  const [currency, setCurrency] = useState<Currency>("INR");
  const [raw, setRaw] = useState<Record<FieldKey, string>>(EMPTY);
  const [inputs, setInputs] = useState<RoiInputs | null>(null);
  const [view, setView] = useState<"sales" | "profit">("sales");
  const [profitRaw, setProfitRaw] = useState(EMPTY_PROFIT);
  const [pdfBusy, setPdfBusy] = useState(false);
  const symbol = currency === "INR" ? "₹" : "$";
  const formatCurrency = (v: number, compact = false) => fmtCurrency(v, compact, currency);
  const results = useMemo(() => (inputs ? calculateRoi(inputs) : null), [inputs]);
  const profitInputs = useMemo<ProfitInputs | null>(() => {
    const vals = PROFIT_FIELDS.map((f) => profitRaw[f.key].trim());
    if (vals.some((v) => v === "" || !Number.isFinite(Number(v)) || Number(v) < 0)) return null;
    if (Number(vals[0]) > 100 || Number(vals[1]) > 100) return null;
    return { grossMargin: Number(vals[0]), variableSalesCost: Number(vals[1]), incrementalAnnualCost: Number(vals[2]) };
  }, [profitRaw]);
  const profit = useMemo(
    () => (results && profitInputs ? calculateProfit(results.extraRevenueYear, profitInputs) : null),
    [results, profitInputs],
  );
  const filled = FIELDS.filter((f) => raw[f.key].trim() !== "").length;

  const setField = (key: FieldKey, value: string) => setRaw((prev) => ({ ...prev, [key]: value }));

  const handleCalculate = () => {
    const missing = FIELDS.filter((f) => raw[f.key].trim() === "" || !Number.isFinite(Number(raw[f.key])));
    if (missing.length) {
      toast.error(`Please fill in: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    const next = Object.fromEntries(FIELDS.map((f) => [f.key, Number(raw[f.key])])) as RoiInputs;
    setInputs(next);
    toast.success("ROI calculated");
    setTimeout(() => document.getElementById("roi-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };


  const r = results ?? calculateRoi(Object.fromEntries(FIELDS.map((f) => [f.key, 0])) as RoiInputs);
  const inp = inputs ?? (Object.fromEntries(FIELDS.map((f) => [f.key, 0])) as RoiInputs);

  const comparisonData = [
    { name: "Today", revenue: Math.round(r.baselineRevenueYear) },
    { name: "With uplift", revenue: Math.round(r.improvedRevenueYear) },
  ];

  const rampData = Array.from({ length: 12 }, (_, idx) => {
    const month = idx + 1;
    const ramp = Math.min(1, month / 6);
    return {
      month: `M${month}`,
      cumulative: Math.round((r.extraRevenueYear / 12) * month * ramp),
      invested: Math.round((r.annualInvestment / 12) * month),
    };
  });

  const headline = [
    {
      icon: TrendingUp,
      label: "Extra revenue / year",
      value: formatCurrency(r.extraRevenueYear),
      hint: `New ARR ${formatCurrency(r.newArr, true)}`,
    },
    {
      icon: Gauge,
      label: "Estimated sales ROI",
      value: `${formatNumber(r.roiPercent, 0)}%`,
      hint: `On ${formatCurrency(r.annualInvestment, true)} invested`,
    },
    {
      icon: CalendarClock,
      label: "Payback period",
      value:
        r.paybackMonths > 0 ? `${formatNumber(r.paybackMonths, 1)} mo` : "—",
      hint: `Revenue-based estimate; not profit payback`,
    },
  ];

  const secondary = [
    {
      icon: Handshake,
      label: "Extra deals closed / year",
      value: formatNumber(r.extraDealsPerYear, 1),
      hint: `${formatNumber(r.monthlyDeals, 1)} → ${formatNumber(r.improvedMonthlyDeals, 1)} per month`,
    },
    {
      icon: Gauge,
      label: "Efficiency gain per rep",
      value: `${formatNumber(r.efficiencyGain, 1)}%`,
      hint: `${formatCurrency(r.improvedRevenueYear / Math.max(inp.salesReps, 1), true)} per rep`,
    },
    {
      icon: Scale,
      label: "LTV:CAC improvement",
      value: `${formatNumber(r.ltvCac, 1)}x → ${formatNumber(r.improvedLtvCac, 1)}x`,
      hint: `CAC ${formatCurrency(r.cac, true)} → ${formatCurrency(r.improvedCac, true)}`,
    },
  ];

  return (
    <section className="pb-16 pt-2 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="type-section-title">
            See what your sales plan could return
          </h2>
          <p className="mt-3 text-muted-foreground">
            Enter your business numbers to estimate additional yearly revenue, return and payback time. Choose INR or USD and adjust the assumptions to compare possible outcomes.
          </p>
        </div>

        <Card className="mt-10 overflow-hidden rounded-3xl border-border/80 p-0 shadow-lift">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            {/* Inputs */}
            <div className="border-b border-border p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="type-heading-sm">Tell us about your sales</h3>
                  <p className="text-sm text-muted-foreground">Complete the ten fields below. Use your actual figures where possible; you can try estimates too. No login needed.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-border p-0.5">
                    {(["INR", "USD"] as Currency[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCurrency(c)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {c === "INR" ? "₹ INR" : "$ USD"}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRaw(EMPTY);
                      setInputs(null);
                      setProfitRaw(EMPTY_PROFIT);
                    }}
                  >
                    <RefreshCw className="size-4" />
                    Clear
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                {FIELDS.map((field) => {
                  const Icon = field.icon;
                  const value = raw[field.key];
                  const num = Number(value) || 0;
                  return (
                    <div key={field.key} className="space-y-2">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <Label
                            htmlFor={field.key}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <Icon className="size-4 shrink-0 text-primary" />
                            {field.label}
                          </Label>
                          <p className="max-w-md text-xs leading-relaxed text-muted-foreground/80">{field.help}</p>
                        </div>
                        <div className="relative w-full sm:w-36 shrink-0">
                          {field.prefix ? (
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                              {symbol}
                            </span>
                          ) : null}
                          <Input
                            id={field.key}
                            type="number"
                            inputMode="decimal"
                            value={value}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            placeholder="Enter"
                            onChange={(e) => setField(field.key, e.target.value)}
                            className={`text-right tabular-nums ${field.prefix ? "pl-6" : ""} ${field.suffix ? "pr-11" : ""}`}
                          />
                          {field.suffix ? (
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {field.suffix}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <Slider
                        value={[Math.min(Math.max(num, field.min), field.max)]}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        onValueChange={([v]) => setField(field.key, String(v ?? field.min))}
                        aria-label={field.label}
                      />
                    </div>
                  );
                })}
              </div>
              <Button size="lg" className="mt-8 w-full" onClick={handleCalculate}>
                <Gauge className="size-4" />
                Calculate my ROI ({filled}/{FIELDS.length} filled)
              </Button>
            </div>

            {/* Results */}
            <div id="roi-results" className="surface-gradient scroll-mt-20 p-6 sm:p-8">
              {!results || !inputs ? (
                <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
                  <Gauge className="size-10 text-primary" />
                  <h3 className="type-heading-md mt-4">Your ROI will appear here</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    Add your business figures on the left, then choose Calculate to estimate how a sales improvement could affect revenue and payback.
                  </p>
                </div>
              ) : (
              <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="type-heading-sm">Your estimated results</h3>
                  <p className="text-sm text-muted-foreground">
                    This scenario assumes sales performance improves by {formatNumber(inputs.improvement, 0)}%. Actual results may be different.
                  </p>
                </div>
                <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist" aria-label="Result view">
                  {([["sales", "Sales Uplift"], ["profit", "Net Profit / Margin"]] as const).map(([v, l]) => (
                    <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {view === "sales" ? (<>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {headline.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-soft backdrop-blur transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      <Icon className="size-4 text-primary" />
                      <div className="mt-3 text-2xl font-semibold tabular-nums tracking-tight transition-all duration-300">
                        {item.value}
                      </div>
                      <div className="mt-1 text-xs font-medium text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground/80">{item.hint}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {secondary.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-2xl border border-border/60 bg-card/60 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <Icon className="size-3.5 text-primary" />
                        {item.label}
                      </div>
                      <div className="mt-2 text-lg font-semibold tabular-nums">{item.value}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground/80">{item.hint}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    Annual revenue: today vs uplift
                  </div>
                  <div className="mt-3 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                        <YAxis
                          tickFormatter={(v: number) => formatCurrency(v, true)}
                          tickLine={false}
                          axisLine={false}
                          fontSize={11}
                          width={54}
                          stroke="var(--color-muted-foreground)"
                        />
                        <Tooltip
                          cursor={{ fill: "var(--color-muted)" }}
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{
                            background: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 12,
                            color: "var(--color-popover-foreground)",
                            fontSize: 12,
                          }}
                        />
                        <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                          {comparisonData.map((entry, index) => (
                            <Cell
                              key={entry.name}
                              fill={index === 0 ? "var(--color-chart-2)" : "var(--color-chart-1)"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/70 p-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    Cumulative gain vs investment
                  </div>
                  <div className="mt-3 h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={rampData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
                        <YAxis
                          tickFormatter={(v: number) => formatCurrency(v, true)}
                          tickLine={false}
                          axisLine={false}
                          fontSize={11}
                          width={54}
                          stroke="var(--color-muted-foreground)"
                        />
                        <Tooltip
                          formatter={(v: number) => formatCurrency(v)}
                          contentStyle={{
                            background: "var(--color-popover)",
                            border: "1px solid var(--color-border)",
                            borderRadius: 12,
                            color: "var(--color-popover-foreground)",
                            fontSize: 12,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="cumulative"
                          stroke="var(--color-chart-1)"
                          strokeWidth={2.5}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="invested"
                          stroke="var(--color-chart-4)"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              </>) : (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {PROFIT_FIELDS.map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <Label htmlFor={f.key} className="text-xs text-muted-foreground">{f.label}</Label>
                        <div className="relative">
                          {f.money ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span> : null}
                          <Input id={f.key} type="number" inputMode="decimal" min={0} max={f.money ? undefined : 100} placeholder={f.money ? "Enter amount" : "0–100"} value={profitRaw[f.key]}
                            onChange={(e) => setProfitRaw((p) => ({ ...p, [f.key]: e.target.value }))}
                            className={`text-right tabular-nums ${f.money ? "pl-6" : "pr-8"}`} />
                          {!f.money ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!profit ? (
                    <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Enter the share left after delivery costs, the extra costs that vary with sales, and any additional yearly investment to estimate profit. Percentage values must be between 0 and 100.
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[
                          { label: "Net incremental profit / year", value: formatCurrency(profit.netProfit), tone: profit.netProfit >= 0 ? "text-success" : "text-destructive" },
                          { label: "Net margin on uplift", value: `${formatNumber(profit.netMargin, 1)}%`, tone: "" },
                          { label: "Profit payback", value: profit.profitPaybackMonths ? `${formatNumber(profit.profitPaybackMonths, 1)} mo` : "—", tone: "" },
                        ].map((k) => (
                          <div key={k.label} className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-soft">
                            <div className={`text-2xl font-semibold tabular-nums ${k.tone}`}>{k.value}</div>
                            <div className="mt-1 text-xs font-medium text-muted-foreground">{k.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-card/70 p-4 text-sm">
                        {[
                          ["Extra revenue", r.extraRevenueYear],
                          ["Gross profit on uplift", profit.grossProfit],
                          ["Less: variable selling costs", -profit.variableCost],
                          ["Less: additional fixed investment", -profit.incrementalAnnualCost],
                        ].map(([l, v]) => (
                          <div key={l as string} className="flex justify-between border-b border-border/60 py-2">
                            <span className="text-muted-foreground">{l}</span>
                            <span className="font-medium tabular-nums">{formatCurrency(v as number)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between pt-2 font-semibold">
                          <span>{profit.netProfit >= 0 ? "Net profit" : "Net loss"}</span>
                          <span className={`tabular-nums ${profit.netProfit >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(profit.netProfit)}</span>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">
                          Contribution margin {formatNumber(profit.contributionMargin, 1)}%. Existing spend isn't deducted twice; tax and financing excluded.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-border/70 bg-card/60 p-4">
                <h4 className="text-sm font-semibold">How to read these results</h4>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Extra revenue is the estimated difference between your current sales and the improved scenario. The ROI shown here compares that extra revenue with your current annual sales and team costs; it is a planning indicator, not a profit margin. Add assumptions in “Net Profit / Margin” to estimate profit after the additional costs you enter.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Estimates depend on the figures you enter. Taxes, financing, cash collection timing and unexpected costs are not included unless stated.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="flex-1"
                  disabled={pdfBusy}
                  onClick={async () => {
                    setPdfBusy(true);
                    try {
                      const { downloadAuditPdf } = await import("@/lib/audit-pdf");
                      await downloadAuditPdf({ currency, inputs, results, profitInputs, profit });
                      toast.success("Your ROI report has been downloaded");
                    } catch {
                      toast.error("Couldn't create the PDF. Please try again.");
                    } finally {
                      setPdfBusy(false);
                    }
                  }}
                >
                  <Download className="size-4" />
                  {pdfBusy ? "Preparing your report…" : "Download my ROI report (PDF)"}
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                <SaveScenario inputs={inputs} results={results} />
                <LeadCaptureForm results={results} inputs={inputs} />
              </div>
              </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Sticky mobile CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 lg:hidden">
        <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-border bg-card/95 p-2 shadow-lift backdrop-blur">
          <Button asChild className="w-full">
            <a href={results ? "#roi-results" : "#calculator"}>
              {results
                ? `Your upside · ${formatCurrency(results.extraRevenueYear, true)}`
                : "Calculate my ROI"}
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
