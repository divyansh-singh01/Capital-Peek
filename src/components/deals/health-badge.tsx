import type { Health } from "@/lib/deal-health";
import { cn } from "@/lib/utils";

export function HealthBadge({ health, showScore = false }: { health: Health; showScore?: boolean }) {
  const tone =
    health.status === "healthy"
      ? "bg-success/12 text-success"
      : health.status === "attention"
        ? "bg-warning/15 text-warning"
        : health.status === "risk"
          ? "bg-destructive/12 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
      <span className="size-1.5 rounded-full bg-current" />
      {health.label}
      {showScore && health.status !== "closed" ? <span className="num opacity-80">· {health.score}</span> : null}
    </span>
  );
}
