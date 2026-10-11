import type { Check } from '@stocklens/engine';
import { money } from '@stocklens/engine';
import { useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { IconCheck, IconMinus, IconX } from '@/components/icons';
import { Txt } from '@/components/ui';
import { useTheme } from '@/state/app-state';
import { fonts, radius } from '@/theme/tokens';

type Palette = ReturnType<typeof useTheme>['c'];

/** Colour for a 1–5 score where 5 is always "good" (risk is scored 5 = very low). */
export function scoreTone(c: Palette, score: number) {
  return score >= 4 ? c.upFill : score === 3 ? c.midBar : c.downFill;
}
export function scoreTextTone(score: number): 'up' | 'mid' | 'down' {
  return score >= 4 ? 'up' : score === 3 ? 'mid' : 'down';
}

function useWidth(initial = 300) {
  const [w, setW] = useState(initial);
  return [w, (e: LayoutChangeEvent) => setW(Math.max(1, e.nativeEvent.layout.width))] as const;
}

export function ScoreDots({ score, color }: { score: number; color: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3 }} accessibilityLabel={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((k) => (
        <View key={k} style={{ width: 14, height: 6, borderRadius: 3, backgroundColor: k <= score ? color : c.track }} />
      ))}
    </View>
  );
}

/** The 1–5 step indicator at the top of each card. */
export function Stepper({ score, labels }: { score: number; labels: readonly string[] }) {
  const { c } = useTheme();
  const col = scoreTone(c, score);
  return (
    <View
      accessibilityLabel={`${score} of 5: ${labels[score - 1]}`}
      style={{ backgroundColor: c.surface, borderColor: c.outline, borderWidth: 1.5, borderRadius: radius.xl, paddingVertical: 14, paddingHorizontal: 8, flexDirection: 'row' }}>
      {labels.map((l, i) => {
        const on = i + 1 === score;
        return (
          <View key={l} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <View style={{ height: 34, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
              {i > 0 && <View style={{ position: 'absolute', left: 0, right: '50%', height: 2, backgroundColor: c.track }} />}
              {i < 4 && <View style={{ position: 'absolute', left: '50%', right: 0, height: 2, backgroundColor: c.track }} />}
              <View style={{
                width: on ? 32 : 20, height: on ? 32 : 20, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
                backgroundColor: on ? col : c.surface, borderWidth: 1.5, borderColor: on ? c.outline : c.line2,
              }}>
                <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.monoSemibold, fontSize: on ? 14 : 10, color: on ? '#121513' : c.muted }}>{i + 1}</Text>
              </View>
            </View>
            <Text maxFontSizeMultiplier={1.2} numberOfLines={2} style={{ textAlign: 'center', fontFamily: on ? fonts.bold : fontFamilyFor(false), fontSize: 11.5, color: on ? c.text : c.muted }}>{l}</Text>
          </View>
        );
      })}
    </View>
  );
}
const fontFamilyFor = (bold: boolean) => (bold ? fonts.bold : fonts.regular);

