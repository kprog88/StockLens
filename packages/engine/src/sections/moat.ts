import { CONFIG } from '../config';
import type { CompanyData, MoatResult, MoatSources, MoatStrength, SectionResult } from '../types';
import { fiscalYears, grossMargin, lastFiscal, operatingMargin } from '../util';

const WIDTH: SectionResult['scaleLabels'] = ['None', 'Thin', 'Narrow', 'Broad', 'Wide'];
const DIRECTION = ['Narrowing', 'Eroding', 'Stable', 'Growing', 'Widening'] as const;
const NAMES: Record<keyof MoatSources, string> = {
  switchingCosts: 'Switching costs',
  networkEffects: 'Network effects',
  intangibleAssets: 'Intangible assets',
  lowCostProduction: 'Low-cost production',
  counterPositioning: 'Counter-positioning',
};
const TERMS: Record<keyof MoatSources, string> = {
  switchingCosts: 'switching-costs',
  networkEffects: 'network-effects',
  intangibleAssets: 'intangible-assets',
  lowCostProduction: 'low-cost-production',
  counterPositioning: 'counter-positioning',
};
const PTS: Record<MoatStrength, number> = { none: 0, weak: 1, moderate: 2, strong: 3 };

export function scoreMoat(d: CompanyData): MoatResult {
  const m = d.qualitative.moat;
  const keys = Object.keys(NAMES) as (keyof MoatSources)[];
  const pts = keys.map((k) => PTS[m[k] ?? 'none']);
  const best = Math.max(...pts);
  const solid = pts.filter((p) => p >= 2).length;
  const reviewed = keys.some((k) => m[k] !== null);

  // Width: the best source sets the base; several solid sources widen it.
  let width = best + 1; // none→1 … strong→4
  if (best === 3 && solid >= 2) width = 5;
  else if (best === 2 && solid >= 2) width = 4;

  // No source reviewed yet (typical for freshly added stocks): estimate from
  // sustained margins, capped at Narrow — margins hint at a moat, they don't prove one.
  const recent = fiscalYears(d.annuals).slice(-3);
  const avgOm = recent.reduce((a, y) => a + operatingMargin(y), 0) / recent.length;
  const gmNow = grossMargin(lastFiscal(d.annuals));
  if (!reviewed) {
    const P = CONFIG.moat.proxy;
    width = avgOm >= P.narrow.op && gmNow >= P.narrow.gross ? 3 : avgOm >= P.thin.op ? 2 : 1;
  }

  // Direction: 3-year gross-margin trend…
  const years = fiscalYears(d.annuals);
  const delta = (grossMargin(lastFiscal(d.annuals)) - grossMargin(years[Math.max(0, years.length - 4)]!)) * 100;
  const D = CONFIG.moat.direction;
  let direction = delta >= D.widening ? 5 : delta >= D.growing ? 4 : delta <= D.narrowing ? 1 : delta <= D.eroding ? 2 : 3;
  // …but rising margins alone do not prove a moat is growing: without a
  // strong source there is nothing to widen, so cap the upside at Stable.
  const capped = direction > 3 && best < 3;
  if (capped) direction = 3;

  const sources = keys.map((k) => ({
    id: k,
    name: NAMES[k],
    strength: m[k],
    evidence: d.qualitative.moatEvidence?.[k] ?? '',
  }));
  const disclosed = keys.filter((k) => m[k] !== null).length;
  const strongest = sources.filter((s) => PTS[s.strength ?? 'none'] === best && best > 0).map((s) => s.name.toLowerCase());

  return {
    id: 'moat',
    title: 'Moat',
    score: width,
    label: WIDTH[width - 1]!,
    scaleLabels: WIDTH,
    direction,
    directionLabel: DIRECTION[direction - 1]!,
    sources,
    checks: [],
    metrics: [{ id: 'gmDelta', label: 'Gross margin, 3-yr change', value: delta, display: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts`, term: 'gross-margin' }],
    explanation: !reviewed
      ? `No moat sources have been reviewed for ${d.name} yet, so this is estimated from margins: ${(avgOm * 100).toFixed(0)}% average operating margin and ${(gmNow * 100).toFixed(0)}% gross margin over the last three years. Treat it as a first guess.`
      : best === 0
      ? 'No durable advantage is evident: competitors can copy the product or win customers on price.'
      : `The moat rests on ${strongest.join(' and ')}. ${
        capped ? `Gross margin rose ${delta.toFixed(1)} points, but with no strong moat source that is not enough to call the moat growing.`
        : `Gross margin changed ${delta >= 0 ? '+' : ''}${delta.toFixed(1)} points over three years.`}`,
    soWhat: width >= 4
      ? 'A wide moat protects profits for years, so paying a fair price is usually fine.'
      : width === 3
        ? 'A narrow moat protects some profit, but rivals can still take share — the price you pay matters more.'
        : 'Without a moat, high profits attract competitors. Only buy at a clear discount.',
    confidence: reviewed ? disclosed / keys.length : 0.3,
    rules: [reviewed ? `moat.width.${width}` : `moat.proxy.${width}`, `moat.direction.${direction}${capped ? '.capped' : ''}`],
  };
}

export const MOAT_TERMS = TERMS;
