import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-auth";
import type { RoiInputs, RoiResults } from "@/lib/roi";
import {
  PENDING_SCENARIO_KEY,
  defaultScenarioName,
  insertScenario,
  type PendingScenario,
} from "@/lib/scenarios";

export function SaveScenario({ inputs, results }: { inputs: RoiInputs; results: RoiResults }) {
  const { user, loading } = useSession();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to save scenarios.");
      await insertScenario(user.id, { name, inputs, results });
    },
    onSuccess: () => {
      setSaved(true);
      toast.success("Scenario saved to your dashboard");
      void queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: Error) =>
      toast.error(e.message || "Couldn't save the scenario. Please try again."),
  });

  // Signed-out visitors keep their numbers: stash them, sign in, and the dashboard saves them.
  const stash = () => {
    try {
      sessionStorage.setItem(
        PENDING_SCENARIO_KEY,
        JSON.stringify({ name, inputs, results } satisfies PendingScenario),
      );
    } catch {
      /* storage can be unavailable (private mode); the visitor can still re-run the calculator */
    }
  };

  if (saved) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-success/40 bg-card/70 p-4 text-sm">
        <CheckCircle2 className="size-5 text-success" />
        <span>
          Saved.{" "}
          <Link
            to="/dashboard/scenarios"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            View saved scenarios
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Save className="size-4 text-primary" />
        Save this scenario
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Save this plan so you can revisit it and compare the estimate with the revenue you actually close.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Give this plan a name (optional)"
          maxLength={200}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {user ? (
          <Button
            className="press shrink-0"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save scenario"}
          </Button>
        ) : (
          <Button asChild className="press shrink-0" disabled={loading} onClick={stash}>
            <Link to="/auth" search={{ redirect: "/dashboard/scenarios" }}>
              Sign in to save
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
