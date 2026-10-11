import type { AnnualFinancials } from '../types';

const B = 1e9;

/** Compact row builder; money in billions. */
export function year(
  period: string,
  v: { rev: number; gp: number; op: number; ni: number; eps: number; ocf: number; capex: number; int: number; debt: number; cash: number; div?: number; bb?: number },
): AnnualFinancials {
  return {
    period,
    revenue: v.rev * B, grossProfit: v.gp * B, operatingIncome: v.op * B, netIncome: v.ni * B, eps: v.eps,
    operatingCashFlow: v.ocf * B, capex: v.capex * B, interestExpense: v.int * B,
    totalDebt: v.debt * B, cash: v.cash * B, dividendsPaid: (v.div ?? 0) * B, buybacks: (v.bb ?? 0) * B,
  };
}

/** Weekly series through anchor points [week, value] with deterministic wiggle. */
export function series(anchors: [number, number][], weeks = 260, wiggle = 0.06, seed = 1): number[] {
  const out: number[] = [];
  for (let w = 0; w < weeks; w++) {
    let i = 0;
    while (i < anchors.length - 2 && anchors[i + 1]![0] <= w) i++;
    const [w0, v0] = anchors[i]!;
    const [w1, v1] = anchors[i + 1]!;
    const t = Math.min(1, Math.max(0, (w - w0) / (w1 - w0)));
    const base = v0 + (v1 - v0) * t;
    const n = Math.sin(w * 0.9 + seed) * 0.6 + Math.sin(w * 0.37 + seed * 2) * 0.4;
    out.push(+(base * (1 + n * wiggle * (w === weeks - 1 ? 0 : 1))).toFixed(2));
  }
  return out;
}
