import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink, FileSignature, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCanEdit, useSession } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/roi";

export const Route = createFileRoute("/_authenticated/dashboard/contracts")({
  head: () => ({ meta: [{ title: "Contracts — CapitalPeek" }] }),
  component: Contracts,
});

const STATUSES = ["draft", "active", "completed", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

const TONE: Record<Status, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  completed: "bg-primary/12 text-primary",
  cancelled: "bg-destructive/15 text-destructive",
};

type ContractRow = {
  id: string;
  deal_id: string | null;
  customer_name: string;
  contract_name: string;
  owner_name: string | null;
  contract_value: number;
  start_date: string | null;
  end_date: string | null;
  status: Status;
  created_at: string;
};

const fmt = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

function Contracts() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { canEdit } = useCanEdit(user);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select(
          "id, deal_id, customer_name, contract_name, owner_name, contract_value, start_date, end_date, status, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContractRow[];
    },
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["contracts"] });
    void queryClient.invalidateQueries({ queryKey: ["deal-contract"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
  };

  const setContractStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: Status }) => {
      const { error } = await supabase.from("contracts").update({ status: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contract deleted");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (status === "all" || r.status === status) &&
        (!q ||
          [r.customer_name, r.contract_name, r.owner_name].some((x) =>
            x?.toLowerCase().includes(q),
          )),
    );
  }, [rows, search, status]);

  const activeValue = rows
    .filter((r) => r.status === "active")
    .reduce((s, r) => s + Number(r.contract_value), 0);
  const today = new Date().toISOString().slice(0, 10);
  const in60 = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const expiring = rows.filter(
    (r) => r.status === "active" && r.end_date && r.end_date >= today && r.end_date <= in60,
  ).length;

  const kpis = [
    {
      label: "Active contract value",
      value: formatCurrency(activeValue, true),
      sub: `${rows.filter((r) => r.status === "active").length} active`,
    },
    { label: "Total contracts", value: String(rows.length), sub: "All statuses" },
    { label: "Ending in 60 days", value: String(expiring), sub: "Active contracts to renew" },
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <h1 className="type-display-lg">Contracts</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Contracts created from won deals. Create one from a won deal in the pipeline.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="card-soft rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            {isLoading ? (
              <Skeleton className="mt-3 h-7 w-24" />
            ) : (
              <div className="num mt-2 text-xl font-semibold">{k.value}</div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">{k.sub}</div>
          </div>
        ))}
      </div>

      {error ? (
        <div className="glass-panel flex items-center gap-3 rounded-2xl p-5 text-sm text-destructive">
          <AlertTriangle className="size-4" /> Couldn't load contracts: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : rows.length === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <FileSignature className="size-6" />
          </span>
          <h2 className="type-heading-lg">No contracts yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Mark a deal as Won, open it, and choose “Create contract”.
          </p>
          <Button asChild className="press">
            <Link to="/dashboard/pipeline">Open pipeline</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search customer, contract, owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No contracts match your filters.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="glass-panel glass-hover flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{r.contract_name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs capitalize ${TONE[r.status]}`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {r.customer_name}
                      {r.owner_name ? ` · ${r.owner_name}` : ""} · {fmt(r.start_date)} →{" "}
                      {fmt(r.end_date)}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="num mr-2 text-lg font-semibold tracking-tight">
                      {formatCurrency(Number(r.contract_value))}
                    </div>
                    {canEdit ? (
                      <Select
                        value={r.status}
                        onValueChange={(next) =>
                          setContractStatus.mutate({ id: r.id, next: next as Status })
                        }
                      >
                        <SelectTrigger className="h-8 w-32 text-xs capitalize">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                    {r.deal_id ? (
                      <Button asChild size="sm" variant="outline" className="press">
                        <Link to="/dashboard/deals/$dealId" params={{ dealId: r.deal_id }}>
                          <ExternalLink className="size-4" /> Deal
                        </Link>
                      </Button>
                    ) : null}
                    {canEdit ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${r.contract_name}`}
                        disabled={remove.isPending}
                        onClick={() => {
                          if (
                            confirm(`Delete contract “${r.contract_name}”? This cannot be undone.`)
                          )
                            remove.mutate(r.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
