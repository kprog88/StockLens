// ---------------------------------------------------------------------------
// Inputs: everything the engine needs about one company.
// Numbers come from a data provider; qualitative fields come from filings
// (LLM-extracted, then reviewed) or an analyst. `null` means "not disclosed"
// and lowers confidence instead of being guessed.
// ---------------------------------------------------------------------------

export interface AnnualFinancials {
  /** Fiscal year label, e.g. "FY2025" or "LTM". */
  period: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  /** Diluted earnings per share. */
  eps: number;
  operatingCashFlow: number;
  capex: number;
  interestExpense: number;
  totalDebt: number;
  cash: number;
  dividendsPaid: number;
  buybacks: number;
}

export interface QuarterResult {
  period: string; // "Q3 2025"
  revenue: number;
  revenueEstimate: number | null;
  eps: number;
  epsEstimate: number | null;
}

export type Rating3 = 'bad' | 'mid' | 'good';
export type MoatStrength = 'none' | 'weak' | 'moderate' | 'strong';

export interface MoatSources {
  switchingCosts: MoatStrength | null;
  networkEffects: MoatStrength | null;
  intangibleAssets: MoatStrength | null;
  lowCostProduction: MoatStrength | null;
  counterPositioning: MoatStrength | null;
}

export interface Qualitative {
  /** Share of revenue that renews automatically (0–1). */
  recurringRevenueShare: number | null;
  /** Revenue change through the last real recession (e.g. -0.05). */
  recessionRevenueChange: number | null;
  /** true = customers need it even in bad times. */
  essentialSpend: boolean | null;
  /** Rank in its main market (1 = leader). */
  marketShareRank: number | null;
  /** A price rise happened without losing customers/volume. */
  priceRiseWithoutVolumeLoss: boolean | null;
  /** Biggest single customer as share of revenue (0–1). */
  topCustomerShare: number | null;
  disruptionThreat: 'yes' | 'some' | 'no' | null;
  outsideDependence: 'alot' | 'some' | 'little' | null;
  industryGrowth: 'slow' | 'moderate' | 'fast' | null;
  newOfferingsRoom: 'unlikely' | 'possible' | 'likely' | null;
  moat: MoatSources;
  /** One-line evidence per moat source, shown on the Moat card. */
  moatEvidence?: Partial<Record<keyof MoatSources, string>>;
  /** Named risks from the annual report, plain English. */
  disruptionNotes?: string[];
}

export interface Management {
  ceoName: string;
  ceoTitle: string;
  ceoTenureYears: number | null;
  insiderOwnershipPct: number | null; // 0–100
  insiderOwnershipValue: number | null; // in reporting currency
  employeeRating: number | null; // 0–5
}

export interface CompanyData {
  ticker: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  asOf: string; // ISO date
  /** Oldest first. At least 4 years; the last one may be "LTM". */
  annuals: AnnualFinancials[];
  /** Most recent 8 quarters, oldest first. */
  quarters: QuarterResult[];
  /** Weekly trailing P/E history over ~5 years, oldest first. */
  peHistory: number[];
  /** Weekly trailing P/S history over ~5 years, oldest first. */
  psHistory: number[];
  ratios: { pe: number | null; ps: number; pb: number | null; pfcf: number | null };
  qualitative: Qualitative;
  management: Management;
  /** Shown in the source line under every figure. */
  source: string;
  /** Per-share fundamentals, so a new live price can be re-scored instantly. */
  perShare?: { eps: number | null; sales: number; book: number | null; fcf: number | null };
  /** Company logo image from the data provider. */
  logoUrl?: string;
  /** Latest live quote, when the data came from a provider. */
  quote?: { changePct: number | null; at: string };
}

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export type SectionId = 'business' | 'phase' | 'moat' | 'growth' | 'management' | 'risk' | 'valuation';

export interface Check {
  id: string;
  question: string;
  rating: Rating3 | null;
  /** Word shown under the selected option, e.g. "Predictable". */
  label: string;
  /** The three option labels in bad → good order. */
  options: [string, string, string];
  explanation: string;
  /** Glossary terms this check relies on (for ⓘ chips). */
  terms: string[];
}

export interface Metric {
  id: string;
  label: string;
  value: number | null;
  display: string;
  term?: string;
}

export interface SectionResult {
  id: SectionId;
  title: string;
  score: number; // 1–5
  label: string; // e.g. "Above avg"
  scaleLabels: [string, string, string, string, string];
  checks: Check[];
  metrics: Metric[];
  explanation: string;
  soWhat: string;
  /** 0–1: share of inputs that were actually disclosed. */
  confidence: number;
  /** Rule id(s) that produced the score — for audit and backtests. */
  rules: string[];
}

export type Phase = 1 | 2 | 3 | 4 | 5;

export interface PhaseResult extends SectionResult {
  phase: Phase;
  phaseName: string;
  profitMetric: 'netIncome' | 'operatingCashFlow' | 'freeCashFlow' | 'revenue';
  series: { period: string; revenue: number; profit: number }[];
}

export interface MoatResult extends SectionResult {
  direction: number; // 1–5
  directionLabel: string;
  sources: { id: keyof MoatSources; name: string; strength: MoatStrength | null; evidence: string }[];
}

export interface ValuationResult extends SectionResult {
  metric: 'pe' | 'ps';
  current: number;
  history: number[];
  bands: { cheapBelow: number; average: number; expensiveAbove: number };
  /** Share price at which the multiple would hit each band edge. */
  bandPrices: { cheapBelow: number; average: number; expensiveAbove: number };
  percentile: number; // 0–100
}

export type Verdict = 'SELL' | 'PASS' | 'HOLD' | 'WATCH' | 'BUY';

export interface Trigger {
  to: Verdict;
  text: string;
}

export interface VerdictResult {
  verdict: Verdict;
  headline: string;
  quality: number; // weighted composite, 1–5, one decimal
  qualityLabel: string;
  valuationScore: number;
  confidence: number;
  explanation: string;
  triggers: Trigger[];
  bull: string[];
  bear: string[];
}

export interface Report {
  ticker: string;
  logoUrl?: string;
  name: string;
  exchange: string;
  currency: string;
  price: number;
  asOf: string;
  source: string;
  configVersion: string;
  business: SectionResult;
  phase: PhaseResult;
  moat: MoatResult;
  growth: SectionResult;
  management: SectionResult;
  risk: SectionResult;
  valuation: ValuationResult;
  verdict: VerdictResult;
}
