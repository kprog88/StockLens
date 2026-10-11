// Financial Modeling Prep adapter: maps FMP's "stable" API onto CompanyData.
// Docs: https://site.financialmodelingprep.com/developer/docs
//
// FMP field names have changed between API versions, so every read accepts
// the known spellings. Anything FMP doesn't provide (qualitative judgements,
// insider stakes, employee ratings) stays null — the engine counts it as
// "not disclosed" and lowers confidence instead of guessing.

import type { AnnualFinancials, CompanyData, QuarterResult } from '../types';

type Json = Record<string, unknown>;
type Fetch = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class ProviderError extends Error {
  constructor(message: string, readonly kind: 'auth' | 'limit' | 'not-found' | 'plan' | 'network' | 'data') {
    super(message);
  }
}

/** FMP's public logo image for a symbol (used where no profile is loaded, e.g. search results). */
export const logoUrlFor = (symbol: string) => `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(symbol.toUpperCase())}.png`;

export interface SearchHit { symbol: string; name: string; exchange: string; currency: string }
export interface Quote { symbol: string; price: number; changePct: number | null; at: string }

const num = (o: Json | undefined, ...keys: string[]): number | null => {
  if (!o) return null;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
};
const str = (o: Json | undefined, ...keys: string[]): string | null => {
  if (!o) return null;
  for (const k of keys) if (typeof o[k] === 'string' && (o[k] as string).length) return o[k] as string;
  return null;
};
const abs0 = (x: number | null) => Math.abs(x ?? 0);

export function createFmp(opts: { apiKey: string; fetch?: Fetch; baseUrl?: string; now?: () => Date }) {
  const base = (opts.baseUrl ?? 'https://financialmodelingprep.com/stable/').replace(/\/?$/, '/');
  const f: Fetch = opts.fetch ?? ((u) => fetch(u) as unknown as ReturnType<Fetch>);
  const now = opts.now ?? (() => new Date());

  async function get(path: string, params: Record<string, string | number>): Promise<Json[]> {
    const qs = Object.entries({ ...params, apikey: opts.apiKey })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
    let res;
    try {
      res = await f(`${base}${path}?${qs}`);
    } catch {
      throw new ProviderError('Could not reach Financial Modeling Prep. Check your internet connection and try again.', 'network');
    }
    if (res.status === 401) throw new ProviderError('FMP rejected this key. Copy it again from your FMP dashboard — no spaces — and check your email is verified.', 'auth');
    if (res.status === 403) throw new ProviderError('This data needs a paid FMP plan (free plans cover mainly US stocks).', 'plan');
    if (res.status === 429) throw new ProviderError('Daily FMP request limit reached. Prices will refresh again tomorrow.', 'limit');
    if (!res.ok) throw new ProviderError(`FMP returned an error (${res.status}).`, 'network');
    const body = await res.json();
    if (body && !Array.isArray(body) && typeof body === 'object') {
      const msg = str(body as Json, 'Error Message', 'error', 'message');
      if (msg) throw new ProviderError(/invalid api/i.test(msg) ? 'FMP rejected this key. Copy it again from your FMP dashboard — no spaces — and check your email is verified.' : `FMP says: ${msg}`, /invalid api/i.test(msg) ? 'auth' : 'plan');
      return [body as Json];
    }
    return (body as Json[]) ?? [];
  }
  /** Optional endpoints: some plans don't include them; the analysis still runs without. */
  const optional = (p: Promise<Json[]>) => p.catch((e) => {
    if (e instanceof ProviderError && (e.kind === 'auth' || e.kind === 'limit' || e.kind === 'network')) throw e;
    return [] as Json[];
  });

  async function search(query: string): Promise<SearchHit[]> {
    if (query.trim().length < 1) return [];
    const rows = await get('search-symbol', { query: query.trim(), limit: 20 });
    return rows
      .map((r) => ({
        symbol: str(r, 'symbol') ?? '',
        name: str(r, 'name', 'companyName') ?? '',
        exchange: str(r, 'exchange', 'exchangeShortName', 'exchangeFullName', 'stockExchange') ?? '',
        currency: str(r, 'currency') ?? 'USD',
      }))
      .filter((r) => r.symbol);
  }

  async function quote(symbol: string): Promise<Quote> {
    const [q] = await get('quote', { symbol });
    const price = num(q, 'price');
    if (!q || price === null) throw new ProviderError(`No quote found for ${symbol}.`, 'not-found');
    const ts = num(q, 'timestamp');
    return { symbol, price, changePct: num(q, 'changePercentage', 'changesPercentage'), at: ts ? new Date(ts * 1000).toISOString() : now().toISOString() };
  }

  async function company(symbol: string): Promise<CompanyData> {
    const s = symbol.toUpperCase();
    const from = new Date(now().getTime() - 5.1 * 365 * 864e5).toISOString().slice(0, 10);
    const [profile, incA, balA, cfA, incQ, balQ, cfQ, earnings, prices, q] = await Promise.all([
      get('profile', { symbol: s }),
      get('income-statement', { symbol: s, period: 'annual', limit: 6 }),
      optional(get('balance-sheet-statement', { symbol: s, period: 'annual', limit: 6 })),
      optional(get('cash-flow-statement', { symbol: s, period: 'annual', limit: 6 })),
      optional(get('income-statement', { symbol: s, period: 'quarter', limit: 8 })),
      optional(get('balance-sheet-statement', { symbol: s, period: 'quarter', limit: 1 })),
      optional(get('cash-flow-statement', { symbol: s, period: 'quarter', limit: 8 })),
      optional(get('earnings', { symbol: s, limit: 20 })),
      optional(get('historical-price-eod/light', { symbol: s, from })),
      quote(s),
    ]);
    const p = profile[0];
    if (!p) throw new ProviderError(`${s} was not found on FMP.`, 'not-found');
    return mapCompany(s, { p, incA, balA, cfA, incQ, balQ, cfQ, earnings, prices, q, today: now() });
  }

  return { search, quote, company };
}

