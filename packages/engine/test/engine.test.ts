import { describe, expect, it } from 'vitest';
import { analyze, CONFIG, decide, diffReports, GLOSSARY, liveFormula, TERMS } from '../src';
import { CLDY, DEMO_COMPANIES, demoYesterday, FADE, NFLX, STDY } from '../src/demo';
import { percentileRank, percentileValue } from '../src/util';

describe('Netflix (phase 4, asset-light, narrow moat)', () => {
  const r = analyze(NFLX);

  it('detects the lifecycle phase and profit metric', () => {
    expect(r.phase.phase).toBe(4);
    expect(r.phase.profitMetric).toBe('operatingCashFlow');
  });

  it('scores business quality from the four checks', () => {
    const byId = Object.fromEntries(r.business.checks.map((c) => [c.id, c.label]));
    expect(byId).toEqual({ predictable: 'Predictable', pricing: 'Sometimes', recession: 'Okay', competitive: 'Average' });
    expect(r.business.score).toBe(4);
  });

  it('rates the moat narrow and caps direction at Stable without a strong source', () => {
    expect(r.moat.label).toBe('Narrow');
    expect(r.moat.directionLabel).toBe('Stable');
    expect(r.moat.rules).toContain('moat.direction.3.capped');
  });

  it('scores growth, management and risk', () => {
    expect(r.growth.label).toBe('Above avg');
    expect(r.management.label).toBe('Great');
    expect(r.risk.label).toBe('Low');
    expect(r.risk.checks.find((c) => c.id === 'financials')!.explanation).toContain('17.2 times');
  });

  it('values on P/E because it is a mature company', () => {
    expect(r.valuation.metric).toBe('pe');
    expect(r.valuation.percentile).toBeLessThan(10);
    expect(r.valuation.bandPrices.cheapBelow).toBeGreaterThan(r.price);
  });

  it('reaches a verdict with a reason, triggers and both cases', () => {
    expect(r.verdict.quality).toBeCloseTo(3.9, 1);
    expect(r.verdict.verdict).toBe('BUY'); // solid quality + bottom-decile multiple, growth not slowing
    expect(r.verdict.headline).toBe('Solid business, very attractive valuation.');
    expect(r.verdict.triggers.length).toBeGreaterThan(0);
    expect(r.verdict.bull.length).toBeGreaterThan(0);
    expect(r.verdict.bear.length).toBeGreaterThan(0);
  });
});

describe('the other rule paths', () => {
  it('loss-making SaaS: phase 2, valued on P/S → BUY', () => {
    const r = analyze(CLDY);
    expect(r.phase.phase).toBe(2);
    expect(r.valuation.metric).toBe('ps');
    expect(r.moat.label).toBe('Broad');
    expect(r.verdict.verdict).toBe('BUY');
  });

  it('defensive brand at a rich price: HOLD if owned, PASS if not', () => {
    expect(analyze(STDY, { owned: true }).verdict.verdict).toBe('HOLD');
    expect(analyze(STDY).verdict.verdict).toBe('PASS');
    expect(analyze(STDY).moat.label).toBe('Wide');
  });

  it('shrinking, indebted retailer: phase 5 → SELL', () => {
    const r = analyze(FADE);
    expect(r.phase.phase).toBe(5);
    expect(r.risk.score).toBeLessThanOrEqual(2);
    expect(r.verdict.verdict).toBe('SELL');
  });

  it('caps valuation at Fair when growth is slowing sharply', () => {
    const slowing = { ...NFLX, quarters: NFLX.quarters.map((q, i) => (i >= 4 ? { ...q, revenue: NFLX.quarters[i - 4]!.revenue * 1.04 } : q)) };
    const r = analyze(slowing);
    expect(r.valuation.score).toBe(3);
    expect(r.valuation.rules).toContain('valuation.decelerationCap');
  });
});

