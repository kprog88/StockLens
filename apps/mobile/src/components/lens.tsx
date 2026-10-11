import type { Report, Verdict } from '@stocklens/engine';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/state/app-state';
import { fonts } from '@/theme/tokens';

export type PetalId = 'business' | 'moat' | 'direction' | 'growth' | 'management' | 'risk' | 'valuation';
export interface Petal { id: PetalId; name: string; score: number; label: string }

/** The seven petals, clockwise from the top. */
export function petalsOf(r: Report): Petal[] {
  return [
    { id: 'business', name: 'Business', score: r.business.score, label: r.business.label },
    { id: 'moat', name: 'Moat', score: r.moat.score, label: r.moat.label },
    { id: 'direction', name: 'Direction', score: r.moat.direction, label: r.moat.directionLabel },
    { id: 'growth', name: 'Growth', score: r.growth.score, label: r.growth.label },
    { id: 'management', name: 'Mgmt', score: r.management.score, label: r.management.label },
    { id: 'risk', name: 'Risk', score: r.risk.score, label: r.risk.label },
    { id: 'valuation', name: 'Value', score: r.valuation.score, label: r.valuation.label },
  ];
}

const f = (x: number) => x.toFixed(1);
function petalPath(cx: number, cy: number, i: number, n: number, L: number) {
  const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
  const w = L * 0.3;
  const ux = Math.cos(a), uy = Math.sin(a), px = -uy, py = ux;
  const mx = cx + ux * L * 0.5, my = cy + uy * L * 0.5;
  return { d: `M${cx} ${cy} Q${f(mx + px * w)} ${f(my + py * w)} ${f(cx + ux * L)} ${f(cy + uy * L)} Q${f(mx - px * w)} ${f(my - py * w)} ${cx} ${cy}Z`, ux, uy };
}

export function useSignal() {
  const { c } = useTheme();
  return (s: number) => (s >= 4 ? c.upFill : s === 3 ? c.midBar : c.downFill);
}

/** Small lens for list tiles. */
export function MiniLens({ report, size = 64 }: { report: Report; size?: number }) {
  const { c } = useTheme();
  const tone = useSignal();
  const ps = petalsOf(report);
  const cx = size / 2, R = size / 2 - 2;
  return (
    <Svg width={size} height={size} accessibilityLabel={`${report.ticker} lens: ${ps.map((p) => `${p.name} ${p.score}`).join(', ')}`}>
      <Circle cx={cx} cy={cx} r={R} fill="none" stroke={c.line} />
      {ps.map((p, i) => (
        <Path key={p.id} d={petalPath(cx, cx, i, 7, 4 + (p.score / 5) * (R - 4)).d} fill={tone(p.score)} stroke={c.outline} strokeWidth={1} />
      ))}
      <Circle cx={cx} cy={cx} r={size / 16} fill={c.ink} />
    </Svg>
  );
}

/** Big interactive lens: tap a petal (or its label) to select it. */
export function Lens({ report, selected, onSelect, width = 320 }: { report: Report; selected: PetalId | null; onSelect: (id: PetalId) => void; width?: number }) {
  const { c } = useTheme();
  const tone = useSignal();
  const ps = petalsOf(report);
  const h = width * 0.94;
  const cx = width / 2, cy = h / 2, R = Math.min(cx, cy) - 46;
  return (
    <Svg width={width} height={h}>
      <Circle cx={cx} cy={cy} r={R} fill="none" stroke={c.line} strokeDasharray="3 4" />
      <Circle cx={cx} cy={cy} r={R * 0.6} fill="none" stroke={c.line} strokeDasharray="3 4" />
      {ps.map((p, i) => {
        const { d, ux, uy } = petalPath(cx, cy, i, 7, 10 + (p.score / 5) * (R - 10));
        const on = selected === p.id;
        const lr = R + 14;
        const lx = cx + ux * lr, ly = cy + uy * lr;
        const anchor = Math.abs(ux) < 0.3 ? 'middle' : ux > 0 ? 'start' : 'end';
        const dy = uy > 0.3 ? 10 : uy < -0.3 ? -10 : 2;
        return [
          <Path key={`p${p.id}`} d={d} fill={tone(p.score)} fillOpacity={selected === null || on ? 1 : 0.45}
            stroke={c.outline} strokeWidth={on ? 2.5 : 1} onPress={() => onSelect(p.id)} />,
          <SvgText key={`l${p.id}`} x={lx} y={ly + dy} textAnchor={anchor} fontFamily={fonts.semibold} fontSize={12.5} fill={c.text} onPress={() => onSelect(p.id)}>{p.name}</SvgText>,
          <SvgText key={`s${p.id}`} x={lx} y={ly + dy + 14} textAnchor={anchor} fontFamily={fonts.mono} fontSize={11} fill={c.muted}>{`${p.score}/5`}</SvgText>,
        ];
      })}
      <Circle cx={cx} cy={cy} r={15} fill={c.ink} />
      <SvgText x={cx} y={cy + 4} textAnchor="middle" fontFamily={fonts.monoSemibold} fontSize={11} fill={c.inkText}>{report.verdict.quality.toFixed(1)}</SvgText>
    </Svg>
  );
}

const ORDER: Verdict[] = ['SELL', 'PASS', 'HOLD', 'WATCH', 'BUY'];

/** Semicircular SELL → BUY gauge with a needle on today's verdict. */
export function VerdictDial({ verdict, width = 300 }: { verdict: Verdict; width?: number }) {
  const { c, v } = useTheme();
  const k = width / 300;
  const cx = 150, cy = 150, ro = 128, ri = 92;
  const at = ORDER.indexOf(verdict);
  const rad = (d: number) => (d * Math.PI) / 180;
  const p = (r: number, a: number) => `${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  const na = rad(180 + at * 36 + 18);
  return (
    <Svg width={width} height={168 * k} viewBox="0 0 300 168" accessibilityLabel={`Verdict dial pointing to ${verdict}`}>
      {ORDER.map((name, i) => {
        const a0 = rad(180 + i * 36 + 1.5), a1 = rad(180 + (i + 1) * 36 - 1.5), am = rad(180 + i * 36 + 18);
        const on = i === at;
        const d = `M${p(ro, a0)} A${ro} ${ro} 0 0 1 ${p(ro, a1)} L${p(ri, a1)} A${ri} ${ri} 0 0 0 ${p(ri, a0)}Z`;
        return [
          <Path key={`a${name}`} d={d} fill={on ? v[name].bg : c.segment} stroke={c.outline} strokeWidth={1.5} />,
          <SvgText key={`t${name}`} x={f(cx + 110 * Math.cos(am))} y={f(cy + 110 * Math.sin(am) + 4)} textAnchor="middle"
            fontFamily={fonts.monoSemibold} fontSize={10.5} fill={on ? v[name].fg : c.muted}>{name}</SvgText>,
        ];
      })}
      <Line x1={cx} y1={cy} x2={f(cx + 84 * Math.cos(na))} y2={f(cy + 84 * Math.sin(na))} stroke={c.ink} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={cx} cy={cy} r={11} fill={c.ink} />
      <Circle cx={cx} cy={cy} r={4} fill={c.surface} />
    </Svg>
  );
}
