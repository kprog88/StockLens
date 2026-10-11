// Daily closing prices for the web app (Yahoo Finance, Stooq as fallback).
// GET /api/prices?symbol=GOOG&range=6y  -> { prices: [{date, price}], last }
// GET /api/prices?symbol=GOOG&range=5d  -> latest price and day change
import { parseStooqCsv, parseYahooChart, yahooChartUrl, type PriceSeries } from '../packages/engine/src/providers/sec';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

async function fromYahoo(symbol: string, range: '5d' | '6y'): Promise<PriceSeries | null> {
  const r = await fetch(yahooChartUrl(symbol, range), { headers: { 'User-Agent': BROWSER_UA } });
  if (!r.ok) return null;
  const p = parseYahooChart(await r.json());
  return p.prices.length ? p : null;
}

async function fromStooq(symbol: string): Promise<PriceSeries | null> {
  const r = await fetch(`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol.toLowerCase().replace('.', '-'))}.us&i=d`, { headers: { 'User-Agent': BROWSER_UA } });
  if (!r.ok) return null;
  const cutoff = new Date(Date.now() - 6 * 365 * 864e5).toISOString().slice(0, 10);
  const prices = parseStooqCsv(await r.text()).filter((p) => p.date >= cutoff);
  if (!prices.length) return null;
  const last = prices[prices.length - 1]!;
  const prev = prices[prices.length - 2];
  return { prices, last: { price: last.price, changePct: prev ? +(((last.price / prev.price) - 1) * 100).toFixed(2) : null, at: `${last.date}T21:00:00Z`, currency: 'USD' } };
}

export default async function handler(req: any, res: any) {
  const symbol = String(req.query.symbol ?? '').trim();
  const range = req.query.range === '5d' ? '5d' : '6y';
  if (!/^[A-Za-z0-9.\-]{1,10}$/.test(symbol)) {
    res.status(400).json({ error: 'Pass ?symbol=SYMBOL' });
    return;
  }
  try {
    const data = (await fromYahoo(symbol, range).catch(() => null)) ?? (await fromStooq(symbol).catch(() => null));
    if (!data) {
      res.status(404).json({ error: `No price data for ${symbol.toUpperCase()}.` });
      return;
    }
    res.setHeader('cache-control', range === '5d' ? 'public, s-maxage=300' : 'public, s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
}
