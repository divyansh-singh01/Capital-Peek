import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, KanbanSquare, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/roi";
import { useCanEdit, useProfile, useSession } from "@/hooks/use-auth";
import {
  DEFAULT_PROBABILITY, STAGES, dealHealth, expectedRevenue, nextBestAction, pipelineSummary, type Stage,
} from "@/lib/deal-health";
import { HealthBadge } from "@/components/deals/health-badge";

export const Route = createFileRoute("/_authenticated/dashboard/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline & deals — CapitalPeek" }] }),
  component: Pipeline,
});

export type DealRow = {
  id: string;
  account_name: string;
  deal_name: string | null;
  contact_name: string | null;
  owner_name: string | null;
  value: number;
  probability: number;
  stage: Stage;
  expected_close_date: string | null;
  next_action: string | null;
  next_action_due: string | null;
  stage_changed_at: string;
  last_activity_at: string;
  created_at: string;
  won_at: string | null;
};

export const DEAL_COLUMNS =
  "id, account_name, deal_name, contact_name, owner_name, value, probability, stage, expected_close_date, next_action, next_action_due, stage_changed_at, last_activity_at, created_at, won_at";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

function relDays(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d}d ago`;
}

function Pipeline() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { data: profile } = useProfile(user);
  const { canEdit } = useCanEdit(user);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [healthFilter, setHealthFilter] = useState("all");
  const [form, setForm] = useState({
    account: "", dealName: "", contact: "", owner: "", value: "", stage: "lead" as Stage,
    probability: "", close: "", nextAction: "", nextDue: "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const { data, isLoading, error } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select(DEAL_COLUMNS).order("position").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DealRow[];
    },
  });

  const summary = useMemo(() => pipelineSummary(data ?? []), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((d) => {
      if (q && ![d.account_name, d.deal_name, d.contact_name, d.owner_name].some((x) => x?.toLowerCase().includes(q))) return false;
      if (healthFilter !== "all" && dealHealth(d).status !== healthFilter) return false;
      return true;
    });
  }, [data, search, healthFilter]);

  const grouped = useMemo(() => {
    const map = new Map<Stage, DealRow[]>();
    for (const s of STAGES) map.set(s.key, []);
    for (const deal of filtered) map.get(deal.stage)?.push(deal);
    return map;
  }, [filtered]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["deals"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
  };

  const createDeal = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You need to be signed in.");
      const numeric = Number(form.value.replace(/[^0-9.]/g, ""));
      if (!form.account.trim()) throw new Error("Add a customer / company name.");
      if (!Number.isFinite(numeric) || numeric <= 0) throw new Error("Add a deal value.");
      if (numeric > 1_000_000_000_000) throw new Error("That deal value is too large.");
      if (form.close && form.nextDue && form.nextDue > form.close && form.stage !== "lost")
        toast.message("Heads up: the next action is due after the expected close date.");
      if (form.probability !== "" && (!Number.isFinite(Number(form.probability)) || Number(form.probability) < 0 || Number(form.probability) > 100))
        throw new Error("Probability must be between 0 and 100.");
      const prob = form.probability === "" ? DEFAULT_PROBABILITY[form.stage] : Math.round(Number(form.probability));
      const { error } = await supabase.from("deals").insert({
        account_name: form.account.trim(),
        deal_name: form.dealName.trim() || null,
        contact_name: form.contact.trim() || null,
        owner_name: form.owner.trim() || profile?.full_name || null,
        value: numeric,
        probability: prob,
        stage: form.stage,
        expected_close_date: form.close || null,
        next_action: form.nextAction.trim() || null,
        next_action_due: form.nextDue || null,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deal added");
      setOpen(false);
      setForm({ account: "", dealName: "", contact: "", owner: "", value: "", stage: "lead", probability: "", close: "", nextAction: "", nextDue: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveDeal = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Stage }) => {
      const { error } = await supabase.from("deals").update({ stage: next, probability: DEFAULT_PROBABILITY[next] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      invalidate();
      if (v.next === "won") toast.success("Deal won 🎉 Open it to create the contract.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const loadSample = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You need to be signed in.");
      const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
      const rows = [
        { account_name: "Acme Industries", deal_name: "Enterprise contract", value: 2400000, stage: "negotiation", probability: 75, expected_close_date: day(12), next_action: "Follow up with CFO", next_action_due: day(1) },
        { account_name: "Northwind Logistics", deal_name: "Fleet analytics", value: 850000, stage: "proposal", probability: 50, expected_close_date: day(25), next_action: null, next_action_due: null },
        { account_name: "Sunrise Retail", deal_name: "POS rollout", value: 420000, stage: "qualified", probability: 25, expected_close_date: day(40), next_action: "Schedule demo", next_action_due: day(3) },
        { account_name: "Bluepeak Pharma", deal_name: "Annual licence", value: 1600000, stage: "contract", probability: 90, expected_close_date: day(5), next_action: "Send contract for signature", next_action_due: day(0) },
        { account_name: "Vertex Foods", deal_name: "Pilot", value: 300000, stage: "lead", probability: 10, expected_close_date: null, next_action: null, next_action_due: null },
        { account_name: "Orbit Fintech", deal_name: "Platform deal", value: 1200000, stage: "won", probability: 100, expected_close_date: day(-3), next_action: null, next_action_due: null },
      ] as const;
      const { error } = await supabase.from("deals").insert(
        rows.map((r) => ({ ...r, deal_name: `${r.deal_name} (sample)`, owner_name: profile?.full_name ?? "Sample owner", contact_name: "Sample contact", created_by: user.id, won_at: r.stage === "won" ? new Date().toISOString() : null })),
      );
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sample deals loaded — delete them any time."); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const kpis = [
    { label: "Total pipeline", value: formatCurrency(summary.total, true), sub: `${summary.openCount} open deals` },
    { label: "Weighted forecast", value: formatCurrency(summary.weighted, true), sub: "Value × probability" },
    { label: "Won this quarter", value: formatCurrency(summary.wonQuarter, true), sub: `${formatCurrency(summary.lost, true)} lost overall` },
    { label: "Win rate", value: summary.winRate === null ? "—" : `${Math.round(summary.winRate)}%`, sub: "Won ÷ closed deals" },
    { label: "Avg. deal cycle", value: summary.avgCycle === null ? "—" : `${summary.avgCycle} days`, sub: "Created → won" },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel flex flex-wrap items-start justify-between gap-4 rounded-3xl p-6 sm:p-8">
        <div>
          <h1 className="type-display-lg">Pipeline &amp; deals</h1>
          <p className="mt-3 text-sm text-muted-foreground">From opportunity to actual ROI — track every deal to contract.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          {canEdit ? (
            <DialogTrigger asChild>
              <Button className="press"><Plus className="size-4" /> New deal</Button>
            </DialogTrigger>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">View-only access</span>
          )}
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add a deal</DialogTitle>
              <DialogDescription>Only customer and value are required.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer / company *" value={form.account} onChange={set("account")} placeholder="Acme Industries" />
              <Field label="Deal name" value={form.dealName} onChange={set("dealName")} placeholder="Enterprise contract" />
              <Field label="Deal value (₹) *" value={form.value} onChange={set("value")} placeholder="500000" inputMode="numeric" />
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={form.stage} onValueChange={(v) => set("stage")(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Field label={`Probability % (default ${DEFAULT_PROBABILITY[form.stage]})`} value={form.probability} onChange={set("probability")} inputMode="numeric" placeholder={String(DEFAULT_PROBABILITY[form.stage])} />
              <Field label="Expected close" type="date" value={form.close} onChange={set("close")} />
              <Field label="Contact person" value={form.contact} onChange={set("contact")} />
              <Field label="Owner" value={form.owner} onChange={set("owner")} placeholder={profile?.full_name ?? "You"} />
              <Field label="Next action" value={form.nextAction} onChange={set("nextAction")} placeholder="Follow up with CFO" />
              <Field label="Next action due" type="date" value={form.nextDue} onChange={set("nextDue")} />
            </div>
            <Button className="press w-full" disabled={createDeal.isPending} onClick={() => createDeal.mutate()}>
              {createDeal.isPending ? "Saving…" : "Add deal"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="card-soft rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            {isLoading ? <Skeleton className="mt-3 h-7 w-24" /> : <div className="num mt-2 text-xl font-semibold">{k.value}</div>}
            <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="glass-panel flex items-center gap-3 rounded-2xl p-5 text-sm text-destructive">
          <AlertTriangle className="size-4" /> Couldn't load deals: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          {STAGES.map((s) => <Skeleton key={s.key} className="h-48 rounded-2xl" />)}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary"><KanbanSquare className="size-6" /></span>
          <h2 className="type-heading-lg">No deals yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Add your first opportunity to see pipeline value, weighted forecast and deal health.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {canEdit ? (
              <>
                <Button className="press" onClick={() => setOpen(true)}><Plus className="size-4" /> Add first deal</Button>
                <Button variant="outline" className="press" disabled={loadSample.isPending} onClick={() => loadSample.mutate()}>
                  <Sparkles className="size-4" /> {loadSample.isPending ? "Loading…" : "Load sample data"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search customer, deal, contact, owner…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All health</SelectItem>
                <SelectItem value="healthy">Healthy</SelectItem>
                <SelectItem value="attention">Needs attention</SelectItem>
                <SelectItem value="risk">At risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
            {STAGES.map((s) => {
              const deals = grouped.get(s.key) ?? [];
              const total = deals.reduce((sum, d) => sum + Number(d.value ?? 0), 0);
              return (
                <div key={s.key} className="glass-panel w-72 shrink-0 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">{deals.length}</span>
                  </div>
                  <div className="num mt-1 text-xs text-muted-foreground">{formatCurrency(total, true)}</div>
                  <div className="mt-4 space-y-3">
                    {deals.map((deal) => {
                      const health = dealHealth(deal);
                      const nba = nextBestAction(deal);
                      return (
                        <div key={deal.id} className="lift rounded-xl border border-border/60 bg-card/70 p-3">
                          <Link to="/dashboard/deals/$dealId" params={{ dealId: deal.id }} className="block">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold">{deal.account_name}</div>
                                {deal.deal_name ? <div className="truncate text-xs text-muted-foreground">{deal.deal_name}</div> : null}
                              </div>
                              <HealthBadge health={health} />
                            </div>
                            <div className="num mt-2 text-base font-semibold tracking-tight">{formatCurrency(Number(deal.value))}</div>
                            <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                              <dt className="text-muted-foreground">Probability</dt><dd className="num text-right">{deal.probability}%</dd>
                              <dt className="text-muted-foreground">Expected</dt><dd className="num text-right">{formatCurrency(expectedRevenue(deal), true)}</dd>
                              <dt className="text-muted-foreground">Close</dt><dd className="text-right"><CalendarDays className="mr-1 inline size-3" />{fmtDate(deal.expected_close_date)}</dd>
                              <dt className="text-muted-foreground">Owner</dt><dd className="truncate text-right">{deal.owner_name ?? "—"}</dd>
                            </dl>
                            {s.key !== "lost" ? (
                              <div className="mt-2 rounded-lg bg-muted/60 px-2 py-1.5 text-xs">
                                <span className="text-muted-foreground">Next: </span>{nba.action}
                              </div>
                            ) : null}
                            <div className="mt-1.5 text-[11px] text-muted-foreground">Last activity {relDays(deal.last_activity_at)}</div>
                          </Link>
                          {canEdit ? <Select value={deal.stage} onValueChange={(v) => moveDeal.mutate({ id: deal.id, next: v as Stage })}>
                            <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>{STAGES.map((opt) => <SelectItem key={opt.key} value={opt.key}>{opt.label}</SelectItem>)}</SelectContent>
                          </Select> : null}
                        </div>
                      );
                    })}
                    {deals.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border/60 p-3 text-center text-xs text-muted-foreground">Empty</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange, ...rest }: { label: string; value: string; onChange: (v: string) => void } & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
