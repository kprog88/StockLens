// Free, keyless fundamentals from SEC EDGAR (XBRL "company facts") and price
// history from Yahoo Finance's chart feed. Used for every US-listed company,
// so the app isn't limited to the symbols FMP's free plan allows.
//
// This file has no runtime imports: the Vercel functions in /api reuse it.
//
// EDGAR facts are raw XBRL: each concept (tag) has entries with a period
// (start/end), a value and the filing it came from. Companies use different
// tags for the same line item, so every field lists the known alternatives.

type Json = Record<string, unknown>;

export interface FactEntry { start?: string; end: string; val: number; form: string; filed: string }
/** Only the tags StockLens needs, trimmed to recent filings. Small enough to send to a phone. */
export interface CompactFacts { cik: number; name: string; currency: string; tags: Record<string, FactEntry[]> }

const FLOW = {
  revenue: ['RevenueFromContractWithCustomerExcludingAssessedTax', 'Revenues', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax', 'SalesRevenueGoodsNet', 'SalesRevenueServicesNet'],
  costOfRevenue: ['CostOfRevenue', 'CostOfGoodsAndServicesSold', 'CostOfGoodsSold', 'CostOfServices'],
  grossProfit: ['GrossProfit'],
  operatingIncome: ['OperatingIncomeLoss'],
  pretax: ['IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest', 'IncomeLossFromContinuingOperationsBeforeIncomeTaxesMinorityInterestAndIncomeLossFromEquityMethodInvestments'],
  netIncome: ['NetIncomeLoss', 'ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic'],
  interestExpense: ['InterestExpense', 'InterestExpenseNonoperating', 'InterestExpenseDebt', 'InterestPaidNet'],
  ocf: ['NetCashProvidedByUsedInOperatingActivities', 'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations'],
  capex: ['PaymentsToAcquirePropertyPlantAndEquipment', 'PaymentsToAcquireProductiveAssets'],
  dividends: ['PaymentsOfDividendsCommonStock', 'PaymentsOfDividends'],
  buybacks: ['PaymentsForRepurchaseOfCommonStock'],
} as const;
const EPS = ['EarningsPerShareDiluted', 'EarningsPerShareBasic', 'EarningsPerShareBasicAndDiluted'];
const SHARES = ['WeightedAverageNumberOfDilutedSharesOutstanding', 'WeightedAverageNumberOfShareOutstandingBasicAndDiluted', 'WeightedAverageNumberOfSharesOutstandingBasic'];
const INSTANT = {
  cash: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents', 'Cash'],
  equity: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
  debtTotal: ['LongTermDebt', 'DebtLongtermAndShorttermCombinedAmount'],
  debtNoncurrent: ['LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations'],
  debtCurrent: ['LongTermDebtCurrent', 'LongTermDebtAndCapitalLeaseObligationsCurrent'],
  shortBorrowings: ['ShortTermBorrowings'],
  commercialPaper: ['CommercialPaper'],
} as const;
const DEI_SHARES = 'dei:EntityCommonStockSharesOutstanding';

const ALL_TAGS = [...Object.values(FLOW).flat(), ...EPS, ...SHARES, ...Object.values(INSTANT).flat()];
const UNIT_PREF: Record<string, string[]> = {};
for (const t of EPS) UNIT_PREF[t] = ['USD/shares'];
for (const t of SHARES) UNIT_PREF[t] = ['shares'];
UNIT_PREF[DEI_SHARES] = ['shares'];

const DAY = 864e5;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;
const near = (a: string, b: string, tol = 6) => Math.abs(days(a, b)) <= tol;
const isAnnual = (e: FactEntry) => !!e.start && days(e.start, e.end) >= 340 && days(e.start, e.end) <= 380;

/** Keep only the tags and filings StockLens uses (last ~8 years of 10-K/10-Q). */
export function compactFacts(raw: unknown): CompactFacts {
  const j = (raw ?? {}) as Json;
  const facts = (j.facts ?? {}) as Record<string, Record<string, { units?: Record<string, FactEntry[]> }>>;
  const tags: Record<string, FactEntry[]> = {};
  let currency = 'USD';
  const pick = (ns: string, tag: string, key: string) => {
    const units = facts[ns]?.[tag]?.units;
    if (!units) return;
    const prefs = UNIT_PREF[key] ?? ['USD'];
    let unit = prefs.find((u) => units[u]);
    if (!unit && !UNIT_PREF[key]) { // a non-USD reporter: take its first plain currency unit
      unit = Object.keys(units).find((u) => /^[A-Z]{3}$/.test(u));
      if (unit) currency = unit;
    }
    if (!unit) return;
    const list = (units[unit] ?? []).filter((e) => typeof e.val === 'number' && /^10-[KQ]/.test(e.form ?? '') && e.end);
    if (!list.length) return;
    const latest = list.reduce((m, e) => (e.end > m ? e.end : m), '');
    const cutoff = new Date(Date.parse(latest) - 8.5 * 365 * DAY).toISOString().slice(0, 10);
    tags[key] = list.filter((e) => e.end >= cutoff).map((e) => ({ ...(e.start ? { start: e.start } : {}), end: e.end, val: e.val, form: e.form, filed: e.filed }));
  };
  for (const t of ALL_TAGS) pick('us-gaap', t, t);
  pick('dei', 'EntityCommonStockSharesOutstanding', DEI_SHARES);
  return { cik: Number(j.cik ?? 0), name: String(j.entityName ?? ''), currency, tags };
}

/** De-duplicate restated periods: the most recently filed value wins. */
function latestByPeriod(list: FactEntry[]): FactEntry[] {
  const m = new Map<string, FactEntry>();
  for (const e of list) {
    const k = `${e.start ?? ''}|${e.end}`;
    const cur = m.get(k);
    if (!cur || e.filed > cur.filed) m.set(k, e);
  }
  return [...m.values()];
}

export interface SecStatements {
  name: string; currency: string;
  incA: Json[]; balA: Json[]; cfA: Json[]; incQ: Json[]; balQ: Json[]; cfQ: Json[];
  sharesOutstanding: number | null;
}

export function secStatements(c: CompactFacts): SecStatements {
  const T: Record<string, FactEntry[]> = {};
  for (const [k, v] of Object.entries(c.tags)) T[k] = latestByPeriod(v);

  // Fiscal years: annual periods of net income or revenue.
  const fyMap = new Map<string, { start: string; end: string }>();
  for (const t of [...FLOW.netIncome, ...FLOW.revenue]) {
    for (const e of T[t] ?? []) if (isAnnual(e) && ![...fyMap.values()].some((p) => near(p.end, e.end))) fyMap.set(e.end, { start: e.start!, end: e.end });
  }
  const fys = [...fyMap.values()].sort((a, b) => a.end.localeCompare(b.end)).slice(-6);

  const annual = (tags: readonly string[], fy: { start: string; end: string }): number | null => {
    for (const t of tags) {
      const e = (T[t] ?? []).find((x) => isAnnual(x) && near(x.end, fy.end) && near(x.start!, fy.start));
      if (e) return e.val;
    }
    return null;
  };
  const instant = (tags: readonly string[], end: string): number | null => {
    for (const t of tags) {
      const e = (T[t] ?? []).filter((x) => !x.start && near(x.end, end, 10)).sort((a, b) => Math.abs(days(a.end, end)) - Math.abs(days(b.end, end)))[0];
      if (e) return e.val;
    }
    return null;
  };
  /** Weighted shares for a period ending at `end`: prefer the shortest period that ends there. */
  const sharesAt = (end: string): number | null => {
    for (const t of SHARES) {
      const e = (T[t] ?? []).filter((x) => x.start && near(x.end, end)).sort((a, b) => days(a.start!, a.end) - days(b.start!, b.end))[0];
      if (e) return e.val;
    }
    return null;
  };

  // Quarters: 10-Qs report year-to-date cash flows (and the 10-K only the full
  // year), so every quarter is the difference between consecutive
  // year-to-date figures that start on the same fiscal-year start.
  const fyStarts = fys.slice(-2).map((f) => f.start);
  const last = fys[fys.length - 1];
  if (last) fyStarts.push(new Date(Date.parse(last.end) + DAY).toISOString().slice(0, 10));
  const quarterEnds = new Map<string, string>(); // end -> start
  const cumulative = (tags: readonly string[], fyStart: string): FactEntry[] => {
    for (const t of tags) {
      const xs = (T[t] ?? []).filter((x) => x.start && near(x.start, fyStart) && days(x.start, x.end) > 60 && days(x.start, x.end) <= 380)
        .sort((a, b) => a.end.localeCompare(b.end))
        .filter((x, i, a) => i === 0 || !near(a[i - 1]!.end, x.end));
      if (xs.length) return xs;
    }
    return [];
  };
  const quarterly = (tags: readonly string[]): Map<string, number> => {
    const out = new Map<string, number>();
    for (const s of fyStarts) {
      const cum = cumulative(tags, s);
      let prev = 0;
      let prevEnd = s;
      for (const x of cum) {
        const span = days(prevEnd, x.end);
        if (span >= 70 && span <= 110) {
          out.set(x.end, x.val - prev);
          quarterEnds.set(x.end, prevEnd);
        }
        prev = x.val;
        prevEnd = x.end;
      }
    }
    return out;
  };
  const q = Object.fromEntries((Object.keys(FLOW) as (keyof typeof FLOW)[]).map((k) => [k, quarterly(FLOW[k])])) as Record<keyof typeof FLOW, Map<string, number>>;
  const qEps = quarterly(EPS);

  const lookup = (m: Map<string, number>, end: string) => { for (const [k, v] of m) if (near(k, end)) return v; return null; };
  const gross = (rev: number | null, gp: number | null, cost: number | null, op: number | null) =>
    gp ?? (rev !== null && cost !== null ? rev - cost : op);

  const incRow = (end: string, get: (k: keyof typeof FLOW) => number | null, eps: number | null, shares: number | null): Json => {
    const revenue = get('revenue');
    const op = get('operatingIncome') ?? get('pretax');
    return {
      date: end, fiscalYear: Number(end.slice(0, 4)),
      revenue, grossProfit: gross(revenue, get('grossProfit'), get('costOfRevenue'), op), operatingIncome: op,
      netIncome: get('netIncome'), epsDiluted: eps ?? (shares && get('netIncome') !== null ? get('netIncome')! / shares : null),
      interestExpense: get('interestExpense'), weightedAverageShsOutDil: shares,
    };
  };
  const cfRow = (end: string, get: (k: keyof typeof FLOW) => number | null): Json => ({
    date: end, fiscalYear: Number(end.slice(0, 4)),
    operatingCashFlow: get('ocf'), capitalExpenditure: get('capex'), commonDividendsPaid: get('dividends'), commonStockRepurchased: get('buybacks'),
  });
  const balRow = (end: string): Json => {
    const total = instant(INSTANT.debtTotal, end);
    const split = (instant(INSTANT.debtNoncurrent, end) ?? 0) + (instant(INSTANT.debtCurrent, end) ?? 0);
    const short = (instant(INSTANT.shortBorrowings, end) ?? 0) + (instant(INSTANT.commercialPaper, end) ?? 0);
    return {
      date: end, fiscalYear: Number(end.slice(0, 4)),
      totalDebt: (total ?? split) + short,
      cashAndCashEquivalents: instant(INSTANT.cash, end),
      totalStockholdersEquity: instant(INSTANT.equity, end),
    };
  };

  const incA = fys.map((fy) => incRow(fy.end, (k) => annual(FLOW[k], fy), annual(EPS, fy), sharesAt(fy.end)));
  const cfA = fys.map((fy) => cfRow(fy.end, (k) => annual(FLOW[k], fy)));
  const balA = fys.map((fy) => balRow(fy.end));

  const qEnds = [...quarterEnds.keys()].sort().slice(-8);
  const incQ = qEnds.map((end) => incRow(end, (k) => lookup(q[k], end), lookup(qEps, end), sharesAt(end))).filter((r) => r.revenue !== null || r.netIncome !== null);
  const cfQ = qEnds.map((end) => cfRow(end, (k) => lookup(q[k], end))).filter((r) => r.operatingCashFlow !== null);
  const latestEnd = [qEnds[qEnds.length - 1], last?.end].filter(Boolean).sort().pop();
  const balQ = latestEnd ? [balRow(latestEnd)] : [];

  adjustForSplits([...incA, ...incQ]);

  const dei = latestByPeriod(c.tags[DEI_SHARES] ?? []).sort((a, b) => b.end.localeCompare(a.end))[0];
  return { name: c.name, currency: c.currency, incA, balA, cfA, incQ, balQ, cfQ, sharesOutstanding: dei?.val ?? null };
}

/**
 * Older filings report per-share figures before later stock splits. Walking
 * back in time, a jump of ≥1.8× in share count marks a split: earlier shares
 * and EPS are restated to today's share basis so P/E history stays comparable.
 */
function adjustForSplits(rows: Json[]) {
  const withShares = rows.filter((r) => typeof r.weightedAverageShsOutDil === 'number' && (r.weightedAverageShsOutDil as number) > 0)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  let factor = 1;
  let prev: number | null = null;
  for (const r of withShares) {
    let s = (r.weightedAverageShsOutDil as number) * factor;
    if (prev !== null) {
      const up = prev / s;
      const down = s / prev;
      if (up >= 1.8) { const k = Math.round(up); factor *= k; s *= k; }
      else if (down >= 1.8) { const k = Math.round(down); factor /= k; s /= k; }
    }
    if (factor !== 1) {
      r.weightedAverageShsOutDil = s;
      if (typeof r.epsDiluted === 'number') r.epsDiluted = (r.epsDiluted as number) / factor;
    }
    prev = s;
  }
}

/** Ticker → CIK from SEC's company_tickers.json. Class shares use a dash on EDGAR (BRK-B). */
export function cikFor(tickers: unknown, symbol: string): { cik: number; name: string } | null {
  const want = symbol.toUpperCase().replace('.', '-');
  for (const v of Object.values((tickers ?? {}) as Record<string, { cik_str: number; ticker: string; title: string }>)) {
    if (v?.ticker?.toUpperCase() === want) return { cik: v.cik_str, name: v.title };
  }
  return null;
}
export const companyFactsUrl = (cik: number) => `https://data.sec.gov/api/xbrl/companyfacts/CIK${String(cik).padStart(10, '0')}.json`;
export const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';

export interface PricePoint { date: string; price: number }
export interface PriceSeries { prices: PricePoint[]; last: { price: number; changePct: number | null; at: string; currency: string } | null }

/** Yahoo Finance v8 chart response → daily closes. */
export function parseYahooChart(raw: unknown): PriceSeries {
  const res = ((raw as Json)?.chart as Json | undefined)?.result as Json[] | undefined;
  const r = res?.[0];
  if (!r) return { prices: [], last: null };
  const ts = (r.timestamp as number[] | undefined) ?? [];
  const close = (((r.indicators as Json)?.quote as Json[] | undefined)?.[0]?.close as (number | null)[] | undefined) ?? [];
  const prices: PricePoint[] = [];
  ts.forEach((t, i) => { const p = close[i]; if (typeof p === 'number' && p > 0) prices.push({ date: new Date(t * 1000).toISOString().slice(0, 10), price: +p.toFixed(4) }); });
  const meta = (r.meta ?? {}) as Json;
  const price = typeof meta.regularMarketPrice === 'number' ? meta.regularMarketPrice : prices[prices.length - 1]?.price;
  const at = typeof meta.regularMarketTime === 'number' ? new Date(meta.regularMarketTime * 1000).toISOString() : new Date().toISOString();
  // Previous close = the last daily close before the day of the latest trade.
  const prevClose = [...prices].reverse().find((x) => x.date < at.slice(0, 10))?.price ?? null;
  return {
    prices,
    last: price ? { price, changePct: prevClose ? +(((price / prevClose) - 1) * 100).toFixed(2) : null, at, currency: String(meta.currency ?? 'USD') } : null,
  };
}
export const yahooChartUrl = (symbol: string, range: '5d' | '6y') =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol.toUpperCase().replace('.', '-'))}?range=${range}&interval=1d`;

/** Stooq daily CSV (fallback price source) → closes. */
export function parseStooqCsv(csv: string): PricePoint[] {
  return csv.trim().split(/\r?\n/).slice(1).map((l) => l.split(',')).filter((c) => c.length >= 5 && Number(c[4]) > 0).map((c) => ({ date: c[0]!, price: Number(c[4]) }));
}
