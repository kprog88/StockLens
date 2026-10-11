import { CONFIG } from '../config';
import type { Check, CompanyData, SectionResult } from '../types';
import { cagr, clamp, fiscalYears, growth, ltmRevenueGrowth, pct } from '../util';

const SCALE: SectionResult['scaleLabels'] = ['Low', 'Below avg', 'Average', 'Above avg', 'High'];

export function scoreGrowth(d: CompanyData): SectionResult {
  const years = fiscalYears(d.annuals);
  const n = years.length;
  const last = years[n - 1]!;
  const at = (back: number) => years[Math.max(0, n - 1 - back)]!;
  const span = (back: number) => Math.min(back, n - 1);

  const rev1 = growth(at(1).revenue, last.revenue);
  const rev3 = cagr(at(3).revenue, last.revenue, span(3));
  const rev5 = cagr(at(5).revenue, last.revenue, span(5));
  const eps1 = at(1).eps > 0 ? growth(at(1).eps, last.eps) : null;
  const eps3 = cagr(at(3).eps, last.eps, span(3));
  const eps5 = cagr(at(5).eps, last.eps, span(5));

  const T = CONFIG.growth.revenueCagr;
  const r3 = rev3 ?? rev1;
  // Scored on revenue only: EPS leverage is explained to the user but not
  // scored, because margin expansion can reverse.
  const score = clamp(r3 >= T[0] ? 5 : r3 >= T[1] ? 4 : r3 >= T[2] ? 3 : r3 >= T[3] ? 2 : 1, 1, 5);
  const leverage = eps3 !== null && eps3 - r3 >= CONFIG.growth.epsLeverageBonus;

  const q = d.qualitative;
  const industry: Check = {
    id: 'industry',
    question: 'Is the industry growing?',
    rating: q.industryGrowth === null ? null : q.industryGrowth === 'fast' ? 'good' : q.industryGrowth === 'moderate' ? 'mid' : 'bad',
    options: ['Slowly', 'Moderately', 'Fast'],
    label: q.industryGrowth === null ? 'Unknown' : q.industryGrowth === 'fast' ? 'Fast' : q.industryGrowth === 'moderate' ? 'Moderately' : 'Slowly',
    explanation: 'A growing industry lifts every company in it; a slow one means growth must be taken from rivals.',
    terms: ['industry-growth'],
  };
  const offerings: Check = {
    id: 'offerings',
    question: 'Room for new offerings?',
    rating: q.newOfferingsRoom === null ? null : q.newOfferingsRoom === 'likely' ? 'good' : q.newOfferingsRoom === 'possible' ? 'mid' : 'bad',
    options: ['Unlikely', 'Possible', 'Likely'],
    label: q.newOfferingsRoom === null ? 'Unknown' : q.newOfferingsRoom[0]!.toUpperCase() + q.newOfferingsRoom.slice(1),
    explanation: 'New products or markets can restart growth when the core business matures.',
    terms: [],
  };

  const ltmGrowth = ltmRevenueGrowth(d.annuals, d.quarters);
  return {
    id: 'growth',
    title: 'Growth',
    score,
    label: SCALE[score - 1]!,
    scaleLabels: SCALE,
    checks: [industry, offerings],
    metrics: [
      { id: 'rev1', label: 'Revenue 1Y', value: rev1, display: pct(rev1), term: 'cagr' },
      { id: 'rev3', label: 'Revenue 3Y', value: rev3, display: pct(rev3), term: 'cagr' },
      { id: 'rev5', label: 'Revenue 5Y', value: rev5, display: pct(rev5), term: 'cagr' },
      { id: 'eps1', label: 'Earnings 1Y', value: eps1, display: pct(eps1), term: 'eps' },
      { id: 'eps3', label: 'Earnings 3Y', value: eps3, display: pct(eps3), term: 'eps' },
      { id: 'eps5', label: 'Earnings 5Y', value: eps5, display: pct(eps5), term: 'eps' },
    ],
    explanation: `Revenue grew ${pct(r3)} a year over the last three years${
      leverage ? `, while earnings per share grew ${pct(eps3)} a year — margins are expanding` : ''}. The latest twelve months show ${pct(ltmGrowth)}.`,
    soWhat: leverage
      ? 'Earnings growing faster than sales means each new dollar of revenue is more profitable — a powerful driver of the share price.'
      : score >= 4
        ? 'Steady above-average growth compounds: the business keeps getting bigger even if the valuation multiple stays flat.'
        : 'With slower growth, most of your return will have to come from the price you pay and cash returned to you.',
    confidence: [industry, offerings].filter((c) => c.rating !== null).length / 4 + 0.5,
    rules: [`growth.rev3.${score}`, leverage ? 'growth.epsLeverage' : 'growth.noLeverage'],
  };
}
