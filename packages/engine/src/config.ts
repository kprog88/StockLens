// Every threshold the engine uses lives here, versioned, so rules can be tuned
// and backtested without touching scoring code. Bump `version` on any change:
// stored scores record the version that produced them.

export const CONFIG = {
  version: '2026.10-2',

  ratingPoints: { bad: 1, mid: 3, good: 5 } as const,

  business: {
    recurringShare: { good: 0.7, mid: 0.4 },
    /** Std-dev of yearly revenue growth. */
    growthVolatility: { good: 0.08, mid: 0.15 },
    /** Gross-margin change (percentage points) over the last 3 years. */
    grossMarginTrend: { rising: 1, falling: -2 },
    recessionChange: { good: 0, mid: -0.1 },
  },

  phase: {
    hyperGrowthRevenue: 0.3,
    /** Capex below this share of revenue counts as asset-light. */
    assetLightCapex: 0.1,
  },

  moat: {
    /** Gross-margin change (pp, 3 years) for each direction step. */
    direction: { widening: 10, growing: 5, eroding: -2, narrowing: -5 },
    /** Margin-based estimate used only when no moat source has been reviewed. */
    proxy: { narrow: { op: 0.15, gross: 0.4 }, thin: { op: 0.05 } },
  },

  growth: {
    /** 3-year revenue CAGR thresholds for scores 5,4,3,2. */
    revenueCagr: [0.2, 0.12, 0.06, 0],
    /** EPS CAGR must beat revenue CAGR by this to add a point. */
    epsLeverageBonus: 0.08,
  },

  management: {
    beatRate: { strong: 0.75, ok: 0.5 },
    tenureYears: 5,
    insiderValue: 100_000_000,
    insiderPct: 1,
    employeeRating: 4.0,
    /** Points for a signal that isn't disclosed (neither rewarded nor punished fully). */
    undisclosedPoints: 1 / 3,
  },

  risk: {
    topCustomer: { good: 0.1, mid: 0.25 },
    interestCoverage: { good: 8, mid: 3 },
    /** Years of free cash flow needed to repay all debt. */
    debtToFcf: { good: 3, mid: 6 },
  },

  valuation: {
    /** Percentile bands of the stock's own multiple history. */
    cheap: 30,
    expensive: 70,
    veryCheap: 10,
    veryExpensive: 90,
    /** Growth slowing by more than this (pp) caps valuation at "Fair":
     *  the old multiples were paid for a faster-growing company. */
    decelerationCap: 0.03,
    /** Within ±this of the 5-yr average, a multiple is never "very" cheap or expensive. */
    nearAverage: 0.1,
  },

  verdict: {
    weights: { business: 0.2, moat: 0.2, moatDirection: 0.1, growth: 0.2, management: 0.15, risk: 0.15 },
    sellQuality: 2.5,
    buy: { quality: 4, valuation: 4 },
    buyOnBargain: { quality: 3.5, valuation: 5 },
    watch: { quality: 3.5, valuation: 3 },
    holdQuality: 3,
  },
} as const;

export type Config = typeof CONFIG;
