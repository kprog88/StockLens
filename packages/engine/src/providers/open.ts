// Keyless data sources: SEC EDGAR for financial statements, Yahoo Finance for prices.
// On the web the browser can't call these sites directly (they don't allow
// cross-site requests), so the app goes through the site's own /api functions
// ("proxy" mode). The phone app calls them directly.

import {
  cikFor, compactFacts, companyFactsUrl, parseYahooChart, SEC_TICKERS_URL, secStatements, yahooChartUrl,
  type CompactFacts, type PriceSeries, type SecStatements,
} from './sec';

export type HttpFetch = (url: string, init?: { headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface OpenData {
  /** Statements from SEC filings, or null when the company doesn't file with the SEC. */
  statements(symbol: string): Promise<SecStatements | null>;
  prices(symbol: string, range: '5d' | '6y'): Promise<PriceSeries>;
}

// The SEC asks for a company/app name plus a contact email in the User-Agent.
export const DEFAULT_SEC_USER_AGENT = 'StockLens kprog88@users.noreply.github.com';

export function createOpenData(opts: { fetch?: HttpFetch; proxyBase?: string; userAgent?: string } = {}): OpenData {
  const f: HttpFetch = opts.fetch ?? ((u, init) => fetch(u, init) as unknown as ReturnType<HttpFetch>);
  const proxy = opts.proxyBase?.replace(/\/?$/, '/');
  const headers = { 'User-Agent': opts.userAgent ?? DEFAULT_SEC_USER_AGENT, Accept: 'application/json' };
  let tickers: Promise<unknown> | null = null;

  async function json(url: string, init?: { headers?: Record<string, string> }) {
    const r = await f(url, init);
    if (r.status === 404) return null;
    if (!r.ok) {
      let detail = '';
      try { detail = String(((await r.json()) as { error?: string })?.error ?? ''); } catch { /* no body */ }
      throw new Error(detail || `HTTP ${r.status} from ${url.split('?')[0]}`);
    }
    return r.json();
  }

  async function facts(symbol: string): Promise<CompactFacts | null> {
    if (proxy) {
      const body = (await json(`${proxy}sec?ticker=${encodeURIComponent(symbol)}`)) as { facts?: CompactFacts } | null;
      return body?.facts ?? null;
    }
    tickers ??= json(SEC_TICKERS_URL, { headers }).catch((e) => { tickers = null; throw e; });
    const hit = cikFor(await tickers, symbol);
    if (!hit) return null;
    const raw = await json(companyFactsUrl(hit.cik), { headers });
    return raw ? compactFacts(raw) : null;
  }

  return {
    async statements(symbol) {
      const c = await facts(symbol);
      return c ? secStatements(c) : null;
    },
    async prices(symbol, range) {
      if (proxy) return ((await json(`${proxy}prices?symbol=${encodeURIComponent(symbol)}&range=${range}`)) as PriceSeries | null) ?? { prices: [], last: null };
      return parseYahooChart(await json(yahooChartUrl(symbol, range), { headers: { 'User-Agent': 'Mozilla/5.0' } }));
    },
  };
}
