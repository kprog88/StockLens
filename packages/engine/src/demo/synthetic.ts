import type { CompanyData } from '../types';
import { series, year } from './build';

// Fictional companies that exercise the other rule paths. Names are invented
// on purpose so nobody mistakes them for real research.

/** Defensive brand, priced richly → HOLD if owned, PASS if not. */
export const STDY: CompanyData = {
  ticker: 'STDY', name: 'Steady Beverage Co. (demo)', exchange: 'DEMO', currency: 'USD',
  price: 71.2, asOf: '2026-10-09', source: 'Fictional demo company',
  annuals: [
    year('FY2021', { rev: 38.0, gp: 23.0, op: 11.0, ni: 9.5, eps: 2.2, ocf: 12.0, capex: 1.4, int: 1.1, debt: 42, cash: 10, div: 7.2, bb: 0.5 }),
    year('FY2022', { rev: 40.0, gp: 23.9, op: 11.6, ni: 9.9, eps: 2.3, ocf: 11.8, capex: 1.5, int: 1.2, debt: 40, cash: 9.5, div: 7.6, bb: 0.6 }),
    year('FY2023', { rev: 42.0, gp: 25.2, op: 12.3, ni: 10.6, eps: 2.46, ocf: 11.6, capex: 1.7, int: 1.3, debt: 40, cash: 9.0, div: 7.9, bb: 0.6 }),
    year('FY2024', { rev: 44.0, gp: 26.6, op: 12.9, ni: 11.0, eps: 2.55, ocf: 11.0, capex: 2.0, int: 1.5, debt: 42, cash: 9.5, div: 8.4, bb: 0.8 }),
    year('FY2025', { rev: 46.0, gp: 27.9, op: 13.6, ni: 11.5, eps: 2.67, ocf: 11.4, capex: 2.1, int: 1.5, debt: 42, cash: 10, div: 8.8, bb: 0.9 }),
    year('LTM', { rev: 47.0, gp: 28.5, op: 13.9, ni: 11.7, eps: 2.72, ocf: 11.6, capex: 2.1, int: 1.5, debt: 42, cash: 10.5, div: 8.9, bb: 0.9 }),
  ],
  quarters: [6, 7, 8, 9, 10, 11, 12, 13].map((i) => ({
    period: `Q${(i % 4) + 1} ${2024 + Math.floor((i - 6 + 2) / 4)}`,
    revenue: 11e9 + i * 0.1e9, revenueEstimate: 10.95e9 + i * 0.1e9 + (i === 9 ? 0.3e9 : 0),
    eps: 0.66 + i * 0.01, epsEstimate: 0.65 + i * 0.01 + (i === 12 ? 0.05 : 0),
  })),
  peHistory: series([[0, 26], [60, 24], [120, 23], [180, 25], [230, 24], [259, 26.2]], 260, 0.05, 7),
  psHistory: series([[0, 6], [259, 6.5]], 260, 0.04, 7),
  ratios: { pe: 26.2, ps: 6.5, pb: 11.0, pfcf: 32.0 },
  qualitative: {
    recurringRevenueShare: null, recessionRevenueChange: -0.03, essentialSpend: true, marketShareRank: 1,
    priceRiseWithoutVolumeLoss: true, topCustomerShare: 0.06, disruptionThreat: 'no', outsideDependence: 'some',
    industryGrowth: 'slow', newOfferingsRoom: 'possible',
    moat: { switchingCosts: 'weak', networkEffects: 'none', intangibleAssets: 'strong', lowCostProduction: 'moderate', counterPositioning: 'none' },
    moatEvidence: {
      intangibleAssets: 'Raised prices three years running while unit volume grew.',
      lowCostProduction: 'Global bottling scale gives the lowest cost per case in the category.',
    },
  },
  management: { ceoName: '[CEO NAME]', ceoTitle: 'CEO', ceoTenureYears: 8, insiderOwnershipPct: 0.05, insiderOwnershipValue: 60e6, employeeRating: 4.2 },
};

