import type { CompanyData } from '../types';
import { NFLX } from './nflx';
import { CLDY, FADE, STDY } from './synthetic';

export { NFLX, CLDY, FADE, STDY };

export const DEMO_COMPANIES: Record<string, CompanyData> = { NFLX, CLDY, STDY, FADE };

export interface Holding { ticker: string; shares: number; costBasis: number }

/** Demo portfolio (watchlist = not owned). */
export const DEMO_HOLDINGS: Holding[] = [
  { ticker: 'NFLX', shares: 120, costBasis: 58.4 },
  { ticker: 'STDY', shares: 80, costBasis: 61.0 },
  { ticker: 'FADE', shares: 300, costBasis: 18.9 },
];
export const DEMO_WATCHLIST = ['CLDY'];

/** "Yesterday's" inputs, so the daily digest has real changes to explain. */
export function demoYesterday(d: CompanyData): CompanyData {
  if (d.ticker === 'CLDY') {
    // Price was higher yesterday → P/S was mid-range.
    const k = 1.9;
    return { ...d, price: d.price * k, ratios: { ...d.ratios, ps: d.ratios.ps * k } };
  }
  if (d.ticker === 'FADE') {
    // Before the latest filing the debt load looked manageable.
    const annuals = d.annuals.map((a, i) => (i >= d.annuals.length - 2 ? { ...a, totalDebt: a.totalDebt * 0.35, interestExpense: a.interestExpense * 0.3 } : a));
    return { ...d, annuals, qualitative: { ...d.qualitative, outsideDependence: 'some' } };
  }
  return d;
}
