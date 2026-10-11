import { CONFIG } from './config';
import type { CompanyData, Report, Trigger, Verdict, VerdictResult } from './types';
import { money, round1 } from './util';
import { priceForScore } from './sections/valuation';
import { beatStats } from './sections/management';

type Scores = { business: number; moat: number; moatDirection: number; growth: number; management: number; risk: number };

export function qualityOf(s: Scores): number {
  const w = CONFIG.verdict.weights;
  return round1(
    s.business * w.business + s.moat * w.moat + s.moatDirection * w.moatDirection +
    s.growth * w.growth + s.management * w.management + s.risk * w.risk,
  );
}

/** The decision matrix. Pure, so it can be simulated for triggers. */
export function decide(quality: number, valuation: number, moatDirection: number, risk: number, owned: boolean): Verdict {
  const V = CONFIG.verdict;
  if (quality < V.sellQuality || (moatDirection <= 2 && risk <= 2)) return 'SELL';
  if ((quality >= V.buy.quality && valuation >= V.buy.valuation) ||
      (quality >= V.buyOnBargain.quality && valuation >= V.buyOnBargain.valuation)) return 'BUY';
  if (quality >= V.watch.quality && valuation >= V.watch.valuation) return 'WATCH';
  if (quality >= V.holdQuality) return owned ? 'HOLD' : 'PASS';
  return 'PASS';
}

const qualityLabel = (q: number) =>
  q >= 4.2 ? 'Excellent' : q >= 3.5 ? 'Solid' : q >= 3 ? 'Decent' : q >= 2.5 ? 'Weak' : 'Poor';
const valuationWord = ['very expensive', 'expensive', 'fair', 'attractive', 'very attractive'];

const CHECK_PHRASES: Record<string, string> = {
  'predictable.good': 'Steady, predictable revenue.',
  'predictable.bad': 'Revenue swings a lot from year to year.',
  'pricing.good': 'Proven pricing power: prices rose without losing customers.',
  'pricing.mid': 'Pricing power is not yet proven.',
  'pricing.bad': 'Margins are shrinking — rivals are pushing prices down.',
  'recession.good': 'Sales held up in the last recession.',
  'recession.mid': 'Spending on it could be cut in a recession.',
  'recession.bad': 'Sales fell sharply in the last recession.',
  'competitive.good': 'Leader in its market.',
  'competitive.mid': 'Market leadership is not proven.',
  'competitive.bad': 'A small player in its market.',
  'diversified.bad': 'Depends heavily on a few big customers.',
  'disruption.mid': 'Faces some disruption risk.',
  'disruption.bad': 'Under real threat of disruption.',
  'control.bad': 'Relies heavily on partners and suppliers it cannot control.',
  'financials.good': 'Strong balance sheet: debt is easily covered by cash flow.',
  'financials.bad': 'Stretched balance sheet: debt is a real burden.',
};

const RANK: Record<Verdict, number> = { SELL: 0, PASS: 1, HOLD: 2, WATCH: 3, BUY: 4 };

