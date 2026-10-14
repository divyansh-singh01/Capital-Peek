import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, Check, CheckCircle2, FileSignature, FileText, Mail, MessageSquare, Phone,
  RefreshCw, Sparkles, Trash2, TrendingUp, Users, AlertTriangle, ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/roi";
import { useCanEdit, useSession } from "@/hooks/use-auth";
import { DEFAULT_PROBABILITY, STAGES, dealHealth, dealInsights, expectedRevenue, nextBestAction, type Stage } from "@/lib/deal-health";
import { HealthBadge } from "@/components/deals/health-badge";
import { DEAL_COLUMNS, type DealRow } from "./pipeline";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/deals/$dealId")({
  head: () => ({ meta: [{ title: "Deal details — CapitalPeek" }] }),
  component: DealDetail,
});

type Activity = { id: string; type: string; title: string; body: string | null; due_at: string | null; completed_at: string | null; created_at: string };
type Contract = { id: string; contract_name: string; customer_name: string; contract_value: number; start_date: string | null; end_date: string | null; status: string };

const ICONS: Record<string, typeof Phone> = {
  call: Phone, email: Mail, meeting: Users, note: MessageSquare, task: ListTodo,
  stage_change: RefreshCw, value_change: TrendingUp, contract_created: FileSignature,
};
const MAIN = STAGES.filter((s) => s.key !== "lost");

