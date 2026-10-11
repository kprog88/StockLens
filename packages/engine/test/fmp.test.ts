import { describe, expect, it } from 'vitest';
import { analyze, createFmp, ProviderError, withPrice } from '../src';

// Responses shaped like FMP's stable API. A fictional company, ACME.
const years = [2021, 2022, 2023, 2024, 2025];
const incA = years.map((y, i) => ({
  date: `${y}-12-31`, symbol: 'ACME', fiscalYear: String(y), period: 'FY',
  revenue: 10e9 * 1.1 ** i, grossProfit: 10e9 * 1.1 ** i * 0.6, operatingIncome: 10e9 * 1.1 ** i * 0.22,
  netIncome: 10e9 * 1.1 ** i * 0.17, epsDiluted: 1.7 * 1.1 ** i, interestExpense: 2e8, weightedAverageShsOutDil: 1e9,
}));
const balA = years.map((y) => ({ date: `${y}-12-31`, fiscalYear: String(y), totalDebt: 5e9, cashAndCashEquivalents: 3e9, totalStockholdersEquity: 20e9 }));
const cfA = years.map((y, i) => ({ date: `${y}-12-31`, fiscalYear: String(y), operatingCashFlow: 2.4e9 * 1.1 ** i, capitalExpenditure: -4e8, commonDividendsPaid: -5e8, commonStockRepurchased: -1e9 }));
const qDates = ['2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31', '2026-03-31', '2026-06-30', '2026-09-30'];
const incQ = qDates.map((date) => ({ date, revenue: 3.8e9, grossProfit: 2.3e9, operatingIncome: 0.85e9, netIncome: 0.66e9, epsDiluted: 0.66, interestExpense: 5e7, weightedAverageShsOutDil: 1e9 }));
const cfQ = qDates.map((date) => ({ date, operatingCashFlow: 0.9e9, capitalExpenditure: -1e8, commonDividendsPaid: -1.25e8, commonStockRepurchased: -2.5e8 }));
const earnings = [
  ...['2024-10-25', '2025-01-28', '2025-04-25', '2025-07-25', '2025-10-24', '2026-01-27', '2026-04-24', '2026-07-24'].map((date, i) => ({
    date, symbol: 'ACME', epsActual: 0.6 + i * 0.01, epsEstimated: 0.58 + i * 0.01, revenueActual: (3.4e9 + i * 0.06e9), revenueEstimated: 3.38e9 + i * 0.06e9,
  })),
  { date: '2026-10-23', symbol: 'ACME', epsActual: null, epsEstimated: 0.7, revenueActual: null, revenueEstimated: 4e9 },
];
const prices = Array.from({ length: 1260 }, (_, i) => {
  const d = new Date(Date.UTC(2021, 9, 11) + i * 1.45 * 864e5);
  return { symbol: 'ACME', date: d.toISOString().slice(0, 10), price: 40 + 15 * Math.sin(i / 120) + i * 0.01, volume: 1e6 };
});

function mockFetch(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const fetch = async (url: string) => {
    calls.push(url);
    const u = new URL(url);
    const path = u.pathname.replace('/stable/', '');
    const quarter = u.searchParams.get('period') === 'quarter';
    const key = quarter ? `${path}:quarter` : path;
    if (key in overrides) {
      const o = overrides[key] as { status: number; body: unknown };
      return { ok: o.status < 400, status: o.status, json: async () => o.body };
    }
    const routes: Record<string, unknown> = {
      'profile': [{ symbol: 'ACME', companyName: 'Acme Corp', exchange: 'NASDAQ', currency: 'USD', ceo: 'Jane Doe', image: 'https://images.financialmodelingprep.com/symbol/ACME.png' }],
      'income-statement': incA, 'income-statement:quarter': incQ,
      'balance-sheet-statement': balA, 'balance-sheet-statement:quarter': [{ date: '2026-09-30', totalDebt: 5e9, cashAndCashEquivalents: 3.5e9, totalStockholdersEquity: 21e9 }],
      'cash-flow-statement': cfA, 'cash-flow-statement:quarter': cfQ,
      'earnings': earnings,
      'historical-price-eod/light': prices,
      'quote': [{ symbol: 'ACME', price: 52.4, changePercentage: 1.25, timestamp: 1791700000 }],
      'search-symbol': [{ symbol: 'ACME', name: 'Acme Corp', currency: 'USD', exchange: 'NASDAQ' }, { symbol: 'ACME.L', name: 'Acme plc', currency: 'GBP', exchangeFullName: 'London' }],
    };
    if (!(key in routes)) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => routes[key] };
  };
  return { fetch, calls };
}

const fixedNow = () => new Date('2026-10-11T08:00:00Z');

