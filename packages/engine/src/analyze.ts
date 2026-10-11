import { CONFIG } from './config';
import { scoreBusiness } from './sections/business';
import { scoreGrowth } from './sections/growth';
import { scoreManagement } from './sections/management';
import { scoreMoat } from './sections/moat';
import { scorePhase } from './sections/phase';
import { scoreRisk } from './sections/risk';
import { scoreValuation } from './sections/valuation';
import type { CompanyData, Report } from './types';
import { buildVerdict } from './verdict';

export function validate(d: CompanyData): string[] {
  const errs: string[] = [];
  if (d.annuals.length < 4) errs.push('Need at least 4 years of annual financials.');
  if (!(d.price > 0)) errs.push('Price must be positive.');
  if (d.peHistory.length === 0 && d.psHistory.length === 0) errs.push('Need a valuation history.');
  return errs;
}

/** Run the full 8-step analysis. Deterministic: same input → same report. */
export function analyze(d: CompanyData, opts: { owned?: boolean } = {}): Report {
  const errs = validate(d);
  if (errs.length) throw new Error(`${d.ticker}: ${errs.join(' ')}`);
  const phase = scorePhase(d);
  const partial = {
    ticker: d.ticker,
    logoUrl: d.logoUrl,
    name: d.name,
    exchange: d.exchange,
    currency: d.currency,
    price: d.price,
    asOf: d.asOf,
    source: d.source,
    configVersion: CONFIG.version,
    business: scoreBusiness(d),
    phase,
    moat: scoreMoat(d),
    growth: scoreGrowth(d),
    management: scoreManagement(d),
    risk: scoreRisk(d),
    valuation: scoreValuation(d, phase.phase),
  };
  return { ...partial, verdict: buildVerdict(partial, opts.owned ?? false, d.quarters) };
}
