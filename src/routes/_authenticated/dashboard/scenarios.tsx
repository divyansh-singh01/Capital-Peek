import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Layers, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useCanEdit, useSession } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/roi";
import { PENDING_SCENARIO_KEY, insertScenario, type PendingScenario } from "@/lib/scenarios";

export const Route = createFileRoute("/_authenticated/dashboard/scenarios")({
  head: () => ({ meta: [{ title: "Saved scenarios — CapitalPeek" }] }),
  component: Scenarios,
});

function readPending(): PendingScenario | null {
  try {
    const raw = sessionStorage.getItem(PENDING_SCENARIO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingScenario;
    return parsed && typeof parsed === "object" && parsed.inputs && parsed.results ? parsed : null;
  } catch {
    return null;
  }
}

function Scenarios() {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { canEdit } = useCanEdit(user);

  const { data, isLoading, error } = useQuery({
    queryKey: ["scenarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roi_calculations")
        .select("id, name, notes, results, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // A visitor who ran the public calculator, then signed in to save, lands here: finish the save.
  useEffect(() => {
    if (!user) return;
    const pending = readPending();
    if (!pending) return;
    try {
      sessionStorage.removeItem(PENDING_SCENARIO_KEY);
    } catch {
      /* ignore */
    }
    insertScenario(user.id, pending)
      .then(() => {
        toast.success("Your calculator scenario was saved");
        void queryClient.invalidateQueries({ queryKey: ["scenarios"] });
        void queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
      })
      .catch(() => toast.error("We couldn't save your calculator scenario. Please run it again."));
  }, [user, queryClient]);

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roi_calculations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Scenario deleted");
      void queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <header className="pt-2">
        <h1 className="type-display-lg">Saved scenarios</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Every ROI model you've saved, newest first.
        </p>
      </header>

      {error ? (
        <div className="glass-panel flex items-center gap-3 rounded-2xl p-5 text-sm text-destructive">
          <AlertTriangle className="size-4" /> Couldn't load scenarios: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <Layers className="size-6" />
          </span>
          <h2 className="type-heading-lg">No scenarios yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Run the calculator on the home page, then choose “Save scenario” to see it here.
          </p>
          <Button asChild className="press">
            <Link to="/" hash="calculator">
              Open the calculator
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data!.map((row) => {
            const results = (row.results ?? {}) as Record<string, number>;
            return (
              <div key={row.id} className="glass-panel glass-hover rounded-2xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 truncate font-semibold">{row.name}</h3>
                  {canEdit ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="-mr-2 -mt-1 size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${row.name}`}
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm(`Delete “${row.name}”?`)) remove.mutate(row.id);
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {row.notes ||
                    new Date(row.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-xl font-semibold tracking-tight">
                      {formatCurrency(Number(results["extraRevenueYear"] ?? 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">Extra revenue / year</div>
                  </div>
                  <div className="text-sm font-medium text-success">
                    {Math.round(Number(results["roiPercent"] ?? 0))}% ROI
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
