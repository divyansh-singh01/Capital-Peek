import { createFileRoute } from "@tanstack/react-router";
import { ContractRoiCalculator } from "@/components/contract-roi/contract-roi-calculator";

export const Route = createFileRoute("/_authenticated/dashboard/contract-roi")({
  head: () => ({
    meta: [
      { title: "Contract ROI & Efficiency — CapitalPeek" },
      {
        name: "description",
        content:
          "Estimate the time, cost and compliance gains of moving contract handling to a structured workflow.",
      },
      { property: "og:title", content: "Contract ROI & Efficiency — CapitalPeek" },
      {
        property: "og:description",
        content: "Model contract handling savings, productivity and accuracy gains.",
      },
    ],
  }),
  component: ContractRoiPage,
});

function ContractRoiPage() {
  return (
    <div className="space-y-6">
      <header className="pt-2">
        <h1 className="type-display-lg">Contract ROI & Efficiency</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Switch from sales ROI to contract handling: enter your volumes and costs to see modelled savings.
        </p>
      </header>
      <ContractRoiCalculator />
    </div>
  );
}
