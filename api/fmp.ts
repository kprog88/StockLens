// Pass-through to Financial Modeling Prep for the web build on Vercel.
// The browser calls /api/fmp/<endpoint>?...&apikey=<user's key>; this forwards it unchanged.
// The key always comes from the user's own device; nothing is stored here.
const ALLOWED = new Set([
  'search-symbol', 'quote', 'profile', 'income-statement', 'balance-sheet-statement',
  'cash-flow-statement', 'earnings', 'historical-price-eod/light',
]);

export default async function handler(req: any, res: any) {
  const { path = '', ...rest } = req.query as Record<string, string | string[]>;
  const endpoint = Array.isArray(path) ? path.join('/') : path;
  if (!ALLOWED.has(endpoint)) {
    res.status(404).json({ error: `Unknown endpoint: ${endpoint}` });
    return;
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) for (const x of [v].flat()) qs.append(k, String(x));
  try {
    const r = await fetch(`https://financialmodelingprep.com/stable/${endpoint}?${qs}`);
    res.status(r.status);
    res.setHeader('content-type', r.headers.get('content-type') ?? 'application/json');
    res.setHeader('cache-control', 'no-store');
    res.send(await r.text());
  } catch {
    res.status(502).json({ error: 'Could not reach Financial Modeling Prep.' });
  }
}