export function ScoreRing({ value, color, size = 84 }: { value: number; color: string; size?: number }) {
  const { c } = useTheme();
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} accessibilityLabel={`Quality ${value.toFixed(1)} out of 5`}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.track} strokeWidth={8} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={8} fill="none" strokeLinecap="round"
        strokeDasharray={`${(value / 5) * circ} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <SvgText x={size / 2} y={size / 2 + 7} textAnchor="middle" fill={c.text} fontFamily={fonts.monoSemibold} fontSize={20}>{value.toFixed(1)}</SvgText>
    </Svg>
  );
}

export function Sparkline({ values, color, height = 80 }: { values: number[]; color: string; height?: number }) {
  const [w, onLayout] = useWidth();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 6 - ((v - min) / (max - min || 1)) * (height - 12)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={w} height={height}>
        <Path d={`${d} L${w} ${height} L0 ${height} Z`} fill={color} fillOpacity={0.1} />
        <Path d={d} stroke={color} strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

/** Cheap / fair / expensive bar with a "now" marker. */
export function BandBar({ price, cheapBelow, expensiveAbove, currency }: { price: number; cheapBelow: number; expensiveAbove: number; currency: string }) {
  const { c, v } = useTheme();
  const lo = Math.min(price, cheapBelow) * 0.75;
  const hi = Math.max(price, expensiveAbove) * 1.15;
  const pos = (x: number) => ((x - lo) / (hi - lo)) * 100;
  const a = pos(cheapBelow);
  const b = pos(expensiveAbove);
  const now = Math.min(98, Math.max(2, pos(price)));
  const seg = (flex: number, bg: string, fg: string, label: string) => (
    <View style={{ flex, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1.2} numberOfLines={1} style={{ color: fg, fontFamily: fonts.bold, fontSize: 10.5, letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );
  return (
    <View accessibilityLabel={`Now ${money(price, currency)}. Cheap below ${money(cheapBelow, currency)}, expensive above ${money(expensiveAbove, currency)}.`}>
      <View style={{ height: 22 }}>
        <Txt v="num" style={{ position: 'absolute', left: `${Math.min(70, Math.max(0, now - 8))}%`, fontFamily: fonts.monoSemibold }}>Now {money(price, currency)}</Txt>
      </View>
      <View>
        <View style={{ flexDirection: 'row', height: 32, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: c.outline }}>
          {seg(a, v.BUY.bg, v.BUY.fg, 'CHEAP')}
          {seg(b - a, v.PASS.bg, v.PASS.fg, 'FAIR')}
          {seg(100 - b, v.SELL.bg, v.SELL.fg, 'PRICEY')}
        </View>
        <View style={{ position: 'absolute', left: `${now}%`, top: -8, width: 3, height: 48, marginLeft: -1.5, borderRadius: 2, backgroundColor: c.text }} />
      </View>
      <View style={{ height: 20, marginTop: 6 }}>
        <Txt v="num" tone="muted" style={{ position: 'absolute', left: `${a}%`, marginLeft: -18, fontSize: 12 }}>{money(cheapBelow, currency)}</Txt>
        <Txt v="num" tone="muted" style={{ position: 'absolute', left: `${b}%`, marginLeft: -18, fontSize: 12 }}>{money(expensiveAbove, currency)}</Txt>
      </View>
    </View>
  );
}

/** Multiple history with cheap / fair / expensive bands (Valuation card). */
export function MultipleChart({ history, bands, current, height = 190 }: {
  history: number[]; bands: { cheapBelow: number; average: number; expensiveAbove: number }; current: number; height?: number;
}) {
  const { c } = useTheme();
  const [w, onLayout] = useWidth();
  const min = Math.min(...history, current) * 0.9;
  const max = Math.max(...history) * 1.05;
  const y = (x: number) => height - ((x - min) / (max - min)) * height;
  const step = w / (history.length - 1);
  const d = history.map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <View onLayout={onLayout} style={{ height }}>
      <Svg width={w} height={height}>
        <Rect x={0} y={0} width={w} height={y(bands.expensiveAbove)} fill={c.down} fillOpacity={0.08} />
        <Rect x={0} y={y(bands.expensiveAbove)} width={w} height={y(bands.cheapBelow) - y(bands.expensiveAbove)} fill={c.muted} fillOpacity={0.06} />
        <Rect x={0} y={y(bands.cheapBelow)} width={w} height={height - y(bands.cheapBelow)} fill={c.up} fillOpacity={0.09} />
        <Line x1={0} x2={w} y1={y(bands.average)} y2={y(bands.average)} stroke={c.faint} strokeDasharray="4 4" />
        <Path d={d} stroke={c.text} strokeWidth={1.6} fill="none" strokeLinejoin="round" />
        <Circle cx={w - 5} cy={y(current)} r={6} fill={c.midBar} stroke={c.outline} strokeWidth={2} />
      </Svg>
    </View>
  );
}

/** Two series (revenue vs. profit metric) on one chart, as on the Phase card. */
export function DualLine({ a, b, labels, height = 150 }: { a: number[]; b: number[]; labels: string[]; height?: number }) {
  const { c } = useTheme();
  const [w, onLayout] = useWidth();
  const all = [...a, ...b, 0];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const pad = 16;
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (height - pad * 2);
  const x = (i: number) => 14 + (i / (a.length - 1)) * (w - 28);
  const line = (s: number[]) => s.map((v, i) => `${i ? 'L' : 'M'}${x(i)} ${y(v)}`).join(' ');
  return (
    <View>
      <View onLayout={onLayout} style={{ height }}>
        <Svg width={w} height={height}>
          <Line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={c.line2} strokeDasharray="3 4" />
          <Path d={line(a)} stroke={c.upFill} strokeWidth={2.6} fill="none" />
          <Path d={line(b)} stroke={c.info} strokeWidth={2.4} fill="none" />
          {a.map((v, i) => <Circle key={`a${i}`} cx={x(i)} cy={y(v)} r={4} fill={c.upFill} stroke={c.outline} />)}
          {b.map((v, i) => <Circle key={`b${i}`} cx={x(i)} cy={y(v)} r={4} fill={c.info} stroke={c.outline} />)}
        </Svg>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
        {labels.map((l) => <Txt key={l} v="caption" tone="faint">{l.replace('FY20', 'FY')}</Txt>)}
      </View>
    </View>
  );
}

/** Yearly growth bars (Growth card). */
export function GrowthBars({ values, labels, height = 120 }: { values: number[]; labels: string[]; height?: number }) {
  const { c } = useTheme();
  const max = Math.max(...values.map(Math.abs), 0.01);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        {values.map((v, i) => (
          <View key={labels[i]} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Txt v="num" tone={v >= 0 ? 'up' : 'down'} style={{ fontSize: 11.5 }}>{`${v >= 0 ? '+' : '−'}${Math.abs(v * 100).toFixed(0)}%`}</Txt>
            <View style={{ width: '100%', maxWidth: 34, height: Math.max(4, (Math.abs(v) / max) * (height - 26)), borderRadius: 6, backgroundColor: v >= 0 ? c.upFill : c.downFill, borderWidth: 1.5, borderColor: c.outline }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {labels.map((l) => <Txt key={l} v="caption" tone="faint" style={{ flex: 1, textAlign: 'center' }}>{l.replace('FY20', 'FY')}</Txt>)}
      </View>
    </View>
  );
}

/** Beat / miss dots for the last 8 quarters (Management card). */
export function BeatDots({ rows }: { rows: { period: string; actual: number; estimate: number | null; display: string }[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {rows.map((r) => {
        const beat = r.estimate === null || r.actual >= r.estimate;
        return (
          <View key={r.period} style={{ alignItems: 'center', gap: 5, flex: 1 }} accessibilityLabel={`${r.period}: ${beat ? 'beat' : 'missed'}`}>
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.mono, fontSize: 10.5, color: beat ? c.up : c.down }}>{r.display}</Text>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: beat ? c.upFill : c.downFill, borderWidth: 1.5, borderColor: c.outline }} />
            <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.regular, fontSize: 9.5, color: c.faint }}>{r.period.replace(' 20', "'")}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** A 3-option check (bad / mid / good) with the selected answer highlighted. */
export function CheckOptions({ check }: { check: Check }) {
  const { c } = useTheme();
  const sel = check.rating === 'bad' ? 0 : check.rating === 'good' ? 2 : 1;
  const tone = [c.downFill, c.midBar, c.upFill];
  const Icon = [IconX, IconMinus, IconCheck];
  return (
    <View style={{ flexDirection: 'row' }} accessibilityLabel={`${check.question} ${check.label}${check.rating === null ? ' (not disclosed)' : ''}`}>
      {check.options.map((o, i) => {
        const on = i === sel;
        const I = Icon[i]!;
        return (
          <View key={o || i} style={{ flex: 1, alignItems: 'center', gap: 6, opacity: on ? 1 : 0.45 }}>
            <View style={{
              width: on ? 44 : 32, height: on ? 44 : 32, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
              backgroundColor: on ? tone[i] : 'transparent', borderWidth: 1.5, borderColor: on ? c.outline : tone[i],
            }}>
              <I color={on ? '#121513' : tone[i]!} size={on ? 22 : 16} />
            </View>
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: on ? fonts.bold : fonts.regular, fontSize: 12.5, color: on ? c.text : c.muted, textAlign: 'center' }}>{o}</Text>
          </View>
        );
      })}
    </View>
  );
}
