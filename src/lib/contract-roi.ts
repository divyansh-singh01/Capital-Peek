import type { Currency } from "@/lib/roi";

export type ContractHandling = "manual" | "semiAutomated";

export type EmployeeBand = "01-05" | "05-10" | "10-15" | "15-20" | "20-25";

export type Department =
  | "Human Resources"
  | "Finance"
  | "Legal"
  | "Sales"
  | "Procurement"
  | "Operations"
  | "Administration"
  | "Compliance"
  | "Other";

export const DEPARTMENTS: Department[] = [
  "Human Resources",
  "Finance",
  "Legal",
  "Sales",
  "Procurement",
  "Operations",
  "Administration",
  "Compliance",
  "Other",
];

/** Representative headcount used for each selectable band. Editable in one place. */
export const EMPLOYEE_BANDS: Record<EmployeeBand, number> = {
  "01-05": 3,
  "05-10": 7.5,
  "10-15": 12.5,
  "15-20": 17.5,
  "20-25": 22.5,
};

export const EMPLOYEE_BAND_KEYS = Object.keys(EMPLOYEE_BANDS) as EmployeeBand[];

/**
 * Model assumptions. These are modelling defaults, not industry benchmarks.
 * Centralised so they can be tuned without touching the UI.
 */
export const ASSUMPTIONS = {
  /** Share of contract handling time removable by moving to a structured workflow. */
  timeReduction: { manual: 0.35, semiAutomated: 0.18 } as Record<ContractHandling, number>,
  /** Share of renewal work that becomes tracked/visible under a structured workflow. */
  renewalCoverage: { manual: 0.55, semiAutomated: 0.8 } as Record<ContractHandling, number>,
  /** Modelled manual-handling error exposure as a share of contracts. */
  errorExposure: { manual: 0.08, semiAutomated: 0.04 } as Record<ContractHandling, number>,
  /** Share of sales closure time modelled as removable administrative delay. */
  closureReduction: { manual: 0.3, semiAutomated: 0.15 } as Record<ContractHandling, number>,
  /** Working hours used to convert a monthly salary into an hourly cost. */
  workingHoursPerMonth: 176,
  /** Productive hours available per employee per year. */
  productiveHoursPerYear: 1800,
};

export type ContractRoiInputs = {
  handling: ContractHandling;
  annualVolume: number;
  employeeBand: EmployeeBand;
  department: Department;
  avgHoursPerContract: number;
  avgMonthlySalary: number;
  renewalPercent: number;
  closureHours: number;
};

export const SAMPLE_CONTRACT_INPUTS: ContractRoiInputs = {
  handling: "manual",
  annualVolume: 300,
  employeeBand: "05-10",
  department: "Legal",
  avgHoursPerContract: 4,
  avgMonthlySalary: 40000,
  renewalPercent: 60,
  closureHours: 12,
};

export type ContractRoiResults = {
  employees: number;
  hourlyCost: number;
  annualContractHours: number;
  annualLabourCost: number;
  hoursSaved: number;
  hoursSavedPerEmployee: number;
  remainingHours: number;
  costSavings: number;
  labourCostReduction: number;
  productivityGainPercent: number;
  timePerContractBefore: number;
  timePerContractAfter: number;
  contractsPerEmployeeBefore: number;
  contractsPerEmployeeAfter: number;
  renewalContracts: number;
  renewalCoveragePercent: number;
  renewalHoursSaved: number;
  closureHoursBefore: number;
  closureHoursAfter: number;
  closureImprovementPercent: number;
  contractsNeedingAttention: number;
  processConsistencyPercent: number;
  manualErrorReductionPercent: number;
};

export type ContractRoiErrors = Partial<Record<keyof ContractRoiInputs, string>>;

