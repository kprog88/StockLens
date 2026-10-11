import { CONFIG } from '../config';
import type { CompanyData, Phase, PhaseResult, SectionResult } from '../types';
import { fcf, latest, ltmRevenueGrowth, money } from '../util';

const NAMES: Record<Phase, string> = {
  1: 'Startup', 2: 'Hyper growth', 3: 'Operating leverage', 4: 'Capital return', 5: 'Decline',
};
const SCALE: SectionResult['scaleLabels'] = ['Startup', 'Hyper growth', 'Operating leverage', 'Capital return', 'Decline'];

export function scorePhase(d: CompanyData): PhaseResult {
  const a = d.annuals;
  const cur = latest(a);
  const prev = a[a.length - 2]!;
  const prev2 = a[a.length - 3]!;
  const g = ltmRevenueGrowth(a, d.quarters);
  const assetLight = cur.capex / cur.revenue < CONFIG.phase.assetLightCapex;
  const profit = assetLight ? cur.operatingCashFlow : fcf(cur);
  const profitable = profit > 0 && cur.netIncome > 0;
  const returning = cur.dividendsPaid + cur.buybacks > 0;
  const shrinking = cur.revenue < prev.revenue && prev.revenue < prev2.revenue;

  let phase: Phase;
  if (shrinking) phase = 5;
  else if (!profitable) phase = g >= CONFIG.phase.hyperGrowthRevenue ? 2 : 1;
  else phase = returning ? 4 : 3;

  const profitMetric: PhaseResult['profitMetric'] =
    phase <= 2 ? 'revenue' : assetLight ? 'operatingCashFlow' : 'freeCashFlow';
  const profitOf = (x: typeof cur) =>
    profitMetric === 'operatingCashFlow' ? x.operatingCashFlow : profitMetric === 'freeCashFlow' ? fcf(x) : x.netIncome;

  const returnTxt = cur.dividendsPaid > 0 && cur.buybacks > 0 ? 'dividends and buybacks'
    : cur.dividendsPaid > 0 ? 'dividends only' : cur.buybacks > 0 ? 'buybacks only' : 'none yet';
  const ok = (b: boolean): 'good' | 'bad' => (b ? 'good' : 'bad');

  return {
    id: 'phase',
    title: 'Phase',
    score: phase,
    label: NAMES[phase],
    scaleLabels: SCALE,
    phase,
    phaseName: NAMES[phase],
    profitMetric,
    series: a.map((x) => ({ period: x.period, revenue: x.revenue, profit: profitOf(x) })),
    checks: [
      { id: 'growing', question: 'Is revenue growing?', rating: ok(g > 0), options: ['No', '', 'Yes'], label: g > 0 ? 'Yes' : 'No',
        explanation: `${g >= 0 ? '+' : ''}${(g * 100).toFixed(0)}% in the last year`, terms: ['revenue'] },
      { id: 'profitable', question: 'Is it profitable?', rating: ok(profitable), options: ['No', '', 'Yes'], label: profitable ? 'Yes' : 'No',
        explanation: `${money(profit, d.currency)} ${assetLight ? 'operating cash flow' : 'free cash flow'}${profit > profitOf(prev) ? ', and rising' : ''}`,
        terms: [assetLight ? 'operating-cash-flow' : 'free-cash-flow'] },
      { id: 'returning', question: 'Is it returning capital?', rating: ok(returning), options: ['No', '', 'Yes'], label: returning ? 'Yes' : 'No',
        explanation: returnTxt, terms: ['buybacks', 'dividend'] },
    ],
    metrics: [],
    explanation: `${d.name} is in phase ${phase} of 5 (${NAMES[phase]}). The best profit signal here is ${
      profitMetric === 'operatingCashFlow' ? 'operating cash flow, because it is an asset-light business'
      : profitMetric === 'freeCashFlow' ? 'free cash flow, because it has to keep investing in physical assets'
      : 'revenue growth, because profits are not there yet'}.`,
    soWhat: phase === 4
      ? 'Mature companies are valued on today\'s earnings, so Price-to-Earnings is a useful yardstick.'
      : phase <= 2
        ? 'Young companies are valued on sales and growth — earnings ratios mean little yet.'
        : phase === 3
          ? 'Profits are growing faster than sales. Watch whether margins keep expanding.'
          : 'Shrinking companies can look cheap for years. Cash returned matters more than growth.',
    confidence: 1,
    rules: [`phase.${phase}`],
  };
}
