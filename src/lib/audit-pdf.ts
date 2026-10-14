import { PDFDocument, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import regularUrl from "@/assets/fonts/DejaVuSans.ttf?url";
import boldUrl from "@/assets/fonts/DejaVuSans-Bold.ttf?url";
import {
  formatCurrency,
  formatNumber,
  type Currency,
  type ProfitInputs,
  type ProfitResults,
  type RoiInputs,
  type RoiResults,
} from "@/lib/roi";

type ReportArgs = {
  currency: Currency;
  inputs: RoiInputs;
  results: RoiResults;
  profitInputs: ProfitInputs | null;
  profit: ProfitResults | null;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT = 46;
const RIGHT = PAGE_WIDTH - 46;
const CONTENT_WIDTH = RIGHT - LEFT;

export async function downloadAuditPdf({ currency, inputs, results, profitInputs, profit }: ReportArgs) {
  if (!inputs || !results) throw new Error("Calculate ROI before creating a report.");

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regularBytes, boldBytes] = await Promise.all([
    fetch(regularUrl).then((response) => {
      if (!response.ok) throw new Error("The report font could not be loaded.");
      return response.arrayBuffer();
    }),
    fetch(boldUrl).then((response) => {
      if (!response.ok) throw new Error("The report font could not be loaded.");
      return response.arrayBuffer();
    }),
  ]);
  const body = await doc.embedFont(regularBytes, { subset: true });
  const strong = await doc.embedFont(boldBytes, { subset: true });

  const colors = {
    navy: rgb(0.075, 0.10, 0.17),
    ink: rgb(0.15, 0.19, 0.27),
    muted: rgb(0.40, 0.45, 0.53),
    gold: rgb(0.76, 0.61, 0.34),
    blue: rgb(0.22, 0.31, 0.67),
    pale: rgb(0.95, 0.96, 0.98),
    line: rgb(0.85, 0.87, 0.90),
    white: rgb(1, 1, 1),
    green: rgb(0.12, 0.43, 0.31),
    red: rgb(0.68, 0.20, 0.20),
  };
  const money = (value: number) => formatCurrency(value, false, currency);
  const date = new Intl.DateTimeFormat("en-GB", { dateStyle: "long" }).format(new Date());
  const pages: PDFPage[] = [];
  let page: PDFPage;
  let y = 0;

  const addPage = (withBanner = false) => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    if (withBanner) {
      page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 142, width: PAGE_WIDTH, height: 142, color: colors.navy });
      page.drawText("Capital Peek", { x: LEFT, y: PAGE_HEIGHT - 44, size: 13, font: strong, color: colors.gold });
      page.drawText("ROI & BUSINESS PLAN REPORT", { x: LEFT, y: PAGE_HEIGHT - 79, size: 21, font: strong, color: colors.white });
      page.drawText("A plain-language view of your sales improvement estimate", {
        x: LEFT, y: PAGE_HEIGHT - 105, size: 9, font: body, color: rgb(0.82, 0.85, 0.90),
      });
      page.drawText(`Prepared ${date}`, { x: LEFT, y: PAGE_HEIGHT - 126, size: 8, font: body, color: rgb(0.82, 0.85, 0.90) });
      y = PAGE_HEIGHT - 174;
    } else {
      page.drawText("CAPITAL PEEK  /  ROI REPORT", { x: LEFT, y: PAGE_HEIGHT - 42, size: 9, font: strong, color: colors.blue });
      page.drawLine({ start: { x: LEFT, y: PAGE_HEIGHT - 53 }, end: { x: RIGHT, y: PAGE_HEIGHT - 53 }, thickness: 0.8, color: colors.line });
      y = PAGE_HEIGHT - 78;
    }
  };

  const ensureSpace = (height: number) => {
    if (y - height < 68) addPage();
  };

  const drawText = (value: string, x = LEFT, size = 9, font: PDFFont = body, color = colors.ink) => {
    page.drawText(value, { x, y, size, font, color });
  };

  const wrap = (value: string, font: PDFFont, size: number, maxWidth: number) => {
    const words = value.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth || !current) current = candidate;
      else { lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    return lines;
  };

  const paragraph = (value: string, options: { size?: number; color?: typeof colors.ink; indent?: number; gap?: number } = {}) => {
    const size = options.size ?? 9;
    const color = options.color ?? colors.ink;
    const indent = options.indent ?? 0;
    const gap = options.gap ?? 4;
    const lines = wrap(value, body, size, CONTENT_WIDTH - indent);
    ensureSpace(lines.length * (size + 4) + gap);
    for (const line of lines) {
      drawText(line, LEFT + indent, size, body, color);
      y -= size + 4;
    }
    y -= gap;
  };

  const heading = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 42 : 28);
    y -= 2;
    drawText(title.toUpperCase(), LEFT, 9, strong, colors.blue);
    y -= 17;
    if (subtitle) {
      paragraph(subtitle, { size: 8, color: colors.muted, gap: 6 });
    }
  };

  const row = (label: string, value: string, emphasize = false) => {
    ensureSpace(25);
    const labelFont = emphasize ? strong : body;
    const valueFont = strong;
    const labelSize = emphasize ? 9.5 : 8.5;
    const valueSize = emphasize ? 9.5 : 8.5;
    const maxLabelWidth = CONTENT_WIDTH * 0.54;
    const labelLines = wrap(label, labelFont, labelSize, maxLabelWidth);
    const valueWidth = valueFont.widthOfTextAtSize(value, valueSize);
    const lineHeight = Math.max(labelLines.length * 11, 11);
    ensureSpace(lineHeight + 10);
    labelLines.forEach((line, index) => {
      page.drawText(line, { x: LEFT + 7, y: y - index * 11, size: labelSize, font: labelFont, color: colors.ink });
    });
    page.drawText(value, {
      x: Math.max(LEFT + CONTENT_WIDTH * 0.60, RIGHT - valueWidth - 7),
      y,
      size: valueSize,
      font: valueFont,
      color: emphasize ? (results.extraRevenueYear >= 0 ? colors.blue : colors.red) : colors.ink,
    });
    y -= lineHeight + 6;
    page.drawLine({ start: { x: LEFT, y }, end: { x: RIGHT, y }, thickness: 0.45, color: colors.line });
    y -= 8;
  };

  const callout = (label: string, value: string, explanation: string) => {
    ensureSpace(68);
    page.drawRectangle({ x: LEFT, y: y - 53, width: CONTENT_WIDTH, height: 57, color: colors.pale });
    drawText(label.toUpperCase(), LEFT + 12, 7.5, strong, colors.muted);
    page.drawText(value, { x: LEFT + 12, y: y - 30, size: 16, font: strong, color: colors.blue });
    page.drawText(explanation, { x: LEFT + 12, y: y - 44, size: 7.5, font: body, color: colors.muted });
    y -= 70;
  };

  addPage(true);
  heading("01 / Executive summary", "A quick explanation of what your current calculator inputs suggest.");
  paragraph(
    `Based on the figures entered, Capital Peek estimates ${money(results.extraRevenueYear)} in additional sales revenue over 12 months if sales performance improves by ${formatNumber(inputs.improvement)}%. This is a scenario, not a promise of future results.`,
    { size: 9.5, gap: 7 },
  );
  callout("Estimated additional revenue per year", money(results.extraRevenueYear), "Difference between the current and improved sales scenarios.");
  callout("Estimated sales ROI", `${formatNumber(results.roiPercent, 1)}%`, "Additional revenue compared with current annual sales and team costs; not profit ROI.");
  callout("Revenue-based payback estimate", results.paybackMonths > 0 ? `${formatNumber(results.paybackMonths, 1)} months` : "Not available", "Uses additional revenue, not profit or cash collected.");

  heading("02 / Your inputs", "These are the values used by the calculator to produce the estimate.");
  row("Monthly sales and marketing spend", money(inputs.monthlySpend));
  row("New leads each month", formatNumber(inputs.leadsPerMonth));
  row("Leads that become sales opportunities", `${formatNumber(inputs.leadToOpp, 1)}%`);
  row("Opportunities that become customers", `${formatNumber(inputs.winRate, 1)}%`);
  row("Average value of one sale", money(inputs.avgDealSize));
  row("Average time to close a sale", `${formatNumber(inputs.salesCycleDays)} days`);
  row("Sales team members", formatNumber(inputs.salesReps));
  row("Monthly cost per salesperson", money(inputs.costPerRep));
  row("Current yearly recurring revenue / annual revenue input", money(inputs.currentArr));
  row("Expected sales improvement", `${formatNumber(inputs.improvement, 1)}%`);

  heading("03 / Sales projection", "A comparison of the current sales scenario and the improved scenario.");
  row("Estimated qualified opportunities each month", formatNumber(results.monthlyOpps, 1));
  row("Estimated deals closed each month today", formatNumber(results.monthlyDeals, 1));
  row("Estimated deals closed each month after improvement", formatNumber(results.improvedMonthlyDeals, 1));
  row("Estimated additional deals each year", formatNumber(results.extraDealsPerYear, 1));
  row("Estimated yearly revenue today", money(results.baselineRevenueYear));
  row("Estimated yearly revenue after improvement", money(results.improvedRevenueYear));
  row("Estimated additional yearly revenue", money(results.extraRevenueYear), true);
  row("Current annual sales and team investment", money(results.annualInvestment));
  row("Estimated new annual recurring revenue (input + uplift)", money(results.newArr));

  heading("04 / Optional profit estimate", "Profit is shown only when all three profit assumptions have been entered.");
  if (profit && profitInputs) {
    row("Share remaining after delivery costs (gross margin)", `${formatNumber(profitInputs.grossMargin, 1)}%`);
    row("Variable selling costs", `${formatNumber(profitInputs.variableSalesCost, 1)}%`);
    row("Additional yearly fixed investment", money(profitInputs.incrementalAnnualCost));
    row("Gross profit on additional revenue", money(profit.grossProfit));
    row("Less: variable selling costs", money(-profit.variableCost));
    row("Less: additional yearly fixed investment", money(-profit.incrementalAnnualCost));
    row("Estimated additional net profit / (loss)", money(profit.netProfit), true);
    row("Estimated net margin on additional revenue", `${formatNumber(profit.netMargin, 1)}%`);
    row("Profit payback estimate", profit.profitPaybackMonths ? `${formatNumber(profit.profitPaybackMonths, 1)} months` : "Not available");
  } else {
    paragraph("Not included. To estimate additional profit, enter gross margin, variable selling cost, and additional yearly investment in the Net Profit / Margin section of the calculator.", { size: 8.5, color: colors.muted });
  }

  heading("05 / Formulas used", "The report uses the same formulas as the Capital Peek calculator.");
  paragraph("Qualified opportunities per month = monthly leads × lead-to-opportunity rate.");
  paragraph("Deals per month = qualified opportunities × win rate.");
  paragraph("Yearly revenue = deals per month × average deal value × 12.");
  paragraph("Additional yearly revenue = improved yearly revenue − current estimated yearly revenue.");
  paragraph("Annual sales and team investment = (monthly sales/marketing spend + sales team size × monthly cost per salesperson) × 12.");
  paragraph("Sales ROI = additional yearly revenue ÷ annual sales and team investment × 100. This is a revenue-based planning indicator, not a profit-based return.");
  if (profit && profitInputs) {
    paragraph("Estimated net profit = (additional yearly revenue × gross margin) − (additional yearly revenue × variable selling cost) − additional yearly fixed investment.");
  }

  heading("06 / Assumptions and limitations", "Read these points before using the report to make a financial decision.");
  paragraph(`The model assumes a ${formatNumber(inputs.improvement, 1)}% improvement in sales performance and applies it to the current estimated deal volume. Results depend on the accuracy of the inputs and whether that improvement can be achieved.`);
  paragraph("The payback estimate compares annual sales/team investment with additional revenue. It does not represent cash-flow payback and does not account for the timing of invoices or customer payments.");
  paragraph("Unless explicitly entered in the optional profit section, the model does not deduct delivery costs, taxes, financing charges, refunds, overhead, or other business expenses. Existing annual spend is used in the sales ROI denominator; it is not a full accounting profit calculation.");
  paragraph("The recurring revenue input is shown as entered and combined with the calculated revenue uplift for the new annual recurring revenue indicator. For non-subscription businesses, treat this indicator as a planning approximation.");
  paragraph("This report is generated from user-provided assumptions for planning and discussion. It is not financial, tax, legal, or investment advice, and it is not a formal accounting statement.", { size: 8.5, color: colors.muted, gap: 2 });

  // Footer and page numbering are added after all content pages exist.
  pages.forEach((p, index) => {
    p.drawLine({ start: { x: LEFT, y: 48 }, end: { x: RIGHT, y: 48 }, thickness: 0.6, color: colors.line });
    p.drawText(`Capital Peek  |  ${currency}  |  Prepared ${date}`, { x: LEFT, y: 31, size: 7, font: body, color: colors.muted });
    const pageLabel = `${index + 1} / ${pages.length}`;
    p.drawText(pageLabel, { x: RIGHT - strong.widthOfTextAtSize(pageLabel, 7), y: 31, size: 7, font: strong, color: colors.muted });
  });

  const bytes = await doc.save();
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `Capital-Peek-ROI-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
