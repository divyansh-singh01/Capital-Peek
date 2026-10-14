# Capital Peek content implementation notes

## Customer-facing improvements
- Simplified the homepage headline, value proposition, feature descriptions, pricing intro, and getting-started steps.
- Reworded the sales ROI calculator title and instructions in plain language.
- Added short explanations below all ten sales calculator inputs.
- Clarified that the sales ROI shown is a planning indicator based on additional revenue and current annual sales/team costs, not a profit margin.
- Added context and limitations beside the results.
- Reworded the PDF download action and improved report headings, labels, explanations, and disclaimers.
- Clarified optional profit input fields and constrained margin percentages to 0–100 for calculations.
- Updated save-scenario and lead follow-up wording.
- Preserved the existing theme toggle, application features, calculator formulas, and integrations.

## Verification performed
- TypeScript/TSX syntax transpilation check: passed for all 101 source TypeScript files.
- JSON/package manifest inspection: passed.
- Production build, lint, type-check and browser interaction tests: not completed. Dependency installation could not complete because npm registry access timed out; offline installation reports that the `zustand@5.0.15` package is not cached. Do not treat this archive as production-build-certified until dependencies install and `npm run build` succeeds.

## Recommended local verification
1. Run `npm ci` in the project root with registry access.
2. Run `npm run build` and `npm run lint`.
3. Run `npm run dev` and test dark/light theme switching and persistence.
4. Enter sample sales figures, calculate, switch to profit view, then download and open the PDF.
5. Compare PDF values against the results shown on screen.
