import { CONFIG } from '../config';
import type { Check, CompanyData, Rating3, SectionResult } from '../types';
import { confidenceOf, fcf, lastFiscal, money, pickLabel, scoreChecks } from '../util';

// 5 = very LOW risk.
const SCALE: SectionResult['scaleLabels'] = ['Very high', 'High', 'Moderate', 'Low', 'Very low'];

export function scoreRisk(d: CompanyData): SectionResult {
  const R = CONFIG.risk;
  const q = d.qualitative;
  const f = lastFiscal(d.annuals);

  const top = q.topCustomerShare;
  const div: Rating3 | null = top === null ? null : top < R.topCustomer.good ? 'good' : top < R.topCustomer.mid ? 'mid' : 'bad';
  const diversified: Check = {
    id: 'diversified',
    question: 'How diversified are revenues?',
    rating: div,
    options: ['Concentrated', 'Moderate', 'Diversified'],
    label: pickLabel(div, ['Concentrated', 'Moderate', 'Diversified']),
    explanation: top === null
      ? 'Customer concentration is not disclosed.'
      : top < R.topCustomer.good
        ? 'No customer reaches a tenth of sales, so losing any single buyer would barely be noticed.'
        : `The largest customer is ${Math.round(top * 100)}% of sales — losing it would hurt.`,
    terms: ['customer-concentration'],
  };

  const dis: Rating3 | null = q.disruptionThreat === null ? null : q.disruptionThreat === 'no' ? 'good' : q.disruptionThreat === 'some' ? 'mid' : 'bad';
  const disruption: Check = {
    id: 'disruption',
    question: 'Is disruption a threat?',
    rating: dis,
    options: ['Yes', 'Some risk', 'No'],
    label: pickLabel(dis, ['Yes', 'Some risk', 'No']),
    explanation: q.disruptionNotes?.length
      ? `The annual report names: ${q.disruptionNotes.join('; ')}.`
      : 'No specific disruption threat is named in the annual report.',
    terms: [],
  };

  const dep: Rating3 | null = q.outsideDependence === null ? null : q.outsideDependence === 'little' ? 'good' : q.outsideDependence === 'some' ? 'mid' : 'bad';
  const control: Check = {
    id: 'control',
    question: 'How much is outside their control?',
    rating: dep,
    options: ['A lot', 'Some', 'Very little'],
    label: pickLabel(dep, ['A lot', 'Some', 'Very little']),
    explanation: 'Suppliers, partners, regulation and currencies the company relies on but cannot control.',
    terms: [],
  };

  const coverage = f.interestExpense > 0 ? f.operatingIncome / f.interestExpense : Infinity;
  const free = fcf(f);
  const yearsToRepay = free > 0 ? (f.totalDebt - f.cash) / free : Infinity;
  const fin: Rating3 =
    coverage >= R.interestCoverage.good && free > 0 && yearsToRepay <= R.debtToFcf.good ? 'good'
    : coverage >= R.interestCoverage.mid && free > 0 && yearsToRepay <= R.debtToFcf.mid ? 'mid' : 'bad';
  const financials: Check = {
    id: 'financials',
    question: 'How healthy are the financials?',
    rating: fin,
    options: ['Weak', 'Mixed', 'Strong'],
    label: pickLabel(fin, ['Weak', 'Mixed', 'Strong']),
    explanation: `Operating profit of ${money(f.operatingIncome, d.currency)} covered ${money(f.interestExpense, d.currency)} of interest ${
      Number.isFinite(coverage) ? `${coverage.toFixed(1)} times` : 'easily'} in ${f.period}, and ${money(free, d.currency)} of free cash flow ${
      free > 0 ? `${fin === 'good' ? 'gives ample room' : 'is thin room'} to service ${money(f.totalDebt, d.currency)} of debt` : 'means debt must be funded from elsewhere'}.`,
    terms: ['interest-coverage', 'free-cash-flow', 'net-debt'],
  };

  const checks = [diversified, disruption, control, financials];
  const score = scoreChecks(checks);
  return {
    id: 'risk',
    title: 'Risk',
    score,
    label: SCALE[score - 1]!,
    scaleLabels: SCALE,
    checks,
    metrics: [
      { id: 'coverage', label: 'Interest coverage', value: Number.isFinite(coverage) ? coverage : null, display: Number.isFinite(coverage) ? `${coverage.toFixed(1)}×` : 'No debt cost', term: 'interest-coverage' },
      { id: 'repay', label: 'Years of FCF to repay net debt', value: Number.isFinite(yearsToRepay) ? yearsToRepay : null, display: Number.isFinite(yearsToRepay) ? Math.max(0, yearsToRepay).toFixed(1) : 'n/a', term: 'net-debt' },
    ],
    explanation: `Risk is rated ${SCALE[score - 1]!.toLowerCase()}: ${checks.filter((c) => c.rating === 'bad').map((c) => c.question.toLowerCase().replace('?', '')).join(', ') || 'no red flags in the four checks'}.`,
    soWhat: score >= 4
      ? 'Low risk means a bad year is unlikely to cause permanent damage — the kind of stock you can hold through a downturn.'
      : 'Higher risk means a wider range of outcomes. Size the position smaller.',
    confidence: confidenceOf(checks),
    rules: checks.map((c) => `risk.${c.id}.${c.rating ?? 'undisclosed'}`),
  };
}
