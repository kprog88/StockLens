import { CONFIG } from '../config';
import type { Check, CompanyData, Rating3, SectionResult } from '../types';
import {
  confidenceOf, fiscalYears, grossMargin, growth, lastFiscal, money, pickLabel, scoreChecks, stdev,
} from '../util';

const C = CONFIG.business;
const SCALE: SectionResult['scaleLabels'] = ['Avoid', 'Weak', 'Okay', 'Like it', 'Love it'];

export function scoreBusiness(d: CompanyData): SectionResult {
  const q = d.qualitative;
  const years = fiscalYears(d.annuals);
  const first = years[0]!;
  const last = lastFiscal(d.annuals);
  const yoy = years.slice(1).map((a, i) => growth(years[i]!.revenue, a.revenue));
  const vol = stdev(yoy);
  const anyDecline = yoy.some((g) => g < 0);

  // 1. Predictability --------------------------------------------------------
  let pred: Rating3 | null;
  if (q.recurringRevenueShare !== null) {
    pred = q.recurringRevenueShare >= C.recurringShare.good ? 'good'
      : q.recurringRevenueShare >= C.recurringShare.mid ? 'mid' : 'bad';
  } else {
    pred = vol < C.growthVolatility.good ? 'good' : vol < C.growthVolatility.mid ? 'mid' : 'bad';
  }
  if (anyDecline && pred === 'good') pred = 'mid';
  const recurringTxt = q.recurringRevenueShare !== null
    ? `About ${Math.round(q.recurringRevenueShare * 100)}% of revenue renews automatically`
    : `Yearly revenue growth varied by ${(vol * 100).toFixed(0)} points`;
  const predictable: Check = {
    id: 'predictable',
    question: 'How predictable is revenue?',
    rating: pred,
    options: ['Unpredictable', 'Modest', 'Predictable'],
    label: pickLabel(pred, ['Unpredictable', 'Modest', 'Predictable']),
    explanation: `${recurringTxt}, and revenue went from ${money(first.revenue, d.currency)} in ${first.period} to ${money(last.revenue, d.currency)} in ${last.period}${anyDecline ? ', with at least one down year' : ' without a down year'}.`,
    terms: ['recurring-revenue', 'revenue'],
  };

  // 2. Pricing power ---------------------------------------------------------
  const gmNow = grossMargin(last);
  const gmThen = grossMargin(years[Math.max(0, years.length - 4)]!);
  const gmDelta = (gmNow - gmThen) * 100;
  let price: Rating3;
  if (q.priceRiseWithoutVolumeLoss === true) price = 'good';
  else if (gmDelta <= C.grossMarginTrend.falling) price = 'bad';
  else price = 'mid';
  const pricing: Check = {
    id: 'pricing',
    question: 'Can the company raise prices?',
    rating: price,
    options: ['No', 'Sometimes', 'Easily'],
    label: pickLabel(price, ['No', 'Sometimes', 'Easily']),
    explanation:
      (q.priceRiseWithoutVolumeLoss === true
        ? 'It has raised prices without losing customers. '
        : q.priceRiseWithoutVolumeLoss === false
          ? 'Past price rises cost it customers or volume. '
          : 'There is no disclosed proof that prices can rise without losing customers. ')
      + `Gross margin moved ${gmDelta >= 0 ? 'up' : 'down'} ${Math.abs(gmDelta).toFixed(1)} points over three years to ${(gmNow * 100).toFixed(1)}%.`,
    terms: ['gross-margin', 'pricing-power'],
  };

  // 3. Recession resistance --------------------------------------------------
  let rec: Rating3 | null;
  let recTxt: string;
  if (q.recessionRevenueChange !== null) {
    rec = q.recessionRevenueChange >= C.recessionChange.good ? 'good'
      : q.recessionRevenueChange >= C.recessionChange.mid ? 'mid' : 'bad';
    recTxt = `In the last recession revenue changed ${(q.recessionRevenueChange * 100).toFixed(0)}%.`;
  } else if (q.essentialSpend !== null) {
    rec = q.essentialSpend ? 'good' : 'mid';
    recTxt = q.essentialSpend
      ? 'Customers need what it sells even in bad times.'
      : 'Customers can cut this spending in a downturn, and revenue has not yet been tested by a major recession.';
  } else {
    rec = null;
    recTxt = 'Not enough history to judge how it behaves in a recession.';
  }
  const recession: Check = {
    id: 'recession',
    question: 'How recession-proof is it?',
    rating: rec,
    options: ['Weak', 'Okay', 'Strong'],
    label: pickLabel(rec, ['Weak', 'Okay', 'Strong']),
    explanation: recTxt,
    terms: ['recession-resistance'],
  };

  // 4. Competitive position --------------------------------------------------
  const rank = q.marketShareRank;
  const comp: Rating3 | null = rank === null ? null : rank === 1 ? 'good' : rank <= 3 ? 'mid' : 'bad';
  const competitive: Check = {
    id: 'competitive',
    question: 'What is its competitive position?',
    rating: comp,
    options: ['Weak', 'Average', 'Dominant'],
    label: pickLabel(comp, ['Weak', 'Average', 'Dominant'], 'Average'),
    explanation: rank === null
      ? `${d.name} is a large player, but no sourced rank or market share is disclosed, so leadership cannot be proven.`
      : `It ranks #${rank} in its main market.`,
    terms: ['market-share'],
  };

  const checks = [predictable, pricing, recession, competitive];
  const score = scoreChecks(checks);
  const good = checks.filter((c) => c.rating === 'good').length;
  return {
    id: 'business',
    title: 'Business quality',
    score,
    label: SCALE[score - 1]!,
    scaleLabels: SCALE,
    checks,
    metrics: [
      { id: 'gm', label: 'Gross margin', value: gmNow, display: `${(gmNow * 100).toFixed(1)}%`, term: 'gross-margin' },
    ],
    explanation: `${good} of 4 quality checks come out strong; undisclosed answers count as average.`,
    soWhat: score >= 4
      ? 'A predictable business is easier to value and less likely to surprise you badly.'
      : score === 3
        ? 'A decent business, but at least one weak spot means less room for error in the price you pay.'
        : 'An unpredictable business makes any valuation a guess — demand a big discount or pass.',
    confidence: confidenceOf(checks),
    rules: checks.map((c) => `business.${c.id}.${c.rating ?? 'undisclosed'}`),
  };
}