function DealDetail() {
  const { dealId } = Route.useParams();
  const qc = useQueryClient();
  const { user } = useSession();
  const { canEdit } = useCanEdit(user);
  const [act, setAct] = useState({ type: "note", title: "", body: "" });
  const [contractOpen, setContractOpen] = useState(false);

  const deal = useQuery({
    queryKey: ["deal", dealId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select(DEAL_COLUMNS).eq("id", dealId).maybeSingle();
      if (error) throw error;
      return data as DealRow | null;
    },
  });
  const activities = useQuery({
    queryKey: ["deal-activities", dealId],
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_activities").select("id, type, title, body, due_at, completed_at, created_at").eq("deal_id", dealId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Activity[];
    },
  });
  const contract = useQuery({
    queryKey: ["deal-contract", dealId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contracts").select("id, contract_name, customer_name, contract_value, start_date, end_date, status").eq("deal_id", dealId).maybeSingle();
      if (error) throw error;
      return data as Contract | null;
    },
  });

  const refresh = () => {
    for (const k of [["deal", dealId], ["deal-activities", dealId], ["deal-contract", dealId], ["deals"], ["dashboard-overview"]]) void qc.invalidateQueries({ queryKey: k });
  };

  const updateDeal = useMutation({
    mutationFn: async (patch: Partial<DealRow>) => {
      const { error } = await supabase.from("deals").update(patch).eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const addActivity = useMutation({
    mutationFn: async () => {
      if (!user || !deal.data) throw new Error("Not ready");
      if (!act.title.trim()) throw new Error("Add a short title.");
      const { error } = await supabase.from("deal_activities").insert({
        deal_id: dealId, created_by: user.id,
        type: act.type, title: act.title.trim().slice(0, 300), body: act.body.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Activity logged"); setAct({ type: act.type, title: "", body: "" }); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const completeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deal_activities").update({ completed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const completeNext = useMutation({
    mutationFn: async (action: string) => {
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase.from("deal_activities").insert({
        deal_id: dealId, created_by: user.id,
        type: "task", title: `Completed: ${action}`.slice(0, 300), completed_at: new Date().toISOString(),
      });
      if (error) throw error;
      const { error: e2 } = await supabase.from("deals").update({ next_action: null, next_action_due: null }).eq("id", dealId);
      if (e2) throw e2;
    },
    onSuccess: () => { toast.success("Marked complete"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (deal.isLoading) return <div className="space-y-4"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div>;
  if (deal.error) return <div className="glass-panel rounded-2xl p-6 text-sm text-destructive">Couldn't load this deal: {(deal.error as Error).message}</div>;
  const d = deal.data;
  if (!d) return (
    <div className="glass-panel rounded-3xl p-10 text-center">
      <h1 className="type-heading-lg">Deal not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">It may have been deleted or you don't have access.</p>
      <Button asChild className="mt-4"><Link to="/dashboard/pipeline">Back to pipeline</Link></Button>
    </div>
  );

  const health = dealHealth(d);
  const insights = dealInsights(d);
  const nba = nextBestAction(d);
  const stageIdx = MAIN.findIndex((s) => s.key === d.stage);

  return (
    <div className="space-y-6">
      <Link to="/dashboard/pipeline" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Pipeline
      </Link>

      <header className="glass-panel rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{d.account_name}</p>
            <h1 className="type-display-md mt-1">{d.deal_name || d.account_name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <HealthBadge health={health} showScore />
              <span>· Owner: {d.owner_name ?? "—"}</span>
              {d.contact_name ? <span>· Contact: {d.contact_name}</span> : null}
              <span><CalendarDays className="mr-1 inline size-3" />Close {d.expected_close_date ?? "not set"}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? <Select value={d.stage} onValueChange={(v) => updateDeal.mutate({ stage: v as Stage, probability: DEFAULT_PROBABILITY[v as Stage] })}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select> : <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">View-only</span>}
          </div>
        </div>

        <ol className="mt-6 flex flex-wrap gap-1.5">
          {MAIN.map((s, i) => (
            <li key={s.key} className={cn("flex-1 min-w-[80px] rounded-lg px-2 py-1.5 text-center text-xs font-medium",
              d.stage === "lost" ? "bg-muted text-muted-foreground" : i < stageIdx ? "bg-primary/15 text-primary" : i === stageIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {s.label}
            </li>
          ))}
        </ol>
        {d.stage === "lost" ? <p className="mt-2 text-xs text-destructive">This deal was lost.</p> : null}
      </header>

      {d.stage === "won" ? (
        contract.data ? (
          <section className="card-soft flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-success/30 p-5">
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-success" />
              <div>
                <div className="text-sm font-semibold">Contract: {contract.data.contract_name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(Number(contract.data.contract_value))} · {contract.data.status} · {contract.data.start_date ?? "no start"} → {contract.data.end_date ?? "no end"}
                </div>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Deal → Contract linked</span>
          </section>
        ) : (
          <section className="card-soft flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-success/30 p-5">
            <div>
              <div className="text-lg font-semibold">Deal won 🎉</div>
              <p className="text-sm text-muted-foreground">Turn it into a contract — details are filled in from this deal.</p>
            </div>
            {canEdit ? <Button className="press" onClick={() => setContractOpen(true)}><FileSignature className="size-4" /> Create contract</Button> : null}
          </section>
        )
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-soft rounded-2xl p-5">
          <h2 className="type-heading-md">Financials</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <EditableMoney label="Deal value" value={Number(d.value)} readOnly={!canEdit} onSave={(v) => { if (v > 1_000_000_000_000) toast.error("That deal value is too large."); else updateDeal.mutate({ value: v }); }} />
            <EditableNumber label="Probability %" value={d.probability} readOnly={!canEdit} onSave={(v) => { if (v > 100) toast.error("Probability must be between 0 and 100."); else updateDeal.mutate({ probability: Math.round(v) }); }} />
            <Row label="Weighted / expected revenue" value={formatCurrency(expectedRevenue(d))} strong />
            <Row label="Potential ROI" value="Available once costs are tracked" muted />
          </dl>
        </section>

        <section className="card-soft rounded-2xl p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="type-heading-sm">Deal Health</h2>
            {health.status !== "closed" ? <span className="num text-lg font-semibold">{health.score} / 100</span> : null}
          </div>
          <p className="text-xs text-muted-foreground">Rule-based score from activity, stage age, dates and next steps.</p>
          {health.status === "closed" ? <p className="mt-4 text-sm text-muted-foreground">Closed deals are not scored.</p> : (
            <div className="mt-4 space-y-3 text-sm">
              {health.positives.map((p) => <div key={p} className="flex gap-2 text-success"><Check className="mt-0.5 size-4 shrink-0" /><span className="text-foreground">{p}</span></div>)}
              {health.risks.map((r) => <div key={r} className="flex gap-2 text-warning"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><span className="text-foreground">{r}</span></div>)}
            </div>
          )}
        </section>

        <section className="card-soft rounded-2xl p-5">
          <h2 className="type-heading-sm">Next best action</h2>
          <div className="mt-4 rounded-xl bg-muted/60 p-4">
            <div className="text-sm font-semibold">{nba.action}</div>
            <div className="mt-1 text-xs text-muted-foreground">Reason: {nba.reason}</div>
          </div>
          {d.stage !== "lost" && canEdit ? (
            <Button size="sm" variant="outline" className="press mt-3" disabled={completeNext.isPending} onClick={() => completeNext.mutate(nba.action)}>
              <CheckCircle2 className="size-4" /> Mark complete
            </Button>
          ) : null}
          {canEdit ? <NextActionEditor key={`${d.next_action}-${d.next_action_due}`} action={d.next_action} due={d.next_action_due} onSave={(next_action, next_action_due) => updateDeal.mutate({ next_action, next_action_due })} /> : null}
        </section>
      </div>

      <section className="card-soft rounded-2xl p-5">
        <h2 className="type-heading-md flex items-center gap-2"><Sparkles className="size-4 text-primary" /> CapitalPeek Insights</h2>
        <p className="text-xs text-muted-foreground">Generated from your deal data using transparent business rules — not AI.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {insights.map((i) => (
            <div key={i.title} className={cn("rounded-xl border p-4", i.tone === "warn" ? "border-warning/40" : i.tone === "good" ? "border-success/40" : "border-border")}>
              <div className="text-sm font-semibold">{i.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{i.why}</p>
              <p className="mt-2 text-xs"><span className="font-medium">Recommended action:</span> {i.action}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card-soft rounded-2xl p-5">
        <h2 className="type-heading-md">Activity timeline</h2>
        {canEdit ? <div className="mt-4 grid gap-3 rounded-xl border border-border/60 p-4 sm:grid-cols-[140px_1fr_auto]">
          <Select value={act.type} onValueChange={(v) => setAct((a) => ({ ...a, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["note", "call", "email", "meeting", "task"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="e.g. Proposal sent to CFO" value={act.title} maxLength={300} onChange={(e) => setAct((a) => ({ ...a, title: e.target.value }))} />
          <Button className="press" disabled={addActivity.isPending} onClick={() => addActivity.mutate()}>Log</Button>
          <Textarea className="sm:col-span-3" rows={2} maxLength={5000} placeholder="Details (optional)" value={act.body} onChange={(e) => setAct((a) => ({ ...a, body: e.target.value }))} />
        </div> : null}
        {activities.isLoading ? <Skeleton className="mt-4 h-24 rounded-xl" /> : (activities.data?.length ?? 0) === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No activity yet. Log calls, emails, meetings and notes to keep Deal Health accurate.</p>
        ) : (
          <ol className="mt-5 space-y-4 border-l border-border pl-5">
            {activities.data!.map((a) => {
              const Icon = ICONS[a.type] ?? MessageSquare;
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[31px] flex size-5 items-center justify-center rounded-full bg-card ring-1 ring-border"><Icon className="size-3 text-primary" /></span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("text-sm font-medium", a.completed_at && a.type === "task" && "line-through opacity-70")}>{a.title}</span>
                    {a.type === "task" && !a.completed_at ? (
                      canEdit ? <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => completeTask.mutate(a.id)}><Check className="size-3" /> Done</Button> : null
                    ) : null}
                  </div>
                  {a.body ? <p className="mt-0.5 text-sm text-muted-foreground">{a.body}</p> : null}
                  <time className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {canEdit ? <DeleteDeal id={d.id} /> : null}

      <ContractDialog open={contractOpen} onOpenChange={setContractOpen} deal={d} userId={user?.id ?? null} onDone={refresh} />
    </div>
  );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("num text-right", strong && "font-semibold", muted && "text-xs text-muted-foreground")}>{value}</dd>
    </div>
  );
}

function EditableMoney({ label, value, onSave, readOnly }: { label: string; value: number; onSave: (v: number) => void; readOnly?: boolean }) {
  return <EditableNumber label={label} value={value} onSave={onSave} readOnly={readOnly ?? false} format={(v) => formatCurrency(v)} />;
}

function EditableNumber({ label, value, onSave, format = String, readOnly = false }: { label: string; value: number; onSave: (v: number) => void; format?: (v: number) => string; readOnly?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  if (readOnly) return <Row label={label} value={format(value)} />;
  if (!editing) return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd><button className="num underline decoration-dotted underline-offset-4" onClick={() => { setDraft(String(value)); setEditing(true); }}>{format(value)}</button></dd>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <Input className="h-8" inputMode="numeric" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      <Button size="sm" onClick={() => { const n = Number(draft.replace(/[^0-9.]/g, "")); if (Number.isFinite(n) && n >= 0) onSave(n); setEditing(false); }}>Save</Button>
    </div>
  );
}

function NextActionEditor({ action, due, onSave }: { action: string | null; due: string | null; onSave: (a: string | null, d: string | null) => void }) {
  const [a, setA] = useState(action ?? "");
  const [d, setD] = useState(due ?? "");
  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      <Label className="text-xs">Plan a next action</Label>
      <Input placeholder="Follow up with CFO" value={a} onChange={(e) => setA(e.target.value)} />
      <div className="flex gap-2">
        <Input type="date" value={d} onChange={(e) => setD(e.target.value)} />
        <Button size="sm" variant="outline" onClick={() => onSave(a.trim() || null, d || null)}>Save</Button>
      </div>
    </div>
  );
}

function DeleteDeal({ id }: { id: string }) {
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deal deleted"); void qc.invalidateQueries({ queryKey: ["deals"] }); void navigate({ to: "/dashboard/pipeline" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex justify-end">
      <Button variant="ghost" size="sm" className="text-destructive" disabled={del.isPending} onClick={() => { if (confirm("Delete this deal and its activity? This cannot be undone.")) del.mutate(); }}>
        <Trash2 className="size-4" /> Delete deal
      </Button>
    </div>
  );
}

function ContractDialog({ open, onOpenChange, deal, userId, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; deal: DealRow; userId: string | null; onDone: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const yearOn = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  const [f, setF] = useState({
    customer: deal.account_name, name: deal.deal_name || `${deal.account_name} contract`, owner: deal.owner_name ?? "",
    value: String(deal.value), start: today, end: yearOn, notes: deal.contact_name ? `Primary contact: ${deal.contact_name}` : "",
  });
  const qcRef = useQueryClient();
  const create = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      const v = Number(f.value.replace(/[^0-9.]/g, ""));
      if (!f.customer.trim() || !f.name.trim()) throw new Error("Customer and contract name are required.");
      if (!Number.isFinite(v) || v <= 0) throw new Error("Add a contract value.");
      if (v > 1_000_000_000_000) throw new Error("That contract value is too large.");
      if (f.start && f.end && f.end < f.start) throw new Error("The end date must be on or after the start date.");
      const { error } = await supabase.from("contracts").insert({
        deal_id: deal.id, created_by: userId, customer_name: f.customer.trim(), contract_name: f.name.trim(),
        owner_name: f.owner.trim() || null, contract_value: v, start_date: f.start || null, end_date: f.end || null, notes: f.notes.trim() || null,
      });
      if (error) throw error;
      // The contract is the source of truth; a failed timeline note must not make it look like the save failed.
      const { error: noteError } = await supabase.from("deal_activities").insert({ deal_id: deal.id, created_by: userId, type: "contract_created", title: `Contract created: ${f.name.trim()}`.slice(0, 300) });
      if (noteError) toast.message("Contract saved, but the timeline note could not be added.");
    },
    onSuccess: () => { toast.success("Contract created and linked to this deal"); onOpenChange(false); onDone(); void qcRef.invalidateQueries({ queryKey: ["contracts"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const s = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create contract</DialogTitle>
          <DialogDescription>Pre-filled from the won deal. Adjust anything before saving.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Customer</Label><Input value={f.customer} onChange={s("customer")} /></div>
          <div className="space-y-2"><Label>Contract name</Label><Input value={f.name} onChange={s("name")} /></div>
          <div className="space-y-2"><Label>Contract value (₹)</Label><Input inputMode="numeric" value={f.value} onChange={s("value")} /></div>
          <div className="space-y-2"><Label>Owner</Label><Input value={f.owner} onChange={s("owner")} /></div>
          <div className="space-y-2"><Label>Start date</Label><Input type="date" value={f.start} onChange={s("start")} /></div>
          <div className="space-y-2"><Label>End date</Label><Input type="date" value={f.end} onChange={s("end")} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={f.notes} onChange={s("notes")} /></div>
        </div>
        <Button className="press w-full" disabled={create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Creating…" : "Create contract"}</Button>
      </DialogContent>
    </Dialog>
  );
}
