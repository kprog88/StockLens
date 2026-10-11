import { describe, expect, it } from 'vitest';
import { analyze, compactFacts, createFmp, createOpenData, parseYahooChart, secStatements, cikFor } from '../src';

// A synthetic EDGAR "company facts" document shaped like the real thing:
// Dec fiscal year, a revenue tag switch, 10-Q year-to-date cash flows,
// 3-month income lines, restated comparatives and a 20-for-1 split in 2022.
type E = { start?: string; end: string; val: number; form: string; filed: string; fy?: number; fp?: string };
const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const rev = (y: number) => 100e9 * 1.12 ** (y - 2019);
const ni = (y: number) => rev(y) * 0.22;
const preSplitShares = 0.69e9;
const postSplitShares = preSplitShares * 20;

function facts() {
  const t: Record<string, E[]> = {};
  const add = (tag: string, e: E) => (t[tag] ??= []).push(e);
  for (const y of years) {
    const start = `${y}-01-01`, end = `${y}-12-31`;
    // Each 10-K reports this year and the two before; later filings restate earlier years.
    for (const filedYear of [y + 1, y + 2]) {
      if (filedYear > 2026) continue;
      const filed = `${filedYear}-02-02`;
      const split = filedYear >= 2023; // filings after the mid-2022 split use the new share basis
      const shares = split ? postSplitShares : preSplitShares;
      add(y < 2020 ? 'Revenues' : 'RevenueFromContractWithCustomerExcludingAssessedTax', { start, end, val: rev(y), form: '10-K', filed });
      add('CostOfRevenue', { start, end, val: rev(y) * 0.44, form: '10-K', filed });
      add('OperatingIncomeLoss', { start, end, val: rev(y) * 0.28, form: '10-K', filed });
      add('NetIncomeLoss', { start, end, val: ni(y), form: '10-K', filed });
      add('EarningsPerShareDiluted', { start, end, val: +(ni(y) / shares).toFixed(2), form: '10-K', filed });
      add('WeightedAverageNumberOfDilutedSharesOutstanding', { start, end, val: shares, form: '10-K', filed });
      add('NetCashProvidedByUsedInOperatingActivities', { start, end, val: ni(y) * 1.3, form: '10-K', filed });
      add('PaymentsToAcquirePropertyPlantAndEquipment', { start, end, val: rev(y) * 0.1, form: '10-K', filed });
      add('PaymentsForRepurchaseOfCommonStock', { start, end, val: 40e9, form: '10-K', filed });
      add('CashAndCashEquivalentsAtCarryingValue', { end, val: 25e9, form: '10-K', filed });
      add('StockholdersEquity', { end, val: 250e9 + (y - 2019) * 20e9, form: '10-K', filed });
      add('LongTermDebtNoncurrent', { end, val: 12e9, form: '10-K', filed });
    }
  }
  // 10-Qs for 2025 (Q1–Q3) and 2026 (Q1–Q2): YTD cash flow, 3-month and YTD income.
  const quarters: [number, number][] = [[2025, 1], [2025, 2], [2025, 3], [2026, 1], [2026, 2]];
  const qEnd = (y: number, q: number) => ['', `${y}-03-31`, `${y}-06-30`, `${y}-09-30`][q]!;
  const qRev = (y: number) => (y === 2026 ? rev(2025) * 1.14 : rev(2025)) / 4;
  for (const [y, q] of quarters) {
    const filed = `${y}-${String(q * 3 + 1).padStart(2, '0')}-28`;
    const end = qEnd(y, q);
    const ytdStart = `${y}-01-01`;
    const qStart = q === 1 ? ytdStart : `${y}-${String((q - 1) * 3 + 1).padStart(2, '0')}-01`;
    const tag = 'RevenueFromContractWithCustomerExcludingAssessedTax';
    add(tag, { start: qStart, end, val: qRev(y), form: '10-Q', filed });
    if (q > 1) add(tag, { start: ytdStart, end, val: qRev(y) * q, form: '10-Q', filed });
    add('NetIncomeLoss', { start: ytdStart, end, val: qRev(y) * 0.22 * q, form: '10-Q', filed });
    add('OperatingIncomeLoss', { start: ytdStart, end, val: qRev(y) * 0.28 * q, form: '10-Q', filed });
    add('CostOfRevenue', { start: ytdStart, end, val: qRev(y) * 0.44 * q, form: '10-Q', filed });
    add('EarningsPerShareDiluted', { start: ytdStart, end, val: +((qRev(y) * 0.22 * q) / postSplitShares).toFixed(2), form: '10-Q', filed });
    add('WeightedAverageNumberOfDilutedSharesOutstanding', { start: qStart, end, val: postSplitShares, form: '10-Q', filed });
    add('NetCashProvidedByUsedInOperatingActivities', { start: ytdStart, end, val: qRev(y) * 0.3 * q, form: '10-Q', filed });
    add('PaymentsToAcquirePropertyPlantAndEquipment', { start: ytdStart, end, val: qRev(y) * 0.1 * q, form: '10-Q', filed });
    add('CashAndCashEquivalentsAtCarryingValue', { end, val: 30e9, form: '10-Q', filed });
    add('StockholdersEquity', { end, val: 400e9, form: '10-Q', filed });
    add('LongTermDebtNoncurrent', { end, val: 11e9, form: '10-Q', filed });
  }
  const usgaap: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(t)) {
    const unit = k.startsWith('EarningsPerShare') ? 'USD/shares' : k.startsWith('WeightedAverage') ? 'shares' : 'USD';
    usgaap[k] = { label: k, units: { [unit]: v } };
  }
  return {
    cik: 1652044, entityName: 'Gamma Inc.',
    facts: { 'us-gaap': usgaap, dei: { EntityCommonStockSharesOutstanding: { units: { shares: [{ end: '2026-07-20', val: 13.7e9, form: '10-Q', filed: '2026-07-28' }] } } } },
  };
}

