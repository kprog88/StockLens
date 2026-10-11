import type { CompanyData } from './types';
import { fcf, lastFiscal, latest, money, mult } from './util';

export interface LiveFormula {
  parts: { value: string; label: string }[];
  op: '÷' | '−';
  result: { value: string; label: string };
}

/** "Netflix, today": the term's formula with this company's real numbers. */
export function liveFormula(termId: string, d: CompanyData): LiveFormula | null {
  const ltm = latest(d.annuals);
  const fy = lastFiscal(d.annuals);
  const c = d.currency;
  switch (termId) {
    case 'pe-ratio': {
      if (!d.ratios.pe) return null;
      const eps = d.price / d.ratios.pe;
      return { op: '÷', parts: [{ value: money(d.price, c), label: 'share price' }, { value: money(eps, c), label: 'profit / share' }],
        result: { value: mult(d.ratios.pe), label: 'P/E' } };
    }
    case 'gross-margin':
      return { op: '÷', parts: [{ value: money(ltm.grossProfit, c), label: 'gross profit' }, { value: money(ltm.revenue, c), label: 'revenue' }],
        result: { value: `${((ltm.grossProfit / ltm.revenue) * 100).toFixed(1)}%`, label: 'gross margin' } };
    case 'operating-margin':
      return { op: '÷', parts: [{ value: money(ltm.operatingIncome, c), label: 'operating profit' }, { value: money(ltm.revenue, c), label: 'revenue' }],
        result: { value: `${((ltm.operatingIncome / ltm.revenue) * 100).toFixed(1)}%`, label: 'operating margin' } };
    case 'interest-coverage':
      if (fy.interestExpense <= 0) return null;
      return { op: '÷', parts: [{ value: money(fy.operatingIncome, c), label: 'operating profit' }, { value: money(fy.interestExpense, c), label: 'interest' }],
        result: { value: mult(fy.operatingIncome / fy.interestExpense), label: 'coverage' } };
    case 'free-cash-flow':
      return { op: '−', parts: [{ value: money(ltm.operatingCashFlow, c), label: 'operating cash' }, { value: money(ltm.capex, c), label: 'investment' }],
        result: { value: money(fcf(ltm), c), label: 'free cash flow' } };
    case 'net-debt':
      return { op: '−', parts: [{ value: money(fy.totalDebt, c), label: 'total debt' }, { value: money(fy.cash, c), label: 'cash' }],
        result: { value: money(fy.totalDebt - fy.cash, c), label: 'net debt' } };
    case 'ps-ratio':
      return { op: '÷', parts: [{ value: money(d.price, c), label: 'share price' }, { value: money(d.price / d.ratios.ps, c), label: 'sales / share' }],
        result: { value: mult(d.ratios.ps), label: 'P/S' } };
    default:
      return null;
  }
}
