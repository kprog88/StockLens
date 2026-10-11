import type { Verdict } from '@stocklens/engine';
import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import {
  Pressable, ScrollView, Text, View, type RefreshControlProps,
  type StyleProp, type TextProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/state/app-state';
import { fonts, HIT, OUTLINE, radius, space } from '@/theme/tokens';

// --- Typography -------------------------------------------------------------

type Variant = 'hero' | 'display' | 'title' | 'h2' | 'body' | 'bodySm' | 'label' | 'caption' | 'eyebrow' | 'num' | 'numLg' | 'numXl';
type Tone = 'text' | 'soft' | 'muted' | 'faint' | 'up' | 'down' | 'mid' | 'info' | 'inkText' | 'heroText' | 'heroMuted';

const variants: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.display, fontSize: 72, lineHeight: 66, letterSpacing: -3.4 },
  display: { fontFamily: fonts.display, fontSize: 44, lineHeight: 44, letterSpacing: -1.6 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  h2: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 23 },
  bodySm: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 17 },
  eyebrow: { fontFamily: fonts.monoMedium, fontSize: 11, lineHeight: 15, letterSpacing: 0.9, textTransform: 'uppercase' },
  num: { fontFamily: fonts.mono, fontSize: 14, lineHeight: 18 },
  numLg: { fontFamily: fonts.monoMedium, fontSize: 22, lineHeight: 28 },
  numXl: { fontFamily: fonts.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.4 },
};

export function Txt({ v = 'body', tone = 'text', style, ...p }: TextProps & { v?: Variant; tone?: Tone; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  const color = {
    text: c.text, soft: c.textSoft, muted: c.muted, faint: c.faint, up: c.up, down: c.down, mid: c.mid, info: c.info,
    inkText: c.inkText, heroText: c.heroText, heroMuted: c.heroMuted,
  }[tone];
  // maxFontSizeMultiplier keeps layouts intact at the largest accessibility sizes
  // while still honouring the user's text-size setting on iOS and Android.
  return <Text maxFontSizeMultiplier={v === 'hero' || v === 'display' ? 1.2 : 1.6} {...p} style={[variants[v], { color }, style]} />;
}

// --- Layout -----------------------------------------------------------------

/** Scrolling screen that respects notches, status bars and gesture areas. */
export function Screen({ children, bottomInset = 110, refreshControl, contentStyle }: {
  children: ReactNode; bottomInset?: number; refreshControl?: React.ReactElement<RefreshControlProps>; contentStyle?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView
        style={{ flex: 1 }}
        refreshControl={refreshControl}
        contentContainerStyle={[
          { paddingHorizontal: space.xl, paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + bottomInset, gap: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

/** Outlined card. `lift` adds the hard offset shadow reserved for the one card that matters most. */
export function Card({ children, style, tint, lift, dashed }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; tint?: 'info' | 'bull' | 'bear' | 'hero'; lift?: boolean; dashed?: boolean;
}) {
  const { c } = useTheme();
  const bg = tint === 'info' ? c.infoBg : tint === 'bull' ? c.bullBg : tint === 'bear' ? c.bearBg : tint === 'hero' ? c.hero : dashed ? 'transparent' : c.surface;
  const border = tint === 'hero' ? c.hero : tint === 'bull' ? c.bullLine : tint === 'bear' ? c.bearLine : c.outline;
  return (
    <View style={[
      {
        backgroundColor: bg, borderColor: border, borderWidth: OUTLINE, borderStyle: dashed ? 'dashed' : 'solid',
        borderRadius: radius.xl, padding: space.lg, gap: space.md,
      },
      lift && c.shadow !== 'transparent' && { shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 4, height: 4 }, elevation: 0, marginRight: 4, marginBottom: 4 },
      style,
    ]}>
      {children}
    </View>
  );
}

export const Row = ({ children, gap = space.md, style, accessibilityLabel }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string }) => (
  <View accessibilityLabel={accessibilityLabel} style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

// --- Pieces -----------------------------------------------------------------

export function VerdictPill({ verdict, size = 'sm' }: { verdict: Verdict; size?: 'sm' | 'md' }) {
  const { c, v } = useTheme();
  const col = v[verdict];
  return (
    <View style={{ backgroundColor: col.bg, borderRadius: 8, borderWidth: OUTLINE, borderColor: c.outline, paddingHorizontal: size === 'md' ? 10 : 7, paddingVertical: size === 'md' ? 4 : 2 }}>
      <Text maxFontSizeMultiplier={1.3} style={{ color: col.fg, fontFamily: fonts.monoSemibold, fontSize: size === 'md' ? 12 : 11, letterSpacing: 0.6 }}>{verdict}</Text>
    </View>
  );
}

/** ⓘ chip — opens the Learn card for a glossary term, with this stock's numbers. */
export function InfoChip({ term, ticker, label }: { term: string; ticker?: string; label?: string }) {
  const { c } = useTheme();
  return (
    <Link href={{ pathname: '/learn/[term]', params: { term, ...(ticker ? { ticker } : {}) } } as Href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`What is ${label ?? term.replace(/-/g, ' ')}?`}
        hitSlop={14}
        style={{ width: 24, height: 24, borderRadius: 12, borderWidth: OUTLINE, borderColor: c.text, alignItems: 'center', justifyContent: 'center' }}>
        <Text maxFontSizeMultiplier={1.2} style={{ color: c.text, fontFamily: fonts.bold, fontSize: 12 }}>i</Text>
      </Pressable>
    </Link>
  );
}

export function SoWhat({ children }: { children: string }) {
  return (
    <Card tint="info" style={{ gap: 6 }}>
      <Txt v="title" style={{ fontSize: 18, lineHeight: 22 }}>So what?</Txt>
      <Txt>{children}</Txt>
    </Card>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void;
}) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14,
              borderWidth: OUTLINE, borderColor: c.outline, backgroundColor: on ? c.ink : 'transparent', flexGrow: 1,
            }}>
            <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.semibold, fontSize: 14, color: on ? c.inkText : c.text }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconButton({ label, onPress, children, filled, href }: { label: string; onPress?: () => void; children: ReactNode; filled?: string; href?: Href }) {
  const { c } = useTheme();
  const btn = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: HIT, height: HIT, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
        backgroundColor: filled ?? c.surface, borderWidth: OUTLINE, borderColor: c.outline,
      }}>
      {children}
    </Pressable>
  );
  return href ? <Link href={href} asChild>{btn}</Link> : btn;
}

export function Button({ label, onPress, kind = 'ink', disabled, href }: { label: string; onPress?: () => void; kind?: 'ink' | 'outline' | 'accent'; disabled?: boolean; href?: Href }) {
  const { c } = useTheme();
  const bg = kind === 'ink' ? c.ink : kind === 'accent' ? c.info : 'transparent';
  const fg = kind === 'outline' ? c.text : kind === 'accent' ? '#FFFFFF' : c.inkText;
  const btn = (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ minHeight: 52, borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, borderWidth: OUTLINE, borderColor: kind === 'ink' ? c.ink : c.outline, opacity: disabled ? 0.5 : 1 }}>
      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.semibold, fontSize: 15, color: fg }}>{label}</Text>
    </Pressable>
  );
  return href ? <Link href={href} asChild>{btn}</Link> : btn;
}

export function Disclaimer({ text = 'Educational analysis, not financial advice' }: { text?: string }) {
  return <Txt v="caption" tone="faint" style={{ textAlign: 'center', marginTop: space.sm }}>{text}</Txt>;
}
