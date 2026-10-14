import { supabase } from "@/integrations/supabase/client";
import type { RoiInputs, RoiResults } from "@/lib/roi";

export const PENDING_SCENARIO_KEY = "capitalpeek-pending-scenario";

export type PendingScenario = { name: string; inputs: RoiInputs; results: RoiResults };

export const defaultScenarioName = () =>
  `Scenario ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;

/** Insert a scenario for the signed-in user. The database stamps the workspace (company_id). */
export async function insertScenario(userId: string, s: PendingScenario) {
  const { error } = await supabase.from("roi_calculations").insert({
    user_id: userId,
    name: s.name.trim().slice(0, 200) || defaultScenarioName(),
    inputs: s.inputs as unknown as Record<string, number>,
    results: s.results as unknown as Record<string, number>,
  });
  if (error) throw error;
}
