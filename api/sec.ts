// SEC EDGAR financial statements for the web app. Browsers can't call EDGAR
// directly (no cross-site access, and the SEC requires an identifying
// User-Agent), so this function fetches the company's XBRL facts, trims them
// to what StockLens uses, and caches the result on Vercel's CDN for 12 hours.
//
// GET /api/sec?ticker=GOOG                 -> { cik, facts }
// GET /api/sec?ticker=GOOG&view=statements -> readable statements (for checking)
import { cikFor, compactFacts, companyFactsUrl, SEC_TICKERS_URL, secStatements } from '../packages/engine/src/providers/sec';

// The SEC asks automated tools to identify themselves. Set SEC_USER_AGENT in
// Vercel to "StockLens your@email.com" to follow their policy exactly.
const UA = process.env.SEC_USER_AGENT || 'StockLens/1.0 (personal stock analysis app; github.com/kprog88/StockLens)';
const headers = { 'User-Agent': UA, Accept: 'application/json' };
let tickers: { at: number; data: unknown } | null = null;

export default async function handler(req: any, res: any) {
  const ticker = String(req.query.ticker ?? '').trim();
  if (!/^[A-Za-z0-9.\-]{1,10}$/.test(ticker)) {
    res.status(400).json({ error: 'Pass ?ticker=SYMBOL' });
    return;
  }
  try {
    if (!tickers || Date.now() - tickers.at > 864e5) {
      const r = await fetch(SEC_TICKERS_URL, { headers });
      if (!r.ok) throw new Error(`SEC ticker list returned ${r.status}`);
      tickers = { at: Date.now(), data: await r.json() };
    }
    const hit = cikFor(tickers.data, ticker);
    if (!hit) {
      res.setHeader('cache-control', 'public, s-maxage=86400');
      res.status(404).json({ error: `${ticker.toUpperCase()} doesn't file with the SEC.` });
      return;
    }
    const r = await fetch(companyFactsUrl(hit.cik), { headers });
    if (r.status === 404) {
      res.status(404).json({ error: `No XBRL financial data on EDGAR for ${ticker.toUpperCase()}.` });
      return;
    }
    if (!r.ok) throw new Error(`SEC EDGAR returned ${r.status}`);
    const facts = compactFacts(await r.json());
    res.setHeader('cache-control', 'public, s-maxage=43200, stale-while-revalidate=86400');
    if (req.query.view === 'statements') {
      res.status(200).json({ cik: hit.cik, ...secStatements(facts) });
      return;
    }
    res.status(200).json({ cik: hit.cik, facts });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
}