// ---------------------------------------------------------------------------
// Pure mapping (exported for tests).
// ---------------------------------------------------------------------------

const byDate = (a: Json, b: Json) => (str(a, 'date') ?? '').localeCompare(str(b, 'date') ?? '');
const yearOf = (r: Json) => String(num(r, 'fiscalYear', 'calendarYear') ?? (str(r, 'date') ?? '').slice(0, 4));
const matchYear = (rows: Json[], r: Json) => rows.find((x) => yearOf(x) === yearOf(r)) ?? rows.find((x) => str(x, 'date') === str(r, 'date'));

/** Shares bought back; falls back to net issuance when repurchases aren't itemised. */
function buybacksOf(cf: Json | undefined): number {
  const repurchased = num(cf, 'commonStockRepurchased');
  if (repurchased) return Math.abs(repurchased);
  return Math.abs(Math.min(0, num(cf, 'netCommonStockIssuance') ?? 0));
}

function row(period: string, inc: Json, bal: Json | undefined, cf: Json | undefined): AnnualFinancials {
  return {
    period,
    revenue: num(inc, 'revenue') ?? 0,
    grossProfit: num(inc, 'grossProfit') ?? 0,
    operatingIncome: num(inc, 'operatingIncome') ?? 0,
    netIncome: num(inc, 'netIncome') ?? 0,
    eps: num(inc, 'epsDiluted', 'epsdiluted', 'eps') ?? 0,
    operatingCashFlow: num(cf, 'operatingCashFlow', 'netCashProvidedByOperatingActivities') ?? 0,
    capex: abs0(num(cf, 'capitalExpenditure', 'investmentsInPropertyPlantAndEquipment')),
    interestExpense: abs0(num(inc, 'interestExpense')),
    totalDebt: num(bal, 'totalDebt') ?? (abs0(num(bal, 'shortTermDebt')) + abs0(num(bal, 'longTermDebt'))),
    cash: num(bal, 'cashAndCashEquivalents', 'cashAndShortTermInvestments') ?? 0,
    dividendsPaid: abs0(num(cf, 'commonDividendsPaid', 'dividendsPaid', 'netDividendsPaid')),
    buybacks: buybacksOf(cf),
  };
}

