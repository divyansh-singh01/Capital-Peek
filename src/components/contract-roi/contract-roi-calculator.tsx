import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ClipboardList,
  Clock,
  FileCheck2,
  Info,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedNumber } from "@/components/animated-number";
import { ContractRoiGauge } from "@/components/contract-roi/contract-roi-gauge";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";
import { formatCurrency, formatNumber, type Currency } from "@/lib/roi";
import {
  ASSUMPTIONS,
  DEPARTMENTS,
  DEPARTMENT_GUIDANCE,
  EMPLOYEE_BANDS,
  EMPLOYEE_BAND_KEYS,
  SAMPLE_CONTRACT_INPUTS,
  calculateContractRoi,
  validateContractRoi,
  type ContractRoiInputs,
  type Department,
  type EmployeeBand,
} from "@/lib/contract-roi";

type SavedRow = {
  id: string;
  name: string;
  department: string | null;
  inputs: unknown;
  results: unknown;
  created_at: string;
};

const HANDLING_OPTIONS = [
  { key: "semiAutomated", label: "Semi automated", icon: FileCheck2, hint: "Templates or tooling in place" },
  { key: "manual", label: "Manually", icon: ClipboardList, hint: "Email, documents and spreadsheets" },
] as const;

export function ContractRoiCalculator({ publicMode = false }: { publicMode?: boolean } = {}) {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const [inputs, setInputs] = useState<ContractRoiInputs>(SAMPLE_CONTRACT_INPUTS);
  const [currency, setCurrency] = useState<Currency>("INR");
  const [touched, setTouched] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [name, setName] = useState("");

  const errors = useMemo(() => validateContractRoi(inputs), [inputs]);
  const valid = Object.keys(errors).length === 0;
  const results = useMemo(
    () => (valid ? calculateContractRoi(inputs) : null),
    [inputs, valid],
  );

  const money = (v: number, compact = false) => formatCurrency(v, compact, currency);
  const symbol = currency === "INR" ? "₹" : "$";

  const set = <K extends keyof ContractRoiInputs>(key: K, value: ContractRoiInputs[K]) => {
    setTouched(true);
    setInputs((prev) => ({ ...prev, [key]: value }));
  };

  const numeric = (raw: string) => (raw === "" ? Number.NaN : Number(raw));

  const reset = () => {
    setInputs(SAMPLE_CONTRACT_INPUTS);
    setTouched(false);
    setName("");
  };

  const history = useQuery({
    queryKey: ["contract-roi-analyses"],
    enabled: !publicMode && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_roi_calculations")
        .select("id,name,department,inputs,results,created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as SavedRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You need to be signed in to save.");
      if (!results) throw new Error("Fix the highlighted inputs first.");
      const { error } = await supabase.from("contract_roi_calculations").insert({
        user_id: user.id,
        name: name.trim() || `${inputs.department} contract analysis`,
        department: inputs.department,
        inputs: { ...inputs, currency },
        results,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contract analysis saved");
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["contract-roi-analyses"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not save the analysis"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contract_roi_calculations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Analysis deleted");
      void queryClient.invalidateQueries({ queryKey: ["contract-roi-analyses"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete the analysis"),
  });

  const loadSaved = (row: SavedRow) => {
    const saved = row.inputs as Partial<ContractRoiInputs> & { currency?: Currency };
    setInputs({ ...SAMPLE_CONTRACT_INPUTS, ...saved });
    if (saved.currency) setCurrency(saved.currency);
    setName(row.name);
    setTouched(true);
    toast.success(`Loaded "${row.name}"`);
  };

  const gaugeMax = Math.max(results ? results.annualLabourCost : 0, 1);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          {publicMode ? (
            <h3 className="type-display-md">Contract ROI</h3>
          ) : (
            <h1 className="type-display-md">Contract ROI</h1>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            Measure the financial impact of improving your contract management process.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/70 p-0.5">
            {(["INR", "USD"] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                aria-pressed={currency === c}
                className={`press rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  currency === c ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {c === "INR" ? "₹ INR" : "$ USD"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="press" onClick={reset}>
            <RotateCcw className="size-4" /> Reset
          </Button>
        </div>
      </header>

      {!touched && (
        <p className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Sparkles className="size-3.5" /> Showing example inputs — replace them with your own
          numbers.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
        {/* ---------------- INPUT PANEL ---------------- */}
        <Card className="card-soft space-y-6 rounded-2xl p-5 sm:p-6">
          <div>
            <h2 className="type-heading-sm">
              How does your company handle contracts today?
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {HANDLING_OPTIONS.map((opt) => {
                const active = inputs.handling === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("handling", opt.key)}
                    className={`press flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? "border-primary/50 bg-primary/8 ring-1 ring-primary/25"
                        : "border-border/70 hover:border-border"
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <opt.icon className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <Label className="text-sm">Annual contract volume</Label>
              <span className="num text-sm font-semibold">{formatNumber(inputs.annualVolume)}</span>
            </div>
            <Slider
              className="mt-3"
              value={[inputs.annualVolume]}
              min={0}
              max={500}
              step={10}
              aria-label="Annual contract volume"
              onValueChange={(v) => set("annualVolume", v[0] ?? 0)}
            />
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              {[0, 100, 200, 300, 400, 500].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm">Number of employees involved</Label>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {EMPLOYEE_BAND_KEYS.map((band: EmployeeBand) => {
                const active = inputs.employeeBand === band;
                return (
                  <button
                    key={band}
                    type="button"
                    aria-pressed={active}
                    onClick={() => set("employeeBand", band)}
                    className={`press shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary/50 bg-primary text-primary-foreground"
                        : "border-border/70 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {band}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Model uses {EMPLOYEE_BANDS[inputs.employeeBand]} people as the representative count.
            </p>
          </div>

          <div>
            <Label className="text-sm" htmlFor="cr-department">
              Choose the department you work in
            </Label>
            <Select
              value={inputs.department}
              onValueChange={(v) => set("department", v as Department)}
            >
              <SelectTrigger id="cr-department" className="mt-2">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="cr-hours"
              label="Avg. time per contract (hrs)"
              placeholder="4"
              value={inputs.avgHoursPerContract}
              error={errors.avgHoursPerContract}
              onChange={(raw) => set("avgHoursPerContract", numeric(raw))}
              min={0}
              step={0.5}
            />
            <Field
              id="cr-salary"
              label="Avg. employee salary (monthly)"
              placeholder="40000"
              prefix={symbol}
              value={inputs.avgMonthlySalary}
              error={errors.avgMonthlySalary}
              onChange={(raw) => set("avgMonthlySalary", numeric(raw))}
              min={0}
              step={1000}
            />
            <Field
              id="cr-renewal"
              label="Contract renewal percentage"
              placeholder="60"
              suffix="%"
              value={inputs.renewalPercent}
              error={errors.renewalPercent}
              onChange={(raw) => set("renewalPercent", numeric(raw))}
              min={0}
              max={100}
              step={1}
            />
            <Field
              id="cr-closure"
              label="Sales contract closure time (hrs)"
              placeholder="12"
              value={inputs.closureHours}
              error={errors.closureHours}
              onChange={(raw) => set("closureHours", numeric(raw))}
              min={0}
              step={1}
            />
          </div>

          <div className="rounded-xl border border-border/70">
            <button
              type="button"
              onClick={() => setShowAssumptions((s) => !s)}
              aria-expanded={showAssumptions}
              className="press flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-medium"
            >
              <span className="flex items-center gap-2">
                <Info className="size-3.5" /> How is this calculated?
              </span>
              <ChevronDown
                className={`size-4 transition-transform ${showAssumptions ? "rotate-180" : ""}`}
              />
            </button>
            {showAssumptions && (
              <ul className="space-y-1.5 border-t border-border/70 px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
                <li>
                  Model assumption: a structured workflow removes{" "}
                  {Math.round(ASSUMPTIONS.timeReduction[inputs.handling] * 100)}% of contract
                  handling time for your selected handling mode.
                </li>
                <li>
                  Hourly cost = monthly salary ÷ {ASSUMPTIONS.workingHoursPerMonth} working hours.
                </li>
                <li>
                  Productivity uses {formatNumber(ASSUMPTIONS.productiveHoursPerYear)} productive
                  hours per employee per year.
                </li>
                <li>
                  Renewal and compliance figures are modelled process coverage based on your inputs,
                  not measured compliance data.
                </li>
                <li>These are model assumptions, not guaranteed business outcomes.</li>
              </ul>
            )}
          </div>
        </Card>

        {/* ---------------- RESULTS PANEL ---------------- */}
        <Card className="card-soft rounded-2xl p-5 sm:p-6">
          {!results ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center">
              <p className="text-sm font-medium">Check your inputs</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Some values are missing or out of range. Fix the highlighted fields to see your
                financial impact.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="savings">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="savings" className="text-xs">
                  Total cost savings
                </TabsTrigger>
                <TabsTrigger value="efficiency" className="text-xs">
                  Efficiency
                </TabsTrigger>
                <TabsTrigger value="compliance" className="text-xs">
                  Compliance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="savings" className="reveal-up mt-6 space-y-5">
                <ContractRoiGauge
                  value={results.costSavings}
                  max={gaugeMax}
                  label="Estimated annual administrative cost savings"
                  format={(v) => money(v, true)}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Kpi
                    icon={Clock}
                    value={
                      <AnimatedNumber
                        value={results.hoursSavedPerEmployee}
                        format={(v) => `${formatNumber(v)} hrs`}
                      />
                    }
                    label="Time saved per employee / year"
                  />
                  <Kpi
                    icon={TrendingUp}
                    value={
                      <AnimatedNumber
                        value={results.labourCostReduction}
                        format={(v) => money(v, true)}
                      />
                    }
                    label="Reduction in labour costs"
                  />
                </div>
                <Row label="Annual contract hours" value={`${formatNumber(results.annualContractHours)} hrs`} />
                <Row label="Annual contract labour cost" value={money(results.annualLabourCost)} />
              </TabsContent>

              <TabsContent value="efficiency" className="reveal-up mt-6 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <BeforeAfter
                    title="Time per contract"
                    before={`${results.timePerContractBefore.toFixed(1)} hrs`}
                    after={`${results.timePerContractAfter.toFixed(1)} hrs`}
                  />
                  <BeforeAfter
                    title="Annual contract hours"
                    before={`${formatNumber(results.annualContractHours)} hrs`}
                    after={`${formatNumber(results.remainingHours)} hrs`}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Kpi
                    icon={Clock}
                    value={
                      <AnimatedNumber value={results.hoursSaved} format={(v) => `${formatNumber(v)} hrs`} />
                    }
                    label="Total hours saved annually"
                  />
                  <Kpi
                    icon={TrendingUp}
                    value={
                      <AnimatedNumber
                        value={results.productivityGainPercent}
                        format={(v) => `${v.toFixed(1)}%`}
                      />
                    }
                    label="Modelled productivity improvement"
                  />
                </div>
                <Row
                  label="Contracts handled per employee today"
                  value={formatNumber(results.contractsPerEmployeeBefore)}
                />
                <Row
                  label="Capacity per employee after improvement"
                  value={`${formatNumber(results.contractsPerEmployeeAfter)} contracts`}
                />
                <Row
                  label="Sales closure time"
                  value={`${results.closureHoursBefore.toFixed(1)} hrs → ${results.closureHoursAfter.toFixed(1)} hrs`}
                />
              </TabsContent>

              <TabsContent value="compliance" className="reveal-up mt-6 space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Kpi
                    icon={ShieldCheck}
                    value={
                      <AnimatedNumber
                        value={results.processConsistencyPercent}
                        format={(v) => `${v.toFixed(0)}%`}
                      />
                    }
                    label="Estimated process consistency"
                  />
                  <Kpi
                    icon={FileCheck2}
                    value={
                      <AnimatedNumber
                        value={results.renewalCoveragePercent}
                        format={(v) => `${v.toFixed(0)}%`}
                      />
                    }
                    label="Estimated renewal workflow coverage"
                  />
                </div>
                <Row
                  label="Contracts up for renewal each year"
                  value={formatNumber(results.renewalContracts)}
                />
                <Row
                  label="Renewal hours reclaimed"
                  value={`${formatNumber(results.renewalHoursSaved)} hrs`}
                />
                <Row
                  label="Contracts modelled as needing attention"
                  value={formatNumber(results.contractsNeedingAttention)}
                />
                <Row
                  label="Potential reduction in manual handling"
                  value={`${results.manualErrorReductionPercent.toFixed(0)}%`}
                />
                <p className="text-[11px] text-muted-foreground">
                  These are modelled process indicators based on your inputs. CapitalPeek does not
                  measure your actual compliance status.
                </p>
              </TabsContent>

              <div className="mt-6 border-t border-border/70 pt-5">
                <h3 className="text-sm font-semibold">So, what&apos;s next?</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {DEPARTMENT_GUIDANCE[inputs.department]}
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <Label htmlFor="cr-name" className="text-xs">
                      Analysis name
                    </Label>
                    <Input
                      id="cr-name"
                      className="mt-1.5"
                      placeholder={`${inputs.department} contract analysis`}
                      value={name}
                      maxLength={120}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {publicMode && !user ? (
                      <Button asChild className="press">
                        <Link to="/auth">
                          <Save className="size-4" /> Sign in to save this analysis
                        </Link>
                      </Button>
                    ) : (
                    <Button
                      className="press"
                      disabled={saveMutation.isPending || !user}
                      onClick={() => saveMutation.mutate()}
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Saving…
                        </>
                      ) : (
                        <>
                          <Save className="size-4" /> Save contract analysis
                        </>
                      )}
                    </Button>
                    )}
                    <Button variant="outline" className="press" onClick={reset}>
                      <RotateCcw className="size-4" /> Run another analysis
                    </Button>
                  </div>
                </div>
              </div>
            </Tabs>
          )}
        </Card>
      </div>

      {/* ---------------- HISTORY ---------------- */}
      {!publicMode && (
      <Card className="card-soft rounded-2xl p-5 sm:p-6">
        <h2 className="type-heading-md">Recent contract analyses</h2>
        {history.isLoading ? (
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : !history.data?.length ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No saved analyses yet. Run the calculator above and save your first one.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {history.data.map((row) => {
              const r = row.results as { costSavings?: number; hoursSaved?: number } | null;
              const i = row.inputs as { annualVolume?: number } | null;
              return (
                <li
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.department ?? "—"} · {formatNumber(i?.annualVolume ?? 0)} contracts ·{" "}
                      {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num text-sm font-semibold">
                      {money(r?.costSavings ?? 0, true)}
                    </span>
                    <Button size="sm" variant="outline" className="press" onClick={() => loadSaved(row)}>
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="press text-muted-foreground"
                      aria-label={`Delete ${row.name}`}
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(row.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      )}
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  prefix,
  suffix,
  placeholder,
  min,
  max,
  step,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (raw: string) => void;
  error?: string | undefined;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="relative mt-1.5">
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className={`num ${prefix ? "pl-7" : ""} ${suffix ? "pr-8" : ""} ${
            error ? "border-destructive focus-visible:ring-destructive/40" : ""
          }`}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-[11px] text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Kpi({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Clock;
  value: React.ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30">
      <Icon className="size-4 text-primary" />
      <div className="num mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{value}</div>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 pt-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  );
}

function BeforeAfter({
  title,
  before,
  after,
}: {
  title: string;
  before: string;
  after: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="num text-sm text-muted-foreground line-through">{before}</span>
        <span aria-hidden>→</span>
        <span className="num text-xl font-semibold text-primary">{after}</span>
      </div>
    </div>
  );
}