export function validateContractRoi(i: ContractRoiInputs): ContractRoiErrors {
  const e: ContractRoiErrors = {};
  const num = (v: number) => Number.isFinite(v);
  if (!num(i.annualVolume) || i.annualVolume < 0) e.annualVolume = "Enter a volume of 0 or more.";
  if (!num(i.avgHoursPerContract) || i.avgHoursPerContract <= 0)
    e.avgHoursPerContract = "Enter more than 0 hours.";
  if (!num(i.avgMonthlySalary) || i.avgMonthlySalary < 0) e.avgMonthlySalary = "Enter 0 or more.";
  if (!num(i.renewalPercent) || i.renewalPercent < 0 || i.renewalPercent > 100)
    e.renewalPercent = "Must be between 0 and 100.";
  if (!num(i.closureHours) || i.closureHours < 0) e.closureHours = "Enter 0 or more hours.";
  return e;
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

export function calculateContractRoi(i: ContractRoiInputs): ContractRoiResults {
  const employees = EMPLOYEE_BANDS[i.employeeBand];
  const hourlyCost = safe(i.avgMonthlySalary / ASSUMPTIONS.workingHoursPerMonth);

  const annualContractHours = safe(i.annualVolume * i.avgHoursPerContract);
  const annualLabourCost = safe(annualContractHours * hourlyCost);

  const reduction = ASSUMPTIONS.timeReduction[i.handling];
  const hoursSaved = safe(annualContractHours * reduction);
  const remainingHours = Math.max(annualContractHours - hoursSaved, 0);
  const hoursSavedPerEmployee = employees > 0 ? safe(hoursSaved / employees) : 0;

  const labourCostReduction = safe(hoursSaved * hourlyCost);
  const costSavings = labourCostReduction;

  const capacity = employees * ASSUMPTIONS.productiveHoursPerYear;
  const productivityGainPercent = capacity > 0 ? safe((hoursSaved / capacity) * 100) : 0;

  const timePerContractBefore = i.avgHoursPerContract;
  const timePerContractAfter = safe(i.avgHoursPerContract * (1 - reduction));
  const contractsPerEmployeeBefore =
    employees > 0 ? safe(i.annualVolume / employees) : 0;
  // Same hours spent on contracts, faster handling → more contracts per employee.
  const contractsPerEmployeeAfter =
    timePerContractAfter > 0
      ? safe((contractsPerEmployeeBefore * timePerContractBefore) / timePerContractAfter)
      : 0;

  const renewalContracts = safe((i.annualVolume * i.renewalPercent) / 100);
  const renewalCoveragePercent = ASSUMPTIONS.renewalCoverage[i.handling] * 100;
  const renewalHoursSaved = safe(renewalContracts * i.avgHoursPerContract * reduction);

  const closureHoursBefore = i.closureHours;
  const closureReduction = ASSUMPTIONS.closureReduction[i.handling];
  const closureHoursAfter = safe(i.closureHours * (1 - closureReduction));
  const closureImprovementPercent = closureReduction * 100;

  const errorExposure = ASSUMPTIONS.errorExposure[i.handling];
  const contractsNeedingAttention = safe(i.annualVolume * errorExposure);
  const processConsistencyPercent = Math.min(
    100,
    safe((1 - errorExposure) * 100 * (0.7 + 0.3 * ASSUMPTIONS.renewalCoverage[i.handling])),
  );
  const manualErrorReductionPercent = reduction * 100;

  return {
    employees,
    hourlyCost,
    annualContractHours,
    annualLabourCost,
    hoursSaved,
    hoursSavedPerEmployee,
    remainingHours,
    costSavings,
    labourCostReduction,
    productivityGainPercent,
    timePerContractBefore,
    timePerContractAfter,
    contractsPerEmployeeBefore,
    contractsPerEmployeeAfter,
    renewalContracts,
    renewalCoveragePercent,
    renewalHoursSaved,
    closureHoursBefore,
    closureHoursAfter,
    closureImprovementPercent,
    contractsNeedingAttention,
    processConsistencyPercent,
    manualErrorReductionPercent,
  };
}

export const DEPARTMENT_GUIDANCE: Record<Department, string> = {
  "Human Resources":
    "Focus on renewal workflows and employee contract administration to reclaim the most hours.",
  Finance: "Focus on administrative cost visibility and renewal forecasting across contracts.",
  Legal: "Focus on review cycles and approval bottlenecks — they drive most of the modelled time.",
  Sales: "Focus on contract closure and turnaround time to shorten the path to signature.",
  Procurement: "Focus on supplier contract standardisation and renewal windows.",
  Operations: "Focus on hand-offs between teams where contract work waits in queues.",
  Administration: "Focus on document intake, filing consistency and renewal reminders.",
  Compliance: "Focus on process consistency and reducing manual handling exposure.",
  Other: "Use this analysis to find where contract administration consumes the most time.",
};

export type ContractCurrency = Currency;
