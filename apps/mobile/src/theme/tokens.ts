import type { Verdict } from '@stocklens/engine';

// "Lens" design system — same tokens as the design canvas.
// Cool paper, ink outlines, one cobalt accent; strong / middling / weak signal colours.
export const palettes = {
  light: {
    ground: '#E9ECE6',
    surface: '#F8FAF6',
    raised: '#F8FAF6',
    line: '#CDD2CA',
    line2: '#B9BFB6',
    outline: '#121513',
    text: '#121513',
    textSoft: '#2B312C',
    muted: '#565D57',
    faint: '#5F665F',
    segment: '#DDE1DA',
    segmentOn: '#121513',
    segmentOnText: '#F8FAF6',
    ink: '#121513',
    inkText: '#F8FAF6',
    up: '#0E7A45',
    upFill: '#3FBF7F',
    info: '#2340E8',
    mid: '#8A5A00',
    midBar: '#F2B01E',
    down: '#C02F34',
    downFill: '#E5585C',
    infoBg: '#DCE2FF',
    infoLine: '#121513',
    bullBg: '#D6F0E2',
    bullLine: '#121513',
    bearBg: '#F8DADB',
    bearLine: '#121513',
    track: '#DDE1DA',
    scrim: 'rgba(18,21,19,0.35)',
    shadow: '#121513',
    hero: '#121513',
    heroText: '#F3F5F0',
    heroMuted: '#9AA39B',
    heroLine: '#2E3430',
  },
  dark: {
    ground: '#0C0E0D',
    surface: '#171A18',
    raised: '#171A18',
    line: '#2A302C',
    line2: '#3A423C',
    outline: '#3A423C',
    text: '#EEF1EC',
    textSoft: '#C8CEC8',
    muted: '#9AA39B',
    faint: '#8B938C',
    segment: '#1E2220',
    segmentOn: '#EEF1EC',
    segmentOnText: '#0C0E0D',
    ink: '#EEF1EC',
    inkText: '#0C0E0D',
    up: '#3FD18A',
    upFill: '#3FD18A',
    info: '#8C9BFF',
    mid: '#F5C042',
    midBar: '#F5C042',
    down: '#FF6B6F',
    downFill: '#FF6B6F',
    infoBg: '#1C2240',
    infoLine: '#3A423C',
    bullBg: '#12261B',
    bullLine: '#2C5A40',
    bearBg: '#2A1416',
    bearLine: '#5A2C2E',
    track: '#232825',
    scrim: 'rgba(0,0,0,0.6)',
    shadow: 'transparent',
    hero: '#1E2321',
    heroText: '#EEF1EC',
    heroMuted: '#9AA39B',
    heroLine: '#3A423C',
  },
};

export type Palette = typeof palettes.light;
export type Scheme = keyof typeof palettes;

/** Solid verdict chips: `bg` is the fill, `fg` the text on it. */
export const verdictColors: Record<Scheme, Record<Verdict, { bg: string; fg: string }>> = {
  light: {
    BUY: { bg: '#128A50', fg: '#FFFFFF' },
    WATCH: { bg: '#2340E8', fg: '#FFFFFF' },
    HOLD: { bg: '#F2B01E', fg: '#121513' },
    PASS: { bg: '#C3C8C1', fg: '#121513' },
    SELL: { bg: '#D93A3F', fg: '#FFFFFF' },
  },
  dark: {
    BUY: { bg: '#3FD18A', fg: '#0C0E0D' },
    WATCH: { bg: '#8C9BFF', fg: '#0C0E0D' },
    HOLD: { bg: '#F5C042', fg: '#0C0E0D' },
    PASS: { bg: '#6B726C', fg: '#EEF1EC' },
    SELL: { bg: '#FF6B6F', fg: '#0C0E0D' },
  },
};

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  regular: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
  bold: 'InstrumentSans_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoSemibold: 'JetBrainsMono_600SemiBold',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 18, xxl: 24 };
export const radius = { sm: 10, md: 14, lg: 18, xl: 22, xxl: 26, pill: 999 };
export const OUTLINE = 1.5;
/** Minimum touch target: 44 pt (iOS) / 48 dp (Android) — we use 48 everywhere. */
export const HIT = 48;
