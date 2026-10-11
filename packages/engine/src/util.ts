import { CONFIG } from './config';
import type { AnnualFinancials, Check, Rating3 } from './types';

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const round1 = (x: number) => Math.round(x * 10) / 10;

export function cagr(start: number, end: number, years: number): number | null {
  if (years <= 0 || start <= 0 || end <= 0) return null;
  return Math.pow(end / start, 1 / years) - 1;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

/** Value at the p-th percentile (0–100), linear interpolation. */
export function percentileValue(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b);
  if (s.length === 0) return NaN;
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo]! + (s[hi]! - s[lo]!) * (idx - lo);
}

/** Percentile rank (0–100) of x within xs. */
export function percentileRank(xs: number[], x: number): number {
  if (xs.length === 0) return 50;
  const below = xs.filter((v) => v < x).length;
  const equal = xs.filter((v) => v === x).length;
  return ((below + equal / 2) / xs.length) * 100;
}

export const growth = (prev: number, cur: number) => (prev > 0 ? cur / prev - 1 : 0);
export const fcf = (a: AnnualFinancials) => a.operatingCashFlow - a.capex;
export const grossMargin = (a: AnnualFinancials) => (a.revenue > 0 ? a.grossProfit / a.revenue : 0);
export const operatingMargin = (a: AnnualFinancials) => (a.revenue > 0 ? a.operatingIncome / a.revenue : 0);

/** Revenue growth of the last four quarters vs. the four before them.
 *  Falls back to the last two fiscal years when quarters are missing. */
export function ltmRevenueGrowth(annuals: AnnualFinancials[], quarters: { revenue: number }[]): number {
  if (quarters.length >= 8) {
    const q = quarters.slice(-8);
    const prior = q.slice(0, 4).reduce((a, x) => a + x.revenue, 0);
    const recent = q.slice(4).reduce((a, x) => a + x.revenue, 0);
    return growth(prior, recent);
  }
  const fy = fiscalYears(annuals);
  return growth(fy[fy.length - 2]!.revenue, fy[fy.length - 1]!.revenue);
}

/** Last full fiscal year (skips a trailing "LTM" row). */
export function lastFiscal(annuals: AnnualFinancials[]): AnnualFinancials {
  const fiscal = annuals.filter((a) => a.period !== 'LTM');
  return fiscal[fiscal.length - 1] ?? annuals[annuals.length - 1]!;
}
export const latest = (annuals: AnnualFinancials[]) => annuals[annuals.length - 1]!;
export const fiscalYears = (annuals: AnnualFinancials[]) => annuals.filter((a) => a.period !== 'LTM');

/** Average the checks' points; undisclosed checks count as "mid". */
export function scoreChecks(checks: Check[]): number {
  const pts = checks.map((c) => CONFIG.ratingPoints[c.rating ?? 'mid']);
  return clamp(Math.round(pts.reduce((a, b) => a + b, 0) / pts.length), 1, 5);
}

export const confidenceOf = (checks: Check[]) =>
  checks.length === 0 ? 1 : checks.filter((c) => c.rating !== null).length / checks.length;

export function pickLabel(r: Rating3 | null, options: [string, string, string], fallback = options[1]): string {
  if (r === null) return fallback;
  return r === 'bad' ? options[0] : r === 'mid' ? options[1] : options[2];
}

// --- formatting ------------------------------------------------------------

export function money(x: number, currency = 'USD'): string {
  const sym = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
  const abs = Math.abs(x);
  const sign = x < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(abs >= 1e10 ? 1 : 2).replace(/\.0$/, '')}B`;
  if (abs >= 1e6) return `${sign}${sym}${Math.round(abs / 1e6)}M`;
  return `${sign}${sym}${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const pct = (x: number | null, digits = 1) =>
  x === null ? '—' : `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(digits)}%`;

export const mult = (x: number | null) => (x === null ? '—' : `${x.toFixed(1)}×`);
