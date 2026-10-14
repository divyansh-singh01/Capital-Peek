import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeIndianRupee, Check, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/roi";

export const Route = createFileRoute("/_authenticated/dashboard/payments")({
  component: Payments,
});

type Submission = {
  id: string;
  client_name: string;
  amount: number;
  currency: string;
  utr: string | null;
  proof_path: string | null;
  plan: string | null;
  status: string;
  created_at: string;
  contact: string | null;
  verified_at: string | null;
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  verified: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  rejected: "bg-destructive/15 text-destructive",
};

function Payments() {
  const queryClient = useQueryClient();
  const [proofBusy, setProofBusy] = useState<string | null>(null);
  const { user } = useSession();
  const { data: roles } = useRoles(user);
  // Payment records are only visible to platform staff (admin / sales manager); the database enforces it.
  const canReview = !!roles && (roles.includes("admin") || roles.includes("sales_manager"));

  const { data, isLoading, error } = useQuery({
    queryKey: ["payment-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_submissions")
        .select("id, client_name, amount, currency, utr, proof_path, plan, status, created_at, contact, verified_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Submission[];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("payment_submissions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "verified" ? "Payment verified" : "Payment rejected");
      void queryClient.invalidateQueries({ queryKey: ["payment-submissions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openProof = async (row: Submission) => {
    if (!row.proof_path) return;
    setProofBusy(row.id);
    try {
      const { data, error } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(row.proof_path, 300);
      if (error) throw error;
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open the screenshot.");
    } finally {
      setProofBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 sm:p-8">
        <h1 className="type-display-lg">Payments</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Review UPI payments your clients submitted and confirm the ones that arrived.
        </p>
      </div>

      {error ? (
        <div className="glass-panel rounded-2xl p-5 text-sm text-destructive">
          Couldn't load payments: {(error as Error).message}
        </div>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="glass-panel flex flex-col items-center gap-3 rounded-3xl p-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <BadgeIndianRupee className="size-6" />
          </span>
          <h2 className="type-heading-lg">
            {canReview ? "No payments submitted yet" : "Payments are admin-only"}
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            {canReview
              ? "When a client pays with the QR code and confirms, their details appear here."
              : "Your account has view-only access. Ask an admin or sales manager to review payments."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {data!.map((row) => (
            <div
              key={row.id}
              className="glass-panel glass-hover flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{row.client_name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                      STATUS_TONE[row.status] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {row.status}
                  </span>
                  {row.plan ? (
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">
                      {row.plan}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Reference: {row.utr || "not provided"} · {row.contact || "no contact"} ·{" "}
                  {new Date(row.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="mr-2 text-lg font-semibold tracking-tight">
                  {formatCurrency(Number(row.amount), false, row.currency === "USD" ? "USD" : "INR")}
                </div>
                {row.proof_path ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="press"
                    disabled={proofBusy === row.id}
                    onClick={() => void openProof(row)}
                  >
                    <ExternalLink className="size-4" />
                    {proofBusy === row.id ? "Opening…" : "Screenshot"}
                  </Button>
                ) : null}
                {row.status !== "verified" ? (
                  <Button
                    size="sm"
                    className="press"
                    disabled={setStatus.isPending}
                    onClick={() => {
                      // Verified payments are final (enforced in the database), so confirm first.
                      if (
                        confirm(
                          `Verify ${formatCurrency(Number(row.amount), false, row.currency === "USD" ? "USD" : "INR")} from ${row.client_name}? This cannot be undone.`,
                        )
                      )
                        setStatus.mutate({ id: row.id, status: "verified" });
                    }}
                  >
                    <Check className="size-4" /> Verify
                  </Button>
                ) : null}
                {row.status === "pending" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="press"
                    disabled={setStatus.isPending}
                    onClick={() => setStatus.mutate({ id: row.id, status: "rejected" })}
                  >
                    <X className="size-4" /> Reject
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
