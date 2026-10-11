import type { Report, SectionId, Verdict } from './types';
import { money } from './util';

export interface Change {
  ticker: string;
  kind: 'verdict' | 'section' | 'valuation-zone';
  from?: Verdict;
  to?: Verdict;
  headline: string;
  why: string;
}

const SECTIONS: SectionId[] = ['business', 'moat', 'growth', 'management', 'risk', 'valuation'];
const zone = (r: Report) =>
  r.price < r.valuation.bandPrices.cheapBelow ? 'cheap' : r.price > r.valuation.bandPrices.expensiveAbove ? 'expensive' : 'fair';

/** What changed between yesterday's and today's report — feeds the daily digest. */
export function diffReports(prev: Report, next: Report): Change[] {
  const out: Change[] = [];
  const moved = (s: SectionId) => next[s].score - prev[s].score;
  const changedSections = SECTIONS.filter((s) => moved(s) !== 0);

  if (prev.verdict.verdict !== next.verdict.verdict) {
    const driver = changedSections[0];
    out.push({
      ticker: next.ticker, kind: 'verdict', from: prev.verdict.verdict, to: next.verdict.verdict,
      headline: driver
        ? `${next[driver].title} moved from ${prev[driver].label.toLowerCase()} to ${next[driver].label.toLowerCase()}.`
        : `Quality moved from ${prev.verdict.quality.toFixed(1)} to ${next.verdict.quality.toFixed(1)}.`,
      why: next.verdict.explanation,
    });
  }
  const zPrev = zone(prev);
  const zNext = zone(next);
  if (zPrev !== zNext) {
    out.push({
      ticker: next.ticker, kind: 'valuation-zone',
      headline: `Price ${money(next.price, next.currency)} moved into the ${zNext} zone of its 5-year range.`,
      why: zNext === 'cheap'
        ? 'You pay less than usual for the same profit — a better entry point if the business stays strong.'
        : zNext === 'expensive'
          ? 'You pay more than usual for the same profit, so good news may already be in the price.'
          : 'The price is back within its normal range.',
    });
  }
  for (const s of changedSections) {
    if (out.some((c) => c.kind === 'verdict' && c.headline.startsWith(next[s].title))) continue;
    out.push({
      ticker: next.ticker, kind: 'section',
      headline: `${next[s].title}: ${prev[s].label} → ${next[s].label}.`,
      why: next[s].soWhat,
    });
  }
  return out;
}
