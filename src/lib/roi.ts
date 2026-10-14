export type RoiInputs = {
  monthlySpend: number;
  leadsPerMonth: number;
  leadToOpp: number; // %
  winRate: number; // %
  avgDealSize: number;
  salesCycleDays: number;
  salesReps: number;
  costPerRep: number;
  currentArr: number;
  improvement: number; // %
};

export const SAMPLE_INPUTS: RoiInputs = {
  monthlySpend: 18500,
  leadsPerMonth: 420,
  leadToOpp: 28,
  winRate: 22,
  avgDealSize: 14800,
  salesCycleDays: 47,
  salesReps: 6,
  costPerRep: 8200,
  currentArr: 1200000,
  improvement: 25,
};

export type RoiResults = {
  monthlyOpps: number;
  monthlyDeals: number;
  improvedMonthlyDeals: number;
  extraDealsPerYear: number;
  baselineRevenueYear: number;
  improvedRevenueYear: number;
  extraRevenueYear: number;
  annualInvestment: number;
  roiPercent: number;
  paybackMonths: number;
  efficiencyGain: number; // % revenue per rep uplift
  cac: number;
  improvedCac: number;
  ltv: number;
  ltvCac: number;
  improvedLtvCac: number;
  newArr: number;
  cycleDaysSaved: number;
};

export function calculateRoi(i: RoiInputs): RoiResults {
  const uplift = 1 + i.improvement / 100;
  const monthlyOpps = i.leadsPerMonth * (i.leadToOpp / 100);
  const monthlyDeals = monthlyOpps * (i.winRate / 100);
  const improvedMonthlyDeals = monthlyDeals * uplift;

  const baselineRevenueYear = monthlyDeals * i.avgDealSize * 12;
  const improvedRevenueYear = improvedMonthlyDeals * i.avgDealSize * 12;
  const extraRevenueYear = improvedRevenueYear - baselineRevenueYear;
  const extraDealsPerYear = (improvedMonthlyDeals - monthlyDeals) * 12;

  const monthlyInvestment = i.monthlySpend + i.salesReps * i.costPerRep;
  const annualInvestment = monthlyInvestment * 12;

  const roiPercent = annualInvestment > 0 ? (extraRevenueYear / annualInvestment) * 100 : 0;
  const paybackMonths = extraRevenueYear > 0 ? annualInvestment / (extraRevenueYear / 12) : 0;

  const revenuePerRep = i.salesReps > 0 ? baselineRevenueYear / i.salesReps : 0;
  const improvedRevenuePerRep = i.salesReps > 0 ? improvedRevenueYear / i.salesReps : 0;
  const efficiencyGain =
    revenuePerRep > 0 ? ((improvedRevenuePerRep - revenuePerRep) / revenuePerRep) * 100 : 0;

  const cac = monthlyDeals > 0 ? monthlyInvestment / monthlyDeals : 0;
  const improvedCac = improvedMonthlyDeals > 0 ? monthlyInvestment / improvedMonthlyDeals : 0;
  const ltv = i.avgDealSize * 3;
  const ltvCac = cac > 0 ? ltv / cac : 0;
  const improvedLtvCac = improvedCac > 0 ? ltv / improvedCac : 0;

  return {
    monthlyOpps,
    monthlyDeals,
    improvedMonthlyDeals,
    extraDealsPerYear,
    baselineRevenueYear,
    improvedRevenueYear,
    extraRevenueYear,
    annualInvestment,
    roiPercent,
    paybackMonths,
    efficiencyGain,
    cac,
    improvedCac,
    ltv,
    ltvCac,
    improvedLtvCac,
    newArr: i.currentArr + extraRevenueYear,
    cycleDaysSaved: i.salesCycleDays * (i.improvement / 100) * 0.6,
  };
}

export type ProfitInputs = {
  grossMargin: number; // % of additional revenue remaining after cost of delivery
  variableSalesCost: number; // % of additional revenue spent to acquire/service sales
  incrementalAnnualCost: number; // additional annual fixed investment, excluding existing spend
};

export type ProfitResults = {
  grossProfit: number;
  variableCost: number;
  incrementalAnnualCost: number;
  netProfit: number;
  contributionMargin: number;
  netMargin: number;
  profitRoi: number;
  profitPaybackMonths: number | null;
};

