import { CONFIG } from '../config';
import type { CompanyData, SectionResult } from '../types';
import { clamp, money } from '../util';

const SCALE: SectionResult['scaleLabels'] = ['Poor', 'Below avg', 'Decent', 'Good', 'Great'];

export function beatStats(qs: CompanyData['quarters'], key: 'revenue' | 'eps') {
  const est = key === 'revenue' ? 'revenueEstimate' : 'epsEstimate';
  const rows = qs.filter((q) => q[est] !== null);
  const beats = rows.filter((q) => q[key] >= (q[est] as number));
  const surprise = rows.length
    ? rows.reduce((a, q) => a + (q[key] / (q[est] as number) - 1), 0) / rows.length
    : 0;
  return { beats: beats.length, total: rows.length, rate: rows.length ? beats.length / rows.length : null, avgSurprise: surprise };
}

export function scoreManagement(d: CompanyData): SectionResult {
  const M = CONFIG.management;
  const m = d.management;
  const rev = beatStats(d.quarters, 'revenue');
  const eps = beatStats(d.quarters, 'eps');

  const reasons: string[] = [];
  let points = 0;
  const minRate = Math.min(rev.rate ?? 0, eps.rate ?? 0);
  if (minRate >= M.beatRate.strong) { points += 2; reasons.push('beats its own forecasts reliably'); }
  else if (minRate >= M.beatRate.ok) { points += 1; reasons.push('beats forecasts more often than not'); }
  const U = M.undisclosedPoints;
  if (m.ceoTenureYears === null) points += U;
  else if (m.ceoTenureYears >= M.tenureYears) { points += 1; reasons.push(`${m.ceoTenureYears} years of continuity at the top`); }
  if (m.insiderOwnershipValue === null && m.insiderOwnershipPct === null) points += U;
  else if ((m.insiderOwnershipValue ?? 0) >= M.insiderValue || (m.insiderOwnershipPct ?? 0) >= M.insiderPct) {
    points += 1; reasons.push('leaders own a meaningful stake');
  }
  if (m.employeeRating === null) points += U;
  else if (m.employeeRating >= M.employeeRating) { points += 1; reasons.push('employees rate it well'); }
  const score = clamp(Math.round(1 + points), 1, 5);

  const known = [m.ceoTenureYears, m.insiderOwnershipValue ?? m.insiderOwnershipPct, m.employeeRating, rev.rate, eps.rate]
    .filter((x) => x !== null).length;

  return {
    id: 'management',
    title: 'Management',
    score,
    label: SCALE[score - 1]!,
    scaleLabels: SCALE,
    checks: [],
    metrics: [
      { id: 'revBeat', label: 'Revenue vs. estimate', value: rev.rate, display: `Beat ${rev.beats}/${rev.total} · avg ${(rev.avgSurprise * 100 >= 0 ? '+' : '')}${(rev.avgSurprise * 100).toFixed(1)}%`, term: 'earnings-beat' },
      { id: 'epsBeat', label: 'EPS vs. estimate', value: eps.rate, display: `Beat ${eps.beats}/${eps.total} · avg ${(eps.avgSurprise * 100 >= 0 ? '+' : '')}${(eps.avgSurprise * 100).toFixed(1)}%`, term: 'earnings-beat' },
      { id: 'insider', label: 'Insider ownership', value: m.insiderOwnershipPct,
        display: m.insiderOwnershipPct === null ? 'Not disclosed' : `${m.insiderOwnershipPct}%${m.insiderOwnershipValue ? ` (${money(m.insiderOwnershipValue, d.currency)})` : ''}`, term: 'insider-ownership' },
      { id: 'employees', label: 'Employee rating', value: m.employeeRating, display: m.employeeRating === null ? 'Not disclosed' : `${m.employeeRating.toFixed(1)} / 5` },
    ],
    explanation: reasons.length
      ? `Management ${reasons.join(', ')}.`
      : 'Little evidence either way about the quality of management.',
    soWhat: score >= 4
      ? 'Leaders who hit their own targets and own shares tend to allocate your money carefully.'
      : 'Missed forecasts or little skin in the game mean you should trust guidance less.',
    confidence: known / 5,
    rules: [`management.points.${points.toFixed(2)}`],
  };
}