/** Fast-growing subscription software, cheap vs. its history → BUY. */
export const CLDY: CompanyData = {
  ticker: 'CLDY', name: 'Cloudnine Software (demo)', exchange: 'DEMO', currency: 'USD',
  price: 42.5, asOf: '2026-10-09', source: 'Fictional demo company',
  annuals: [
    year('FY2021', { rev: 0.8, gp: 0.58, op: -0.25, ni: -0.27, eps: -0.6, ocf: -0.05, capex: 0.03, int: 0.01, debt: 0.5, cash: 1.5 }),
    year('FY2022', { rev: 1.12, gp: 0.83, op: -0.22, ni: -0.24, eps: -0.52, ocf: 0.02, capex: 0.04, int: 0.01, debt: 0.5, cash: 1.4 }),
    year('FY2023', { rev: 1.57, gp: 1.19, op: -0.16, ni: -0.18, eps: -0.38, ocf: 0.1, capex: 0.05, int: 0.01, debt: 0.5, cash: 1.5 }),
    year('FY2024', { rev: 2.2, gp: 1.72, op: -0.12, ni: -0.13, eps: -0.27, ocf: 0.22, capex: 0.06, int: 0.01, debt: 0.5, cash: 1.7 }),
    year('FY2025', { rev: 3.05, gp: 2.44, op: -0.08, ni: -0.09, eps: -0.18, ocf: 0.4, capex: 0.08, int: 0.01, debt: 0.5, cash: 2.0 }),
    year('LTM', { rev: 3.15, gp: 2.53, op: -0.05, ni: -0.06, eps: -0.12, ocf: 0.48, capex: 0.09, int: 0.01, debt: 0.5, cash: 2.1 }),
  ],
  quarters: ['Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026'].map((p, i) => ({
    period: p, revenue: 0.5 * 1.085 ** i * 1e9, revenueEstimate: (0.5 * 1.085 ** i - 0.01 + (i === 2 || i === 5 ? 0.02 : 0)) * 1e9,
    eps: -0.08 + i * 0.006, epsEstimate: -0.09 + i * 0.006 + (i === 3 || i === 6 ? 0.02 : 0),
  })),
  peHistory: [],
  psHistory: series([[0, 28], [40, 12], [100, 16], [170, 14], [220, 11], [259, 7.4]], 260, 0.06, 11),
  ratios: { pe: null, ps: 7.4, pb: 9.0, pfcf: 52.0 },
  qualitative: {
    recurringRevenueShare: 0.9, recessionRevenueChange: null, essentialSpend: null, marketShareRank: 3,
    priceRiseWithoutVolumeLoss: null, topCustomerShare: 0.04, disruptionThreat: 'some', outsideDependence: 'some',
    industryGrowth: 'fast', newOfferingsRoom: 'likely',
    moat: { switchingCosts: 'strong', networkEffects: 'weak', intangibleAssets: 'weak', lowCostProduction: 'none', counterPositioning: 'none' },
    moatEvidence: { switchingCosts: 'Customers build workflows on the platform; net revenue retention is above 120%.' },
  },
  management: { ceoName: '[CEO NAME]', ceoTitle: 'Founder & CEO', ceoTenureYears: 3, insiderOwnershipPct: 8, insiderOwnershipValue: 900e6, employeeRating: 3.8 },
};

/** Shrinking, indebted retailer with falling margins → SELL. */
export const FADE: CompanyData = {
  ticker: 'FADE', name: 'Fading Retail Group (demo)', exchange: 'DEMO', currency: 'USD',
  price: 12.4, asOf: '2026-10-09', source: 'Fictional demo company',
  annuals: [
    year('FY2021', { rev: 12.0, gp: 4.2, op: 0.6, ni: 0.35, eps: 1.4, ocf: 0.8, capex: 0.4, int: 0.2, debt: 4.0, cash: 0.6, div: 0.15 }),
    year('FY2022', { rev: 12.4, gp: 4.2, op: 0.55, ni: 0.3, eps: 1.2, ocf: 0.7, capex: 0.4, int: 0.22, debt: 4.2, cash: 0.5, div: 0.15 }),
    year('FY2023', { rev: 11.8, gp: 3.9, op: 0.42, ni: 0.18, eps: 0.72, ocf: 0.55, capex: 0.38, int: 0.24, debt: 4.4, cash: 0.4, div: 0.15 }),
    year('FY2024', { rev: 11.1, gp: 3.5, op: 0.3, ni: 0.06, eps: 0.24, ocf: 0.45, capex: 0.35, int: 0.26, debt: 4.6, cash: 0.35, div: 0.08 }),
    year('FY2025', { rev: 10.4, gp: 3.12, op: 0.22, ni: 0.01, eps: 0.04, ocf: 0.4, capex: 0.33, int: 0.28, debt: 4.8, cash: 0.3 }),
    year('LTM', { rev: 10.1, gp: 2.98, op: 0.18, ni: -0.03, eps: -0.12, ocf: 0.36, capex: 0.32, int: 0.29, debt: 4.9, cash: 0.28 }),
  ],
  quarters: ['Q3 2024', 'Q4 2024', 'Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026'].map((p, i) => ({
    period: p, revenue: (2.8 - i * 0.04) * 1e9, revenueEstimate: (2.85 - i * 0.04) * 1e9,
    eps: 0.05 - i * 0.01, epsEstimate: 0.06 - i * 0.01 + (i === 4 ? -0.02 : 0),
  })),
  peHistory: [],
  psHistory: series([[0, 0.5], [100, 0.35], [200, 0.25], [259, 0.2]], 260, 0.05, 5),
  ratios: { pe: null, ps: 0.2, pb: 0.9, pfcf: 62 },
  qualitative: {
    recurringRevenueShare: 0, recessionRevenueChange: -0.18, essentialSpend: false, marketShareRank: 5,
    priceRiseWithoutVolumeLoss: false, topCustomerShare: null, disruptionThreat: 'yes', outsideDependence: 'alot',
    industryGrowth: 'slow', newOfferingsRoom: 'unlikely',
    moat: { switchingCosts: 'none', networkEffects: 'none', intangibleAssets: 'weak', lowCostProduction: 'none', counterPositioning: 'none' },
    disruptionNotes: ['online marketplaces undercutting store prices', 'landlords raising rents on remaining leases'],
  },
  management: { ceoName: '[CEO NAME]', ceoTitle: 'CEO', ceoTenureYears: 1, insiderOwnershipPct: 0.1, insiderOwnershipValue: 2e6, employeeRating: 2.9 },
};