describe('FMP adapter', () => {
  it('maps a company into engine input the engine can score', async () => {
    const { fetch, calls } = mockFetch();
    const d = await createFmp({ apiKey: 'k', fetch, now: fixedNow }).company('acme');
    expect(d.ticker).toBe('ACME');
    expect(d.name).toBe('Acme Corp');
    expect(d.annuals.map((a) => a.period)).toEqual(['FY2021', 'FY2022', 'FY2023', 'FY2024', 'FY2025', 'LTM']);
    const ltm = d.annuals.at(-1)!;
    expect(ltm.revenue).toBeCloseTo(4 * 3.8e9);
    expect(ltm.capex).toBeCloseTo(4e8);
    expect(ltm.buybacks).toBeCloseTo(1e9);
    expect(d.quarters).toHaveLength(8);
    expect(d.quarters.at(-1)!.period).toBe('Q2 2026');
    expect(d.peHistory.length).toBeGreaterThan(200);
    expect(d.ratios.pe).toBeCloseTo(52.4 / (4 * 0.66), 1);
    expect(d.management.ceoName).toBe('Jane Doe');
    expect(d.logoUrl).toBe('https://images.financialmodelingprep.com/symbol/ACME.png');
    expect(calls.every((c) => c.includes('apikey=k'))).toBe(true);

    const r = analyze(d);
    expect(['BUY', 'WATCH', 'HOLD', 'PASS', 'SELL']).toContain(r.verdict.verdict);
    expect(r.moat.rules[0]).toMatch(/^moat\.proxy/); // no moat sources reviewed yet
    expect(r.moat.explanation).toMatch(/estimated from margins/);
    expect(r.business.confidence).toBeLessThan(1);
  });

  it('still works when the plan lacks quarterly statements', async () => {
    const { fetch } = mockFetch({
      'income-statement:quarter': { status: 403, body: { 'Error Message': 'Premium endpoint' } },
      'cash-flow-statement:quarter': { status: 403, body: { 'Error Message': 'Premium endpoint' } },
    });
    const d = await createFmp({ apiKey: 'k', fetch, now: fixedNow }).company('ACME');
    expect(d.annuals.at(-1)!.period).toBe('FY2025');
    expect(() => analyze(d)).not.toThrow();
  });

  it('works on the free plan (402 for quarters, earnings and limits above 5)', async () => {
    const base = mockFetch().fetch;
    const calls: string[] = [];
    const premium = { ok: false, status: 402, json: async () => ({ 'Error Message': 'Premium Query Parameter' }) };
    const fetch = async (url: string) => {
      calls.push(url);
      const u = new URL(url);
      if (u.searchParams.get('period') === 'quarter' || u.pathname.endsWith('/earnings') || Number(u.searchParams.get('limit')) > 5) return premium;
      return base(url);
    };
    const d = await createFmp({ apiKey: 'k', fetch, now: fixedNow }).company('ACME');
    expect(calls.some((c) => c.includes('income-statement') && c.includes('limit=5'))).toBe(true);
    expect(() => analyze(d)).not.toThrow();
  });

  it('explains a plan limit on a required endpoint', async () => {
    const { fetch } = mockFetch({ profile: { status: 402, body: { 'Error Message': 'Premium endpoint' } } });
    await expect(createFmp({ apiKey: 'k', fetch }).company('ACME')).rejects.toMatchObject({ kind: 'plan', message: expect.stringContaining('profile') });
  });

  it('reports a rejected key clearly', async () => {
    const { fetch } = mockFetch({ profile: { status: 401, body: { 'Error Message': 'Invalid API KEY.' } } });
    await expect(createFmp({ apiKey: 'bad', fetch }).company('ACME')).rejects.toMatchObject({ kind: 'auth' });
  });

  it('reports the daily limit', async () => {
    const { fetch } = mockFetch({ quote: { status: 429, body: {} } });
    await expect(createFmp({ apiKey: 'k', fetch }).quote('ACME')).rejects.toBeInstanceOf(ProviderError);
  });

  it('refuses companies with too little history instead of guessing', async () => {
    const { fetch } = mockFetch({ 'income-statement': { status: 200, body: incA.slice(-2) } });
    await expect(createFmp({ apiKey: 'k', fetch, now: fixedNow }).company('ACME')).rejects.toMatchObject({ kind: 'data' });
  });

  it('searches symbols', async () => {
    const { fetch } = mockFetch();
    const hits = await createFmp({ apiKey: 'k', fetch }).search('acme');
    expect(hits).toEqual([
      { symbol: 'ACME', name: 'Acme Corp', exchange: 'NASDAQ', currency: 'USD' },
      { symbol: 'ACME.L', name: 'Acme plc', exchange: 'London', currency: 'GBP' },
    ]);
  });

  it('re-prices instantly from a new quote', async () => {
    const { fetch } = mockFetch();
    const d = await createFmp({ apiKey: 'k', fetch, now: fixedNow }).company('ACME');
    const cheaper = withPrice(d, 26.2, -50);
    expect(cheaper.ratios.pe).toBeCloseTo(d.ratios.pe! / 2, 1);
    expect(analyze(cheaper).valuation.score).toBeGreaterThanOrEqual(analyze(d).valuation.score);
  });
});
