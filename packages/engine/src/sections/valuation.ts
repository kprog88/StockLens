import { CONFIG } from '../config';
import type { CompanyData, Phase, SectionResult, ValuationResult } from '../types';
import { cagr, fiscalYears, ltmRevenueGrowth, mult, percentileRank, percentileValue } from '../util';

const SCALE: SectionResult['scaleLabels'] = ['Very expensive', 'Expensive', 'Fair value', 'Attractive', 'Very attractive'];

export function scoreValuation(d: CompanyData, phase: Phase): ValuationResult {
  const V = CONFIG.valuation;
  // Mature, profitable companies → P/E. Young or loss-making → P/S.
  const usePe = phase >= 3 && d.ratios.pe !== null && d.ratios.pe > 0 && d.peHistory.length > 20;
  const metric = usePe ? 'pe' : 'ps';
  const history = (usePe ? d.peHistory : d.psHistory).filter((x) => x > 0);
  const current = usePe ? d.ratios.pe! : d.ratios.ps;

  const rank = percentileRank(history, current);
  const cheap = percentileValue(history, V.cheap);
  const expensive = percentileValue(history, V.expensive);
  const average = history.reduce((a, b) => a + b, 0) / history.length;

  let score = rank < V.veryCheap ? 5 : rank < V.cheap ? 4 : rank <= V.expensive ? 3 : rank <= V.veryExpensive ? 2 : 1;
  // A stock with a very stable multiple can sit at an extreme percentile
  // while being only a few percent from normal. Don't overstate that.
  if (Math.abs(current / average - 1) < V.nearAverage) score = Math.min(4, Math.max(2, score));

  // Old multiples were paid for the old growth rate. If growth has slowed
  // meaningfully, "cheap versus history" may just be the market repricing.
  const years = fiscalYears(d.annuals);
  const recent = ltmRevenueGrowth(d.annuals, d.quarters);
  const past = cagr(years[Math.max(0, years.length - 4)]!.revenue, years[years.length - 1]!.revenue, Math.min(3, years.length - 1)) ?? recent;
  const decelerating = past - recent > V.decelerationCap;
  const capped = decelerating && score > 3;
  if (capped) score = 3;

  const toPrice = (m: number) => (d.price * m) / current;
  const name = usePe ? 'Price to Earnings' : 'Price to Sales';

  return {
    id: 'valuation',
    title: 'Valuation',
    score,
    label: SCALE[score - 1]!,
    scaleLabels: SCALE,
    metric,
    current,
    history,
    percentile: rank,
    bands: { cheapBelow: cheap, average, expensiveAbove: expensive },
    bandPrices: { cheapBelow: toPrice(cheap), average: toPrice(average), expensiveAbove: toPrice(expensive) },
    checks: [],
    metrics: [
      { id: 'pe', label: 'P/E', value: d.ratios.pe, display: mult(d.ratios.pe), term: 'pe-ratio' },
      { id: 'pfcf', label: 'P/FCF', value: d.ratios.pfcf, display: mult(d.ratios.pfcf), term: 'p-fcf' },
      { id: 'ps', label: 'P/S', value: d.ratios.ps, display: mult(d.ratios.ps), term: 'ps-ratio' },
      { id: 'pb', label: 'P/B', value: d.ratios.pb, display: mult(d.ratios.pb), term: 'pb-ratio' },
    ],
    explanation: `${d.name} is in phase ${phase}, so ${name} is the useful yardstick. At ${mult(current)} it sits at the ${Math.round(rank)}th percentile of its own 5-year range (average ${mult(average)}).${
      capped ? ` That looks cheap, but revenue growth slowed from ${(past * 100).toFixed(0)}% to ${(recent * 100).toFixed(0)}% a year, so the old multiples may no longer apply — scored Fair, not Cheap.` : ''}`,
    soWhat: capped
      ? 'The price is below its usual range, but slower growth can justify a lower multiple than in the past.'
      : score >= 4
        ? 'You are paying less than usual for each dollar of profit — a margin of safety if the business holds up.'
        : score === 3
          ? 'A fair price: your return will mostly track how fast the business grows.'
          : 'You are paying more than usual. Even good news may already be in the price.',
    confidence: history.length > 100 ? 1 : history.length / 100,
    rules: [`valuation.${metric}.p${Math.round(rank)}`, capped ? 'valuation.decelerationCap' : 'valuation.uncapped'],
  };
}

/** Share price that would put the stock at a given valuation score. */
export function priceForScore(v: ValuationResult, price: number, target: number): number {
  const V = CONFIG.valuation;
  const p = target >= 5 ? V.veryCheap : target === 4 ? V.cheap : target === 3 ? V.expensive : target === 2 ? V.veryExpensive : 100;
  return (price * percentileValue(v.history, p)) / v.current;
}
