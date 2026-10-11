import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  analyze, createFmp, createOpenData, DEMO_COMPANIES, DEMO_HOLDINGS, DEMO_WATCHLIST, demoYesterday, diffReports, ProviderError, withPrice,
  type Change, type CompanyData, type Holding, type Report, type SearchHit,
} from '@stocklens/engine';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { AppState as RNAppState, Platform, useColorScheme } from 'react-native';

import { palettes, verdictColors, type Scheme } from '@/theme/tokens';

export type ThemePref = 'system' | 'light' | 'dark';
export type LearnMode = 'beginner' | 'pro';
export type Mode = 'demo' | 'live';
export type { Holding };

/** Live prices refresh this often while the app is open (keeps within FMP's free daily limit). */
export const QUOTE_REFRESH_MINUTES = 15;
/** Financial statements are re-downloaded at most this often. */
const FUNDAMENTALS_MAX_AGE_H = 12;
const STORE_KEY = 'stocklens/v1';

const webHost = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hostname : '';
const isLocalWeb = /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(webHost);
/** True in the Claude artifact preview, whose host blocks requests to outside sites. */
export const isHostedPreview = Platform.OS === 'web' && typeof window !== 'undefined'
  && !!(window as unknown as { __SL_BASE?: string }).__SL_BASE;
/** On a deployed website (e.g. Vercel), FMP is reached through the site's own /api/fmp pass-through. */
const FMP_BASE = webHost && !isLocalWeb && !isHostedPreview ? '/api/fmp/' : undefined;
/**
 * Keyless SEC filings + price history. The website goes through its own /api
 * functions; the phone app calls SEC EDGAR and Yahoo directly.
 */
const OPEN_DATA = Platform.OS !== 'web' ? createOpenData() : FMP_BASE ? createOpenData({ proxyBase: '/api/' }) : undefined;
export const PREVIEW_MESSAGE = "This browser preview can't connect to live data: its host blocks requests to other websites. Your key is probably fine. Run the app on your phone with Expo Go (npm run mobile) and paste it there.";

export interface Position extends Holding {
  report: Report;
  value: number;
  pnl: number;
  pnlPct: number;
  changedToday: boolean;
}

interface Persisted {
  v: 1;
  apiKey: string | null;
  themePref: ThemePref;
  learnMode: LearnMode;
  holdings: Holding[];
  watchlist: string[];
  cache: Record<string, { data: CompanyData; fetchedAt: string }>;
  /** Yesterday's last-known reports: the digest compares today against these. */
  baseline: { date: string; reports: Record<string, Report> } | null;
  lastSeen: { date: string; reports: Record<string, Report> } | null;
}

const EMPTY: Persisted = {
  v: 1, apiKey: null, themePref: 'system', learnMode: 'beginner',
  holdings: [], watchlist: [], cache: {}, baseline: null, lastSeen: null,
};

export interface Status { refreshing: boolean; lastRefreshed: string | null; error: string | null }

interface AppState {
  ready: boolean;
  mode: Mode;
  scheme: Scheme;
  themePref: ThemePref;
  setThemePref: (p: ThemePref) => void;
  learnMode: LearnMode;
  setLearnMode: (m: LearnMode) => void;
  apiKey: string | null;
  saveApiKey: (key: string) => Promise<void>;
  clearApiKey: () => void;
  holdings: Position[];
  watchlist: Report[];
  companies: Record<string, CompanyData>;
  reportFor: (ticker: string) => Report | undefined;
  isOwned: (ticker: string) => boolean;
  isTracked: (ticker: string) => boolean;
  changes: Change[];
  totals: { value: number; cost: number; pnl: number; pnlPct: number; mixedCurrency: boolean };
  status: Status;
  refresh: (force?: boolean) => Promise<void>;
  search: (q: string) => Promise<SearchHit[]>;
  addStock: (symbol: string, holding: { shares: number; costBasis: number } | null) => Promise<void>;
  removeStock: (symbol: string) => void;
}

const Ctx = createContext<AppState | null>(null);
const today = () => new Date().toLocaleDateString('en-CA');
const ageHours = (iso: string) => (Date.now() - new Date(iso).getTime()) / 36e5;
const messageOf = (e: unknown) => (e instanceof ProviderError || e instanceof Error ? e.message : 'Something went wrong.');

