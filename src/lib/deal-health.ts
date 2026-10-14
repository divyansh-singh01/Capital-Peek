// Pure, rule-based deal intelligence. Transparent scoring — not machine learning.

export const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "qualified", label: "Qualified" },
  { key: "proposal", label: "Proposal" },
  { key: "negotiation", label: "Negotiation" },
  { key: "contract", label: "Contract" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
] as const;

export type Stage = (typeof STAGES)[number]["key"];

export const DEFAULT_PROBABILITY: Record<Stage, number> = {
  lead: 10, qualified: 25, proposal: 50, negotiation: 70, contract: 90, won: 100, lost: 0,
};

export type DealLike = {
  value: number;
  probability: number;
  stage: Stage;
  expected_close_date: string | null;
  next_action: string | null;
  next_action_due: string | null;
  stage_changed_at: string;
  last_activity_at: string;
  created_at: string;
  won_at?: string | null;
};

const DAY = 86_400_000;
const daysSince = (iso: string, now: number) => Math.floor((now - new Date(iso).getTime()) / DAY);
const daysUntil = (iso: string, now: number) =>
  Math.ceil((new Date(iso + "T23:59:59").getTime() - now) / DAY);

export const expectedRevenue = (d: { value: number; probability: number }) =>
  (Number(d.value) || 0) * Math.min(100, Math.max(0, Number(d.probability) || 0)) / 100;

export type Health = {
  score: number;
  status: "healthy" | "attention" | "risk" | "closed";
  label: string;
  positives: string[];
  risks: string[];
};

export function dealHealth(d: DealLike, now = Date.now()): Health {
  if (d.stage === "won" || d.stage === "lost")
    return { score: d.stage === "won" ? 100 : 0, status: "closed", label: d.stage === "won" ? "Won" : "Lost", positives: [], risks: [] };

  let score = 70;
  const positives: string[] = [];
  const risks: string[] = [];
  const idle = daysSince(d.last_activity_at, now);
  const inStage = daysSince(d.stage_changed_at, now);

  if (idle <= 3) { score += 15; positives.push("Recent activity (last 3 days)"); }
  else if (idle >= 14) { score -= 30; risks.push(`No activity for ${idle} days`); }
  else if (idle >= 7) { score -= 15; risks.push(`No activity for ${idle} days`); }

  if (inStage >= 30) { score -= 15; risks.push(`Stuck in this stage for ${inStage} days`); }
  else if (inStage <= 7 && d.stage !== "lead") { score += 5; positives.push("Recently moved forward"); }

  if (["proposal", "negotiation", "contract"].includes(d.stage)) { score += 5; positives.push("Late-stage opportunity"); }

  if (d.next_action_due) {
    const due = daysUntil(d.next_action_due, now);
    if (due < 0) { score -= 15; risks.push(`Follow-up overdue by ${-due} day${due === -1 ? "" : "s"}`); }
    else { score += 5; positives.push(due === 0 ? "Follow-up planned today" : `Next step planned in ${due} day${due === 1 ? "" : "s"}`); }
  } else if (!d.next_action) { score -= 10; risks.push("No next step planned"); }

  if (d.expected_close_date) {
    const left = daysUntil(d.expected_close_date, now);
    if (left < 0) { score -= 20; risks.push(`Expected close date passed ${-left} days ago`); }
    else if (left <= 7 && idle > 3) { score -= 10; risks.push("Close date approaching with no recent follow-up"); }
  }

  score = Math.max(0, Math.min(100, score));
  const status = score >= 70 ? "healthy" : score >= 45 ? "attention" : "risk";
  return { score, status, label: status === "healthy" ? "Healthy" : status === "attention" ? "Needs attention" : "At risk", positives, risks };
}

export type Insight = { title: string; why: string; action: string; tone: "warn" | "info" | "good" };

export function dealInsights(d: DealLike, now = Date.now()): Insight[] {
  const out: Insight[] = [];
  if (d.stage === "won") {
    out.push({ title: "Deal won.", why: "Revenue is only real once it is contracted and collected.", action: "Create the contract so payments and actual ROI can be tracked.", tone: "good" });
    return out;
  }
  if (d.stage === "lost") return out;
  const idle = daysSince(d.last_activity_at, now);
  const inStage = daysSince(d.stage_changed_at, now);
  if (idle >= 7) out.push({ title: "Deal may be at risk.", why: `This opportunity has had no recorded activity for ${idle} days.`, action: "Follow up with the decision maker.", tone: "warn" });
  if (d.probability >= 60 && inStage >= 14) out.push({ title: "High probability, but stalled.", why: `Probability is ${d.probability}% yet the deal has stayed in ${cap(d.stage)} for ${inStage} days.`, action: "Identify the blocker and agree a decision date.", tone: "warn" });
  if (d.expected_close_date && daysUntil(d.expected_close_date, now) < 0) out.push({ title: "Close date has passed.", why: "Forecasts using this deal are now unreliable.", action: "Update the expected close date or probability.", tone: "warn" });
  if (!d.expected_close_date) out.push({ title: "No expected close date.", why: "Without a date this deal can't be forecast by period.", action: "Add an expected close date.", tone: "info" });
  if (out.length === 0) out.push({ title: "On track.", why: "Activity is recent and the next step is planned.", action: "Keep momentum with the planned next step.", tone: "good" });
  return out;
}

const SUGGESTED: Record<Stage, string> = {
  lead: "Qualify the lead — confirm budget and decision maker",
  qualified: "Schedule a demo",
  proposal: "Send the proposal",
  negotiation: "Review pricing and terms",
  contract: "Prepare and send the contract",
  won: "Create contract and follow up on payment",
  lost: "Record the loss reason",
};

export function nextBestAction(d: DealLike, now = Date.now()): { action: string; reason: string } {
  if (d.next_action) {
    const due = d.next_action_due ? daysUntil(d.next_action_due, now) : null;
    return { action: d.next_action, reason: due === null ? "Planned by your team." : due < 0 ? `Overdue by ${-due} day(s).` : due === 0 ? "Due today." : `Due in ${due} day(s).` };
  }
  const idle = daysSince(d.last_activity_at, now);
  if (idle >= 7 && d.stage !== "won" && d.stage !== "lost")
    return { action: "Follow up with the customer", reason: `No activity for ${idle} days.` };
  return { action: SUGGESTED[d.stage], reason: `Typical next step at the ${cap(d.stage)} stage.` };
}

export type PipelineSummary = {
  total: number; weighted: number; wonQuarter: number; lost: number; winRate: number | null; avgCycle: number | null; openCount: number;
};

export function pipelineSummary(deals: DealLike[], now = new Date()): PipelineSummary {
  const open = deals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const won = deals.filter((d) => d.stage === "won");
  const lost = deals.filter((d) => d.stage === "lost");
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
  const wonQuarter = won
    .filter((d) => new Date(d.won_at ?? d.stage_changed_at).getTime() >= qStart)
    .reduce((s, d) => s + Number(d.value), 0);
  const cycles = won.map((d) => (new Date(d.won_at ?? d.stage_changed_at).getTime() - new Date(d.created_at).getTime()) / DAY);
  return {
    total: open.reduce((s, d) => s + Number(d.value), 0),
    weighted: open.reduce((s, d) => s + expectedRevenue(d), 0),
    wonQuarter,
    lost: lost.reduce((s, d) => s + Number(d.value), 0),
    winRate: won.length + lost.length ? (won.length / (won.length + lost.length)) * 100 : null,
    avgCycle: cycles.length ? Math.max(0, Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length)) : null,
    openCount: open.length,
  };
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