const sum = (rows: Json[], ...keys: string[]) => rows.reduce((a, r) => a + (num(r, ...keys) ?? 0), 0);

function quarterLabel(dateStr: string): string {
  // Earnings are reported ~1 month after the quarter ends.
  const d = new Date(dateStr + 'T00:00:00Z');
  let m = d.getUTCMonth(); // 0–11, month of report
  let y = d.getUTCFullYear();
  m -= 1;
  if (m < 0) { m += 12; y -= 1; }
  return `Q${Math.floor(m / 3) + 1} ${y}`;
}

export interface RawCompany {
  p: Json; incA: Json[]; balA: Json[]; cfA: Json[]; incQ: Json[]; balQ: Json[]; cfQ: Json[];
  earnings: Json[]; prices: Json[]; q: Quote; today: Date;
}

export function mapCompany(symbol: string, r: RawCompany): CompanyData {
  const incA = [...r.incA].sort(byDate).slice(-5);
  if (incA.length < 4) throw new ProviderError(`${symbol} has fewer than 4 years of financial statements, so it can't be analysed yet.`, 'data');
  const annuals: AnnualFinancials[] = incA.map((inc) => row(`FY${yearOf(inc)}`, inc, matchYear(r.balA, inc), matchYear(r.cfA, inc)));

  // Trailing twelve months, when four quarters are available.
  const incQ = [...r.incQ].sort(byDate).slice(-4);
  const cfQ = [...r.cfQ].sort(byDate).slice(-4);
  const lastFy = incA[incA.length - 1]!;
  const hasLtm = incQ.length === 4 && (str(incQ[3], 'date') ?? '') > (str(lastFy, 'date') ?? '');
  const balNow = r.balQ[0] ?? matchYear(r.balA, lastFy);
  if (hasLtm) {
    const ltmInc: Json = {
      revenue: sum(incQ, 'revenue'), grossProfit: sum(incQ, 'grossProfit'), operatingIncome: sum(incQ, 'operatingIncome'),
      netIncome: sum(incQ, 'netIncome'), epsDiluted: sum(incQ, 'epsDiluted', 'epsdiluted', 'eps'), interestExpense: sum(incQ, 'interestExpense'),
    };
    const ltmCf: Json | undefined = cfQ.length === 4 ? {
      operatingCashFlow: sum(cfQ, 'operatingCashFlow', 'netCashProvidedByOperatingActivities'),
      capitalExpenditure: sum(cfQ, 'capitalExpenditure'),
      commonDividendsPaid: sum(cfQ, 'commonDividendsPaid', 'dividendsPaid'),
      commonStockRepurchased: sum(cfQ, 'commonStockRepurchased'),
    } : matchYear(r.cfA, lastFy);
    annuals.push(row('LTM', ltmInc, balNow, ltmCf));
  }

  // Last 8 reported quarters: actual vs. analyst estimate.
  const quarters: QuarterResult[] = r.earnings
    .filter((e) => num(e, 'epsActual', 'eps') !== null && (num(e, 'revenueActual', 'revenue') ?? 0) > 0)
    .sort(byDate)
    .slice(-8)
    .map((e) => ({
      period: quarterLabel(str(e, 'date')!),
      revenue: num(e, 'revenueActual', 'revenue')!,
      revenueEstimate: num(e, 'revenueEstimated'),
      eps: num(e, 'epsActual', 'eps')!,
      epsEstimate: num(e, 'epsEstimated'),
    }));

  // Per-share fundamentals for live repricing.
  const latest = annuals[annuals.length - 1]!;
  const shares = num(incQ[incQ.length - 1], 'weightedAverageShsOutDil', 'weightedAverageShsOut') ?? num(lastFy, 'weightedAverageShsOutDil', 'weightedAverageShsOut') ?? 0;
  const equity = num(balNow, 'totalStockholdersEquity', 'totalEquity');
  const perShare = shares > 0 ? {
    eps: latest.eps || null,
    sales: latest.revenue / shares,
    book: equity !== null && equity > 0 ? equity / shares : null,
    fcf: latest.operatingCashFlow - latest.capex > 0 ? (latest.operatingCashFlow - latest.capex) / shares : null,
  } : { eps: latest.eps || null, sales: 0, book: null, fcf: null };

  // Multiple history: weekly price ÷ the per-share figure in force at that date.
  const points = incA.map((inc) => ({
    date: str(inc, 'date') ?? `${yearOf(inc)}-12-31`,
    eps: num(inc, 'epsDiluted', 'epsdiluted', 'eps') ?? 0,
    sps: (num(inc, 'revenue') ?? 0) / (num(inc, 'weightedAverageShsOutDil', 'weightedAverageShsOut') || shares || 1),
  }));
  if (hasLtm) points.push({ date: str(incQ[3], 'date')!, eps: latest.eps, sps: perShare.sales });
  const prices = [...r.prices].sort(byDate).filter((_, i, a) => (a.length - 1 - i) % 5 === 0);
  const peHistory: number[] = [];
  const psHistory: number[] = [];
  for (const px of prices) {
    const price = num(px, 'price', 'close', 'adjClose');
    const date = str(px, 'date');
    if (!price || !date) continue;
    const pt = [...points].reverse().find((x) => x.date <= date) ?? points[0]!;
    if (pt.eps > 0) peHistory.push(+(price / pt.eps).toFixed(2));
    if (pt.sps > 0) psHistory.push(+(price / pt.sps).toFixed(2));
  }

  const base: CompanyData = {
    ticker: symbol,
    name: str(r.p, 'companyName', 'name') ?? symbol,
    exchange: str(r.p, 'exchange', 'exchangeShortName', 'exchangeFullName') ?? '',
    currency: str(r.p, 'currency') ?? 'USD',
    price: r.q.price,
    asOf: r.today.toISOString().slice(0, 10),
    source: `Financial Modeling Prep · statements to ${str(hasLtm ? incQ[3] : lastFy, 'date') ?? 'latest'}`,
    annuals,
    quarters,
    peHistory,
    psHistory,
    ratios: { pe: null, ps: 0, pb: null, pfcf: null },
    qualitative: {
      recurringRevenueShare: null, recessionRevenueChange: null, essentialSpend: null, marketShareRank: null,
      priceRiseWithoutVolumeLoss: null, topCustomerShare: null, disruptionThreat: null, outsideDependence: null,
      industryGrowth: null, newOfferingsRoom: null,
      moat: { switchingCosts: null, networkEffects: null, intangibleAssets: null, lowCostProduction: null, counterPositioning: null },
    },
    management: {
      ceoName: str(r.p, 'ceo') ?? 'Not disclosed', ceoTitle: 'CEO', ceoTenureYears: null,
      insiderOwnershipPct: null, insiderOwnershipValue: null, employeeRating: null,
    },
    perShare,
    logoUrl: str(r.p, 'image') ?? logoUrlFor(symbol),
  };
  return withPrice(base, r.q.price, r.q.changePct, r.q.at);
}

/** Re-price a company with a fresh quote; ratios follow automatically. */
export function withPrice(d: CompanyData, price: number, changePct: number | null = null, at: string = new Date().toISOString()): CompanyData {
  const ps = d.perShare;
  if (!ps) return { ...d, price, quote: { changePct, at } };
  const r = (den: number | null) => (den && den > 0 ? +(price / den).toFixed(2) : null);
  return {
    ...d,
    price,
    quote: { changePct, at },
    ratios: { pe: r(ps.eps), ps: r(ps.sales) ?? 0, pb: r(ps.book), pfcf: r(ps.fcf) },
  };
}

