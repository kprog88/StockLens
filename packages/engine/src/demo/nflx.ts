import type { CompanyData } from '../types';
import { series, year } from './build';

// Netflix, split-adjusted. Figures follow the Stock Simplifier screenshots
// where shown (revenue, OCF, FY2025 operating profit/interest/FCF/debt, P/E,
// beats) and are approximations elsewhere. Demo and test data only — the live
// app reads from the data provider.
export const NFLX: CompanyData = {
  ticker: 'NFLX',
  name: 'Netflix',
  exchange: 'NASDAQ',
  currency: 'USD',
  price: 69.7,
  asOf: '2026-10-09',
  source: 'Demo data (approximate), Oct 2026',
  logoUrl: 'https://images.financialmodelingprep.com/symbol/NFLX.png',
  annuals: [
    year('FY2021', { rev: 29.7, gp: 12.37, op: 6.19, ni: 5.12, eps: 1.12, ocf: 0.393, capex: 0.525, int: 0.765, debt: 15.4, cash: 6.03, bb: 0.6 }),
    year('FY2022', { rev: 31.62, gp: 12.45, op: 5.63, ni: 4.49, eps: 1.0, ocf: 2.03, capex: 0.408, int: 0.706, debt: 14.35, cash: 6.06 }),
    year('FY2023', { rev: 33.72, gp: 13.99, op: 6.95, ni: 5.41, eps: 1.21, ocf: 7.27, capex: 0.349, int: 0.7, debt: 14.54, cash: 7.12, bb: 6.05 }),
    year('FY2024', { rev: 39.0, gp: 17.96, op: 10.42, ni: 8.71, eps: 1.98, ocf: 7.36, capex: 0.44, int: 0.719, debt: 15.58, cash: 7.8, bb: 6.26 }),
    year('FY2025', { rev: 45.18, gp: 21.7, op: 13.33, ni: 11.0, eps: 2.55, ocf: 10.15, capex: 0.69, int: 0.777, debt: 13.46, cash: 9.0, bb: 9.0 }),
    year('LTM', { rev: 48.4, gp: 23.6, op: 14.6, ni: 13.6, eps: 3.18, ocf: 12.0, capex: 0.75, int: 0.78, debt: 13.46, cash: 9.2, bb: 9.5 }),
  ],
  quarters: [
    { period: 'Q3 2024', revenue: 9.8e9, revenueEstimate: 9.77e9, eps: 0.54, epsEstimate: 0.51 },
    { period: 'Q4 2024', revenue: 10.3e9, revenueEstimate: 10.11e9, eps: 0.43, epsEstimate: 0.42 },
    { period: 'Q1 2025', revenue: 10.5e9, revenueEstimate: 10.5e9, eps: 0.66, epsEstimate: 0.57 },
    { period: 'Q2 2025', revenue: 11.1e9, revenueEstimate: 11.07e9, eps: 0.72, epsEstimate: 0.71 },
    { period: 'Q3 2025', revenue: 11.5e9, revenueEstimate: 11.45e9, eps: 0.59, epsEstimate: 0.69 },
    { period: 'Q4 2025', revenue: 12.1e9, revenueEstimate: 11.97e9, eps: 0.56, epsEstimate: 0.55 },
    { period: 'Q1 2026', revenue: 12.3e9, revenueEstimate: 12.16e9, eps: 1.23, epsEstimate: 0.95 },
    { period: 'Q2 2026', revenue: 12.6e9, revenueEstimate: 12.64e9, eps: 0.8, epsEstimate: 0.78 },
  ],
  peHistory: series([[0, 60], [14, 42], [30, 19], [40, 22], [70, 34], [100, 46], [140, 44], [175, 48], [200, 57], [225, 40], [245, 27], [259, 21.9]], 260, 0.07, 3),
  psHistory: series([[0, 11], [30, 3.5], [100, 6.5], [200, 12], [259, 6.0]], 260, 0.05, 3),
  ratios: { pe: 21.9, ps: 6.0, pb: 9.6, pfcf: 26.0 },
  qualitative: {
    recurringRevenueShare: 0.97,
    recessionRevenueChange: null,
    essentialSpend: false,
    marketShareRank: null,
    priceRiseWithoutVolumeLoss: null,
    topCustomerShare: 0.01,
    disruptionThreat: 'some',
    outsideDependence: 'some',
    industryGrowth: 'slow',
    newOfferingsRoom: 'possible',
    moat: { switchingCosts: 'none', networkEffects: 'none', intangibleAssets: 'moderate', lowCostProduction: 'none', counterPositioning: 'none' },
    moatEvidence: {
      intangibleAssets: 'The brand is widely recognized, but no realized price premium over rival streamers, or price rise with no volume loss, is shown.',
      switchingCosts: 'Members can cancel any month at no cost.',
    },
    disruptionNotes: ['rivals using generative AI more effectively to meet viewer demand', 'piracy offering virtually all content for free'],
  },
  management: {
    ceoName: 'Ted Sarandos', ceoTitle: 'Co-CEO', ceoTenureYears: 6,
    insiderOwnershipPct: 0.195, insiderOwnershipValue: 566e6, employeeRating: 4.1,
  },
};