describe('verdict matrix', () => {
  it.each([
    [4.2, 4, 3, 4, false, 'BUY'],
    [3.6, 5, 3, 4, false, 'BUY'],
    [3.8, 3, 3, 4, false, 'WATCH'],
    [3.8, 2, 3, 4, true, 'HOLD'],
    [3.8, 2, 3, 4, false, 'PASS'],
    [2.8, 4, 3, 4, false, 'PASS'],
    [2.4, 5, 3, 4, true, 'SELL'],
    [3.8, 4, 2, 2, true, 'SELL'],
  ] as const)('quality %s, valuation %s → %s', (q, v, dir, risk, owned, expected) => {
    expect(decide(q, v, dir, risk, owned)).toBe(expected);
  });

  it('weights sum to 1', () => {
    const sum = Object.values(CONFIG.verdict.weights).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('engine guarantees', () => {
  it('is deterministic', () => {
    for (const d of Object.values(DEMO_COMPANIES)) expect(analyze(d)).toEqual(analyze(d));
  });

  it('keeps every score in 1–5 and explains every section', () => {
    for (const d of Object.values(DEMO_COMPANIES)) {
      const r = analyze(d);
      for (const s of [r.business, r.phase, r.moat, r.growth, r.management, r.risk, r.valuation]) {
        expect(s.score).toBeGreaterThanOrEqual(1);
        expect(s.score).toBeLessThanOrEqual(5);
        expect(s.explanation.length).toBeGreaterThan(20);
        expect(s.soWhat.length).toBeGreaterThan(20);
        expect(s.explanation).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('lowers confidence when data is not disclosed', () => {
    const hidden = { ...NFLX, qualitative: { ...NFLX.qualitative, recurringRevenueShare: null, essentialSpend: null, topCustomerShare: null } };
    expect(analyze(hidden).business.confidence).toBeLessThan(analyze(NFLX).business.confidence);
  });

  it('rejects incomplete input instead of guessing', () => {
    expect(() => analyze({ ...NFLX, annuals: NFLX.annuals.slice(0, 2) })).toThrow(/4 years/);
  });

  it('links every term a check references to the glossary', () => {
    for (const d of Object.values(DEMO_COMPANIES)) {
      const r = analyze(d);
      for (const c of [...r.business.checks, ...r.phase.checks, ...r.risk.checks, ...r.growth.checks]) {
        for (const t of c.terms) expect(TERMS[t], `${c.id} → ${t}`).toBeDefined();
      }
      for (const m of [...r.valuation.metrics, ...r.growth.metrics, ...r.risk.metrics]) {
        if (m.term) expect(TERMS[m.term], m.term).toBeDefined();
      }
    }
    for (const t of GLOSSARY) for (const rel of t.related) expect(TERMS[rel], `${t.id} → ${rel}`).toBeDefined();
  });

  it('plugs real numbers into formulas', () => {
    const f = liveFormula('pe-ratio', NFLX)!;
    expect(f.parts[0]!.value).toBe('$69.70');
    expect(f.parts[1]!.value).toBe('$3.18');
    expect(f.result.value).toBe('21.9×');
  });
});

describe('daily digest diff', () => {
  it('explains verdict changes in plain language', () => {
    const changes = diffReports(analyze(demoYesterday(CLDY)), analyze(CLDY));
    const v = changes.find((c) => c.kind === 'verdict');
    expect(v?.to).toBe('BUY');
    expect(v?.headline).toMatch(/Valuation/);
  });

  it('reports nothing when nothing changed', () => {
    expect(diffReports(analyze(NFLX), analyze(NFLX))).toEqual([]);
  });
});

describe('percentile helpers', () => {
  it('ranks and inverts', () => {
    const xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentileValue(xs, 0)).toBe(1);
    expect(percentileValue(xs, 100)).toBe(10);
    expect(percentileRank(xs, 5.5)).toBe(50);
  });
});

describe('quizzes', () => {
  it('only quiz glossary terms', async () => {
    const { QUIZZES } = await import('../src');
    for (const id of Object.keys(QUIZZES)) expect(TERMS[id], id).toBeDefined();
  });
});