export function calculateProfit(revenue: number, p: ProfitInputs): ProfitResults {
  const grossProfit = revenue * p.grossMargin / 100;
  const variableCost = revenue * p.variableSalesCost / 100;
  const contribution = grossProfit - variableCost;
  const netProfit = contribution - p.incrementalAnnualCost;
  return {
    grossProfit,
    variableCost,
    incrementalAnnualCost: p.incrementalAnnualCost,
    netProfit,
    contributionMargin: p.grossMargin - p.variableSalesCost,
    netMargin: revenue > 0 ? netProfit / revenue * 100 : 0,
    profitRoi: p.incrementalAnnualCost > 0 ? netProfit / p.incrementalAnnualCost * 100 : 0,
    profitPaybackMonths: contribution > 0 && p.incrementalAnnualCost > 0
      ? p.incrementalAnnualCost / (contribution / 12)
      : null,
  };
}

export type Currency = "INR" | "USD";

export function formatCurrency(value: number, compact = false, currency: Currency = "INR"): string {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: compact && Math.abs(value) >= 1000 ? 1 : 0,
    notation: compact && Math.abs(value) >= 10000 ? "compact" : "standard",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export type CaseStudy = {
  id: string;
  company: string;
  industry: string;
  summary: string;
  beforeArr: string;
  afterArr: string;
  beforeWinRate: string;
  afterWinRate: string;
  beforeCycle: string;
  afterCycle: string;
  roi: string;
};

export const CASE_STUDIES: CaseStudy[] = [
  {
    id: "northwind",
    company: "Northwind Analytics",
    industry: "Data & BI",
    summary:
      "Rebuilt lead scoring and killed low-intent sources. Reps spent 9 more hours a week on qualified pipeline.",
    beforeArr: "$2.4M",
    afterArr: "$3.6M",
    beforeWinRate: "18%",
    afterWinRate: "27%",
    beforeCycle: "63 days",
    afterCycle: "44 days",
    roi: "312%",
  },
  {
    id: "atlas",
    company: "Atlas Fleet Systems",
    industry: "Logistics SaaS",
    summary:
      "Introduced a mutual action plan template across every enterprise deal and cut late-stage slippage in half.",
    beforeArr: "$5.1M",
    afterArr: "$7.4M",
    beforeWinRate: "21%",
    afterWinRate: "29%",
    beforeCycle: "88 days",
    afterCycle: "61 days",
    roi: "268%",
  },
  {
    id: "beacon",
    company: "Beacon HR Cloud",
    industry: "HR Tech",
    summary:
      "Moved SDR spend from paid search to partner-sourced pipeline and doubled opportunity quality.",
    beforeArr: "$980K",
    afterArr: "$1.7M",
    beforeWinRate: "16%",
    afterWinRate: "24%",
    beforeCycle: "51 days",
    afterCycle: "38 days",
    roi: "402%",
  },
  {
    id: "vertex",
    company: "Vertex Manufacturing",
    industry: "Industrial",
    summary:
      "Standardised discovery calls and pricing approvals. Discounting dropped 7 points with no volume loss.",
    beforeArr: "$8.3M",
    afterArr: "$10.1M",
    beforeWinRate: "24%",
    afterWinRate: "31%",
    beforeCycle: "104 days",
    afterCycle: "79 days",
    roi: "187%",
  },
  {
    id: "lumen",
    company: "Lumen Health",
    industry: "Healthcare IT",
    summary:
      "Focused the team on three ICP segments and retired everything else. Average deal size grew 38%.",
    beforeArr: "$3.2M",
    afterArr: "$4.9M",
    beforeWinRate: "19%",
    afterWinRate: "26%",
    beforeCycle: "72 days",
    afterCycle: "55 days",
    roi: "241%",
  },
  {
    id: "harbor",
    company: "Harbor Payments",
    industry: "Fintech",
    summary:
      "Added weekly pipeline inspection with ROI forecasts, giving the board a reliable 90-day revenue view.",
    beforeArr: "$6.7M",
    afterArr: "$9.2M",
    beforeWinRate: "23%",
    afterWinRate: "30%",
    beforeCycle: "58 days",
    afterCycle: "41 days",
    roi: "295%",
  },
];