export function AppStateProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [ready, setReady] = useState(false);
  const [p, setP] = useState<Persisted>(EMPTY);
  const [status, setStatus] = useState<Status>({ refreshing: false, lastRefreshed: null, error: null });
  const pRef = useRef(p);
  pRef.current = p;

  // --- persistence ---------------------------------------------------------
  useEffect(() => {
    AsyncStorage.getItem(STORE_KEY)
      .then((raw) => { if (raw) setP({ ...EMPTY, ...(JSON.parse(raw) as Persisted) }); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORE_KEY, JSON.stringify(p)).catch(() => {});
  }, [p, ready]);
  const update = useCallback((fn: (s: Persisted) => Persisted) => setP((s) => fn(s)), []);

  const mode: Mode = p.apiKey ? 'live' : 'demo';
  const fmp = useMemo(() => (p.apiKey ? createFmp({ apiKey: p.apiKey, baseUrl: FMP_BASE, open: OPEN_DATA }) : null), [p.apiKey]);

  // --- data --------------------------------------------------------------------
  const holdingsList: Holding[] = mode === 'live' ? p.holdings : DEMO_HOLDINGS;
  const watchList: string[] = mode === 'live' ? p.watchlist : DEMO_WATCHLIST;
  const companies: Record<string, CompanyData> = useMemo(() => {
    if (mode === 'demo') return DEMO_COMPANIES;
    return Object.fromEntries(Object.entries(p.cache).map(([t, c]) => [t, c.data]));
  }, [mode, p.cache]);

  const owned = useMemo(() => new Set(holdingsList.map((h) => h.ticker)), [holdingsList]);
  const reports = useMemo(() => {
    const out: Record<string, Report> = {};
    for (const t of new Set([...holdingsList.map((h) => h.ticker), ...watchList])) {
      const d = companies[t];
      if (!d) continue;
      try { out[t] = analyze(d, { owned: owned.has(t) }); } catch { /* not enough data; shown as unavailable */ }
    }
    return out;
  }, [companies, holdingsList, watchList, owned]);

  // Roll the daily baseline: the first time we see a new day, yesterday's last
  // reports become the baseline the digest compares against.
  useEffect(() => {
    if (!ready || mode !== 'live' || Object.keys(reports).length === 0) return;
    const d = today();
    update((s) => {
      if (s.lastSeen?.date === d) return { ...s, lastSeen: { date: d, reports } };
      return { ...s, baseline: s.lastSeen ?? s.baseline, lastSeen: { date: d, reports } };
    });
  }, [reports, ready, mode, update]);

  const changes: Change[] = useMemo(() => {
    if (mode === 'demo') {
      return Object.values(DEMO_COMPANIES).flatMap((d) =>
        diffReports(analyze(demoYesterday(d), { owned: owned.has(d.ticker) }), analyze(d, { owned: owned.has(d.ticker) })));
    }
    const base = p.baseline?.reports ?? {};
    return Object.entries(reports).flatMap(([t, r]) => (base[t] ? diffReports(base[t]!, r) : []));
  }, [mode, reports, p.baseline, owned]);

  const changed = useMemo(() => new Set(changes.map((c) => c.ticker)), [changes]);
  const holdings: Position[] = useMemo(() => holdingsList.flatMap((h) => {
    const report = reports[h.ticker];
    if (!report) return [];
    const value = h.shares * report.price;
    const cost = h.shares * h.costBasis;
    return [{ ...h, report, value, pnl: value - cost, pnlPct: cost > 0 ? value / cost - 1 : 0, changedToday: changed.has(h.ticker) }];
  }), [holdingsList, reports, changed]);
  const totals = useMemo(() => {
    const value = holdings.reduce((a, x) => a + x.value, 0);
    const cost = holdings.reduce((a, x) => a + x.shares * x.costBasis, 0);
    const currencies = new Set(holdings.map((x) => x.report.currency));
    return { value, cost, pnl: value - cost, pnlPct: cost > 0 ? value / cost - 1 : 0, mixedCurrency: currencies.size > 1 };
  }, [holdings]);

  // --- live refresh ------------------------------------------------------------
  const busy = useRef(false);
  const refresh = useCallback(async (force = false) => {
    const s = pRef.current;
    if (!fmp || busy.current) return;
    const tickers = [...new Set([...s.holdings.map((h) => h.ticker), ...s.watchlist])];
    if (tickers.length === 0) return;
    busy.current = true;
    setStatus((x) => ({ ...x, refreshing: true, error: null }));
    let error: string | null = null;
    const next: Persisted['cache'] = {};
    await Promise.all(tickers.map(async (t) => {
      const cached = s.cache[t];
      try {
        if (!cached || force || ageHours(cached.fetchedAt) > FUNDAMENTALS_MAX_AGE_H) {
          next[t] = { data: await fmp.company(t), fetchedAt: new Date().toISOString() };
        } else {
          const q = await fmp.quote(t);
          next[t] = { ...cached, data: withPrice(cached.data, q.price, q.changePct, q.at) };
        }
      } catch (e) {
        error = messageOf(e);
      }
    }));
    update((x) => ({ ...x, cache: { ...x.cache, ...next } }));
    setStatus({ refreshing: false, lastRefreshed: new Date().toISOString(), error });
    busy.current = false;
  }, [fmp, update]);

  // Refresh when the app opens, comes back to the foreground, and on a timer.
  useEffect(() => {
    if (!ready || mode !== 'live') return;
    refresh();
    const id = setInterval(() => { if (RNAppState.currentState === 'active') refresh(); }, QUOTE_REFRESH_MINUTES * 60_000);
    const sub = RNAppState.addEventListener('change', (st) => { if (st === 'active') refresh(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [ready, mode, refresh]);

  // --- actions -------------------------------------------------------------------
  const search = useCallback(async (q: string) => {
    if (!fmp) return [];
    return fmp.search(q);
  }, [fmp]);

  const addStock = useCallback(async (symbol: string, holding: { shares: number; costBasis: number } | null) => {
    if (!fmp) throw new Error('Add your Financial Modeling Prep key in Settings first.');
    const t = symbol.toUpperCase();
    const data = await fmp.company(t);
    analyze(data); // throws if the data is too thin to score — surfaced to the user
    update((s) => ({
      ...s,
      cache: { ...s.cache, [t]: { data, fetchedAt: new Date().toISOString() } },
      holdings: holding ? [...s.holdings.filter((h) => h.ticker !== t), { ticker: t, ...holding }] : s.holdings.filter((h) => h.ticker !== t),
      watchlist: holding ? s.watchlist.filter((w) => w !== t) : [...new Set([...s.watchlist, t])],
    }));
  }, [fmp, update]);

  const removeStock = useCallback((symbol: string) => {
    const t = symbol.toUpperCase();
    update((s) => {
      const cache = { ...s.cache };
      delete cache[t];
      return { ...s, cache, holdings: s.holdings.filter((h) => h.ticker !== t), watchlist: s.watchlist.filter((w) => w !== t) };
    });
  }, [update]);

  const saveApiKey = useCallback(async (key: string) => {
    const k = key.trim();
    if (!k) throw new Error('Paste your key first.');
    if (isHostedPreview) throw new Error(PREVIEW_MESSAGE);
    await createFmp({ apiKey: k, baseUrl: FMP_BASE }).quote('AAPL'); // throws a clear error if the key is rejected
    update((s) => ({ ...s, apiKey: k }));
  }, [update]);

  const value: AppState = {
    ready, mode,
    scheme: p.themePref === 'system' ? (system === 'dark' ? 'dark' : 'light') : p.themePref,
    themePref: p.themePref,
    setThemePref: (t) => update((s) => ({ ...s, themePref: t })),
    learnMode: p.learnMode,
    setLearnMode: (m) => update((s) => ({ ...s, learnMode: m })),
    apiKey: p.apiKey,
    saveApiKey,
    clearApiKey: () => update((s) => ({ ...s, apiKey: null })),
    holdings,
    watchlist: watchList.flatMap((t) => (reports[t] ? [reports[t]!] : [])),
    companies,
    reportFor: (t) => reports[t.toUpperCase()],
    isOwned: (t) => owned.has(t.toUpperCase()),
    isTracked: (t) => owned.has(t.toUpperCase()) || watchList.includes(t.toUpperCase()),
    changes,
    totals,
    status,
    refresh,
    search,
    addStock,
    removeStock,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppStateProvider');
  return v;
}

export function useTheme() {
  const { scheme } = useApp();
  return { scheme, c: palettes[scheme], v: verdictColors[scheme] };
}
