# StockLens

A mobile app that analyzes any stock with a fixed 8-step framework (Business → Phase → Moat → Growth → Management → Risk → Valuation → Verdict), scores each step 1–5, and ends with a transparent **SELL / PASS / HOLD / WATCH / BUY** verdict. Every number can be tapped to learn what it means and how it moves the price.

> Educational analysis, not financial advice.

## What's built

| Part | Status |
|---|---|
| `packages/engine` — deterministic scoring engine | ✅ 8 sections, verdict matrix, triggers, for/against, daily diff, 30-term glossary + quizzes, 36 passing tests |
| `packages/engine/src/providers/fmp.ts` — live data | ✅ Financial Modeling Prep: search, quotes, 5 years of statements, earnings vs. estimates, price history → engine input; instant re-scoring on each new price |
| `apps/mobile` — Expo app (iOS + Android) in the **Lens** design | ✅ Portfolio of lenses, add/remove stocks (holding or watchlist), stock screen with verdict dial + 7-petal lens + full section cards, Learn flashcards with quick checks, morning digest, light + dark |
| Storage | ✅ Portfolio, key and cached data saved on the device |

## Live data

1. Create a free key at https://site.financialmodelingprep.com/register
2. In the app: **You → Live data**, paste the key, tap **Connect**.
3. Tap **+** to search any ticker, choose *I own it* (shares + average price) or *Watch it*.

What happens then:
- The app downloads 5 years of statements, quarterly results, analyst estimates and prices, and runs the engine.
- Prices refresh every 15 minutes while the app is open, when you pull down, and when you reopen it. Each new price re-scores valuation and the verdict instantly.
- Statements are re-downloaded at most twice a day.
- The first time the app sees a new day, yesterday's verdicts become the baseline, so the Digest shows what changed overnight.

Limits to know:
- FMP's free plan allows ~250 requests a day: adding a stock costs ~10, each price refresh 1 per stock. Comfortable for 10–15 stocks.
- Some exchanges and endpoints need a paid FMP plan; the app explains the error and keeps working with what it has.
- Freshly added stocks have no *reviewed* qualitative inputs (moat sources, insider stake, CEO tenure, employee rating, customer concentration). They count as "not disclosed", lower the confidence shown, and the moat is estimated from sustained margins (capped at *Narrow*). Filling these from annual reports with Claude is the next step.
- The browser preview link can't call FMP (the preview host blocks outside requests), so it runs on demo data only.

## Run it on your phone (5 minutes)

Requirements: Node 20+ on your computer, the **Expo Go** app on your phone (App Store / Play Store), both on the same Wi-Fi.

```bash
cd stocklens
npm install
npm run mobile          # = expo start, inside apps/mobile
```

Scan the QR code with the camera (iPhone) or the Expo Go app (Android). The app follows your phone's light/dark setting; you can override it in Settings.

Other commands:

```bash
npm test                # engine tests (Vitest)
npm run typecheck       # engine + app
cd apps/mobile && npx expo start --web   # quick look in a browser
```

## How the engine decides

All thresholds live in `packages/engine/src/config.ts` (versioned — stored scores record the version). The engine never guesses: an undisclosed input counts as "average" and lowers the confidence shown on the card.

- **Business** — 4 checks (predictable revenue, pricing power, recession resistance, competitive position), each bad/mid/good.
- **Phase** — growing? profitable? returning capital? → Startup · Hyper growth · Operating leverage · Capital return · Decline. Picks the right profit metric (OCF for asset-light, FCF otherwise).
- **Moat** — 5 sources rated none→strong. Width from the best source plus breadth. Direction from the 3-year gross-margin trend, capped at *Stable* when no source is strong.
- **Growth** — 3-year revenue CAGR (EPS leverage is explained but not scored, because margin gains can reverse).
- **Management** — beat rate vs. estimates (last 8 quarters), CEO tenure, insider stake, employee rating.
- **Risk** (5 = very low) — customer concentration, disruption, outside dependence, interest coverage + debt vs. FCF.
- **Valuation** — percentile of the stock's own 5-year multiple (P/E for phases 3–5, P/S for 1–2). Two guards: a multiple within ±10% of its average is never "very" cheap or expensive, and if growth has slowed by more than 3 points the score is capped at *Fair*, because the old multiples were paid for a faster-growing company.
- **Verdict** — quality = Business 20% · Moat 20% · Moat direction 10% · Growth 20% · Management 15% · Risk 15%, then:
  - BUY: quality ≥ 4 and valuation ≥ 4, or quality ≥ 3.5 at a very attractive price
  - WATCH: quality ≥ 3.5 at a fair price
  - HOLD (if owned) / PASS: quality ≥ 3 but the price isn't compelling
  - SELL: quality < 2.5, or the moat is eroding while risk is high

"What would change the verdict" is computed by simulating the nearest price level and the single section change that would flip the result.

## Demo data

- **NFLX** — Netflix, approximated from public figures (as shown in the Stock Simplifier screenshots). Demo and test data only.
- **CLDY, STDY, FADE** — fictional companies that cover the other rule paths: a bargain growth stock (BUY), an expensive defensive brand (HOLD/PASS), and a shrinking, indebted retailer (SELL, flagged as a possible value trap).

## Project layout

```
packages/engine/src/
  types.ts            inputs (CompanyData) and outputs (Report)
  config.ts           every threshold, versioned
  sections/*.ts       one file per section
  verdict.ts          matrix, triggers, bull/bear
  glossary.ts         the education layer (what / why / good-bad / price impact / analogy)
  live.ts             formulas with the company's real numbers plugged in
  diff.ts             yesterday vs. today → digest items
  demo/               demo companies and portfolio
  providers/fmp.ts    Financial Modeling Prep adapter
apps/mobile/src/
  app/                screens (Expo Router)
  components/         ui, charts, the 8 section views
  app/add.tsx         search + add a stock
  components/lens.tsx the lens and the verdict dial
  state/app-state.tsx data layer: storage, live refresh, daily baseline
  theme/tokens.ts     Lens light + dark tokens
```

## Next steps

1. **Qualitative extraction** — have Claude read each company's annual report to fill moat evidence, risks, customer concentration and management facts (with review), which raises confidence.
2. **Server + push** — move the daily re-score to a small backend so the digest arrives as a morning notification even when the app is closed.
3. **Peers** — compare each metric with industry medians on the Learn cards.
4. **Backtest** the verdict thresholds on 5 years of history before trusting them with money.

## Deploying the web version (Vercel)

The repo is ready for Vercel. `vercel.json` sets everything up:

- **Build:** `npm run build:web` (Expo web export), served from `apps/mobile/dist`.
- **Live data:** the browser calls `/api/fmp/...`, and `api/fmp.ts` forwards it to Financial Modeling Prep. That avoids browser cross-site limits. Each user's key stays on their own device and is only passed through, never stored.
- **Routing:** every other path falls back to `index.html`, so deep links like `/stock/NFLX` work.

To deploy: on vercel.com, choose **Add New → Project**, import this GitHub repo, keep the defaults and click **Deploy**. Every push to `main` then redeploys automatically.

## Running on your phone

On Windows, double-click `start-stocklens.bat`; on any system, run `npm install` and then `npm run mobile`. Then scan the QR code with Expo Go.

## CI

GitHub Actions runs the engine tests and the type check on every push and pull request.