export function buildVerdict(r: Omit<Report, 'verdict'>, owned: boolean, quarters: CompanyData['quarters']): VerdictResult {
  const scores: Scores = {
    business: r.business.score, moat: r.moat.score, moatDirection: r.moat.direction,
    growth: r.growth.score, management: r.management.score, risk: r.risk.score,
  };
  const quality = qualityOf(scores);
  const val = r.valuation.score;
  const verdict = decide(quality, val, scores.moatDirection, scores.risk, owned);

  // --- What would change it: the nearest price level in each direction.
  const triggers: Trigger[] = [];
  const capped = r.valuation.rules.includes('valuation.decelerationCap');
  for (let v = val + 1; v <= 5 && !capped; v++) {
    const alt = decide(quality, v, scores.moatDirection, scores.risk, owned);
    if (RANK[alt] > RANK[verdict]) {
      triggers.push({ to: alt, text: `Price falls below ${money(priceForScore(r.valuation, r.price, v), r.currency)} — valuation becomes ${valuationWord[v - 1]}.` });
      break;
    }
  }
  for (let v = val - 1; v >= 1; v--) {
    const alt = decide(quality, v, scores.moatDirection, scores.risk, owned);
    if (RANK[alt] < RANK[verdict]) {
      triggers.push({ to: alt, text: `Price rises above ${money(priceForScore(r.valuation, r.price, v + 1), r.currency)} — valuation becomes ${valuationWord[v - 1]}.` });
      break;
    }
  }
  const sectionNames: Record<keyof Scores, string> = {
    business: 'Business quality', moat: 'Moat', moatDirection: 'Moat direction', growth: 'Growth', management: 'Management', risk: 'Risk',
  };
  const hints: Partial<Record<keyof Scores, string>> = {
    moat: 'e.g. a price rise that costs no members, proving pricing power',
    growth: 'e.g. revenue growth re-accelerating',
    business: 'e.g. disclosed proof of market leadership',
    risk: 'e.g. paying down debt',
  };
  const bump = (k: keyof Scores) => {
    const next = { ...scores, [k]: scores[k] + 1 };
    return decide(qualityOf(next), val, next.moatDirection, next.risk, owned);
  };
  // Upgrade: the weakest section whose +1 alone flips the verdict up.
  const order = (Object.keys(scores) as (keyof Scores)[]).filter((k) => scores[k] < 5).sort((a, b) => scores[a] - scores[b]);
  const up = order.find((k) => RANK[bump(k)] > RANK[verdict]);
  if (up) {
    triggers.unshift({ to: bump(up), text: `${sectionNames[up]} improves from ${scores[up]} to ${scores[up] + 1}${hints[up] ? ` (${hints[up]})` : ''}.` });
  } else if (verdict !== 'BUY' && !triggers.some((t) => RANK[t.to] > RANK[verdict])) {
    // No single change is enough: name the quality step plus the price/growth step.
    const k = order.find((x) => qualityOf({ ...scores, [x]: scores[x] + 1 }) >= CONFIG.verdict.buy.quality);
    if (k) triggers.unshift({
      to: 'BUY',
      text: `${sectionNames[k]} improves from ${scores[k]} to ${scores[k] + 1}${hints[k] ? ` (${hints[k]})` : ''}, and ${
        capped ? 'revenue growth re-accelerates so today\'s low multiple counts as attractive'
        : `the price falls below ${money(priceForScore(r.valuation, r.price, CONFIG.verdict.buy.valuation), r.currency)}`}.`,
    });
  }
  // Downgrade: growth slipping is the most common real-world trigger.
  if (scores.growth > 1) {
    const alt = decide(qualityOf({ ...scores, growth: scores.growth - 1 }), val, scores.moatDirection, scores.risk, owned);
    if (RANK[alt] < RANK[verdict]) triggers.push({ to: alt, text: `Growth slips to ${scores.growth - 1} — for example, revenue growth slowing for two quarters in a row.` });
  }

  // --- Bull / bear: strongest and weakest evidence from the cards.
  const bull: string[] = [];
  const bear: string[] = [];
  if (r.growth.score >= 4) bull.push(`Revenue growing ${r.growth.metrics.find((m) => m.id === 'rev3')!.display} a year over three years.`);
  const beats = beatStats(quarters, 'revenue');
  if (beats.rate !== null && beats.rate >= 0.75) bull.push(`Beat revenue estimates in ${beats.beats} of the last ${beats.total} quarters.`);
  if (r.moat.score >= 4) bull.push(`${r.moat.label} moat built on ${r.moat.sources.filter((s) => s.strength === 'strong' || s.strength === 'moderate').map((s) => s.name.toLowerCase()).join(' and ')}.`);
  if (r.valuation.score <= 2) bear.push(`Valuation is ${r.valuation.label.toLowerCase()} versus its own 5-year history.`);
  const rev3 = r.growth.metrics.find((m) => m.id === 'rev3')!;
  if (r.growth.score <= 2) bear.push((rev3.value ?? 0) < 0
    ? `Revenue shrinking ${Math.abs((rev3.value ?? 0) * 100).toFixed(1)}% a year.`
    : `Revenue growing only ${rev3.display} a year.`);
  const weakMoat = r.moat.sources.filter((s) => s.strength === 'none' || s.strength === null).map((s) => s.name.toLowerCase());
  if (r.moat.score <= 3 && weakMoat.length) bear.push(`No ${weakMoat.slice(0, 2).join(' or ')} to keep customers from leaving.`);
  for (const c of [...r.business.checks, ...r.risk.checks]) {
    const line = CHECK_PHRASES[`${c.id}.${c.rating}`];
    if (!line) continue;
    if (c.rating === 'good') bull.push(line);
    else bear.push(line);
  }

  const qLabel = qualityLabel(quality);
  const headline = `${qLabel} business, ${valuationWord[val - 1]} valuation.`;
  const confidence = Math.round(
    ([r.business, r.moat, r.growth, r.management, r.risk, r.valuation].reduce((a, s) => a + Math.min(1, s.confidence), 0) / 6) * 100,
  ) / 100;
  const verdictMeaning: Record<Verdict, string> = {
    BUY: 'Quality and price both clear the bar.',
    WATCH: 'A good business at a fair price — keep it on the list and wait for a better entry point or stronger evidence.',
    HOLD: 'Worth keeping if you own it, but not compelling enough to add at this price.',
    PASS: 'Not compelling at this quality and price — there are likely better uses of your money.',
    SELL: 'Quality is too weak, or the moat is eroding while risk is high.',
  };

  return {
    verdict,
    headline,
    quality,
    qualityLabel: qLabel,
    valuationScore: val,
    confidence,
    explanation: `${r.name} scores ${quality.toFixed(1)}/5 on quality (${qLabel.toLowerCase()}) and ${val}/5 on valuation (${valuationWord[val - 1]}). ${verdictMeaning[verdict]}${
      verdict === 'SELL' && val >= 4 ? ' It looks cheap, but shrinking businesses often get cheaper still — a "value trap".' : ''}`,
    triggers: triggers.slice(0, 3),
    bull: bull.slice(0, 3),
    bear: bear.slice(0, 3),
  };
}