const yahoo = (() => {
  const start = Date.UTC(2020, 9, 1) / 1000;
  const timestamp: number[] = [];
  const close: number[] = [];
  for (let i = 0; i < 1500; i++) {
    const t = start + i * 86400 * 1.4;
    timestamp.push(Math.round(t));
    close.push(80 + 60 * (i / 1500) + 10 * Math.sin(i / 90));
  }
  return { chart: { result: [{ meta: { currency: 'USD', regularMarketPrice: 165.2, regularMarketTime: timestamp[timestamp.length - 1]! + 3600 }, timestamp, indicators: { quote: [{ close }] } }] } };
})();

describe('SEC EDGAR statements', () => {
  const s = secStatements(compactFacts(facts()));

  it('reads five-plus fiscal years across a revenue tag change', () => {
    expect(s.name).toBe('Gamma Inc.');
    expect(s.incA.length).toBe(6);
    expect(s.incA.at(-1)!.date).toBe('2025-12-31');
    expect(s.incA.at(-1)!.revenue).toBeCloseTo(rev(2025), -3);
    expect(s.incA[0]!.revenue).toBeCloseTo(rev(2020), -3);
    expect(s.incA.at(-1)!.grossProfit).toBeCloseTo(rev(2025) * 0.56, -3);
  });

  it('derives single quarters from year-to-date figures', () => {
    const last = s.incQ.at(-1)!;
    expect(last.date).toBe('2026-06-30');
    expect(last.revenue as number).toBeCloseTo(qRev2026(), -3);
    const q4 = s.incQ.find((r) => r.date === '2025-12-31')!;
    expect(q4.revenue as number).toBeCloseTo(rev(2025) / 4, -3); // FY minus nine months
    const cf = s.cfQ.find((r) => r.date === '2026-06-30')!;
    expect(cf.capitalExpenditure as number).toBeCloseTo(qRev2026() * 0.1, -3);
    expect(s.balQ[0]!.date).toBe('2026-06-30');
    expect(s.balQ[0]!.totalStockholdersEquity).toBe(400e9);
  });

  it('keeps per-share figures on one share basis across a stock split', () => {
    const eps = s.incA.map((r) => r.epsDiluted as number);
    // Earnings grow 12% a year; without the split adjustment the old years would be 20× larger.
    for (let i = 1; i < eps.length; i++) expect(eps[i]! / eps[i - 1]!).toBeGreaterThan(1.05);
    expect(eps[i0()]!).toBeLessThan(5);
  });

  it('maps tickers to SEC CIKs, including class shares', () => {
    const list = { 0: { cik_str: 1067983, ticker: 'BRK-B', title: 'Berkshire Hathaway' }, 1: { cik_str: 1652044, ticker: 'GOOG', title: 'Alphabet' } };
    expect(cikFor(list, 'brk.b')?.cik).toBe(1067983);
    expect(cikFor(list, 'GOOG')?.cik).toBe(1652044);
    expect(cikFor(list, 'NOPE')).toBeNull();
  });

  it('parses Yahoo daily closes and the day change', () => {
    const p = parseYahooChart(yahoo);
    expect(p.prices.length).toBe(1500);
    expect(p.last!.price).toBe(165.2);
    expect(p.last!.changePct).not.toBeNull();
  });

  it('says why SEC filings could not be used when FMP also refuses', async () => {
    const fetch = async (url: string) => {
      const u = new URL(url, 'https://stocklens.test');
      if (u.pathname === '/api/sec') return { ok: false, status: 502, json: async () => ({ error: 'SEC EDGAR returned 403' }) };
      if (u.pathname.endsWith('/profile')) return { ok: true, status: 200, json: async () => [{ symbol: 'GMMA', companyName: 'Gamma Inc.' }] };
      if (u.pathname.endsWith('/quote')) return { ok: true, status: 200, json: async () => [{ symbol: 'GMMA', price: 10 }] };
      return { ok: false, status: 402, json: async () => ({}) };
    };
    const fmp = createFmp({ apiKey: 'k', fetch, open: createOpenData({ fetch, proxyBase: 'https://stocklens.test/api/' }) });
    await expect(fmp.company('GMMA')).rejects.toThrow(/SEC filings couldn't be used either: SEC EDGAR returned 403/);
  });

  it('analyses a stock FMP\'s free plan refuses, using SEC + Yahoo', async () => {
    const compact = compactFacts(facts());
    const fetch = async (url: string) => {
      const u = new URL(url, 'https://stocklens.test');
      if (u.pathname === '/api/sec') return { ok: true, status: 200, json: async () => ({ facts: compact }) };
      if (u.pathname === '/api/prices') return { ok: true, status: 200, json: async () => parseYahooChart(yahoo) };
      if (u.pathname.endsWith('/profile')) return { ok: true, status: 200, json: async () => [{ symbol: 'GMMA', companyName: 'Gamma Inc.', exchange: 'NASDAQ', currency: 'USD', ceo: 'J. Doe' }] };
      return { ok: false, status: 402, json: async () => ({ 'Error Message': 'Premium Query Parameter' }) };
    };
    const open = createOpenData({ fetch, proxyBase: 'https://stocklens.test/api/' });
    const fmp = createFmp({ apiKey: 'k', fetch, open, now: () => new Date('2026-10-11T08:00:00Z') });
    const d = await fmp.company('GMMA');
    expect(d.source).toMatch(/SEC EDGAR/);
    expect(d.price).toBe(165.2);
    expect(d.annuals.at(-1)!.period).toBe('LTM');
    expect(d.peHistory.length).toBeGreaterThan(100);
    const r = analyze(d);
    expect(['BUY', 'WATCH', 'HOLD', 'PASS', 'SELL']).toContain(r.verdict.verdict);
    const q = await fmp.quote('GMMA');
    expect(q.price).toBe(165.2);
  });
});

function qRev2026() { return (rev(2025) * 1.14) / 4; }
function i0() { return 0; }
