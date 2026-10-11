import type { Change } from '@stocklens/engine';
import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { IconArrow } from '@/components/icons';
import { Card, Disclaimer, Row, Screen, Txt } from '@/components/ui';
import { useApp, useTheme } from '@/state/app-state';
import { fonts, OUTLINE } from '@/theme/tokens';

const WORDS = ['Nothing', 'One thing', 'Two things', 'Three things', 'Four things', 'Five things'];

function Hero({ ch }: { ch: Change }) {
  const { c, v } = useTheme();
  const col = v[ch.to!];
  return (
    <View style={{ backgroundColor: col.bg, borderRadius: 26, borderWidth: OUTLINE, borderColor: c.outline, padding: 18, gap: 14, shadowColor: c.shadow, shadowOpacity: c.shadow === 'transparent' ? 0 : 1, shadowRadius: 0, shadowOffset: { width: 5, height: 5 }, marginRight: 5 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 30, letterSpacing: -0.6, color: col.fg }}>{ch.ticker}</Text>
        <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.8, color: col.fg, opacity: 0.85 }}>VERDICT CHANGE</Text>
      </Row>
      <Row gap={12} accessibilityLabel={`Verdict changed from ${ch.from} to ${ch.to}`}>
        <Text style={{ fontFamily: fonts.display, fontSize: 32, color: col.fg, opacity: 0.55, textDecorationLine: 'line-through' }}>{ch.from}</Text>
        <IconArrow color={col.fg} size={30} />
        <Text style={{ fontFamily: fonts.display, fontSize: 32, color: col.fg }}>{ch.to}</Text>
      </Row>
      <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: col.fg }}>{ch.headline}</Text>
      <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: col.fg, borderTopWidth: 1, borderTopColor: col.fg, paddingTop: 12, opacity: 0.95 }}>
        <Text style={{ fontFamily: fonts.bold }}>Why it matters: </Text>{ch.why}
      </Text>
      <Link href={{ pathname: '/stock/[ticker]', params: { ticker: ch.ticker } } as Href} asChild>
        <Pressable accessibilityRole="link" style={{ alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#F8FAF6', borderWidth: OUTLINE, borderColor: '#121513', justifyContent: 'center' }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: '#121513' }}>Open the lens</Text>
        </Pressable>
      </Link>
    </View>
  );
}

export default function Digest() {
  const { c } = useTheme();
  const { changes, holdings, watchlist, mode } = useApp();
  const verdicts = changes.filter((x) => x.kind === 'verdict');
  const others = changes.filter((x) => x.kind !== 'verdict');
  const stable = [...holdings.map((h) => h.report), ...watchlist].filter((r) => !changes.some((x) => x.ticker === r.ticker));
  const n = changes.length;

  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <Txt v="eyebrow" tone="muted">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · Re-scored after the US close</Txt>
        <Txt v="display" accessibilityRole="header">{`${WORDS[Math.min(n, 5)] ?? `${n} things`}\nchanged.`}</Txt>
      </View>

      {verdicts.map((ch) => <Hero key={`${ch.ticker}-v`} ch={ch} />)}

      {others.length > 0 && (
        <View>
          <Txt v="eyebrow" tone="muted" style={{ marginBottom: 10 }}>Also on your radar</Txt>
          {others.map((ch, i) => (
            <Link key={`${ch.ticker}-${ch.kind}-${i}`} href={{ pathname: '/stock/[ticker]', params: { ticker: ch.ticker } } as Href} asChild>
              <Pressable accessibilityRole="link" style={{ flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: OUTLINE, borderTopColor: c.outline, borderBottomWidth: i === others.length - 1 ? OUTLINE : 0, borderBottomColor: c.outline }}>
                <Text style={{ fontFamily: fonts.monoSemibold, fontSize: 12, width: 52, color: c.text, paddingTop: 2 }}>{ch.ticker}</Text>
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt v="label">{ch.headline}</Txt>
                  <Txt v="bodySm" tone="muted">{ch.why}</Txt>
                </View>
              </Pressable>
            </Link>
          ))}
        </View>
      )}

      {n === 0 && (
        <Card dashed>
          <Txt tone="soft">{mode === 'live' && holdings.length + watchlist.length > 0
            ? 'Every verdict stands since yesterday. Changes show up here the morning after the scores move.'
            : 'Add stocks to see what changes from one day to the next.'}</Txt>
        </Card>
      )}

      {stable.length > 0 && (
        <Card dashed style={{ gap: 6 }}>
          <Txt v="eyebrow" tone="muted">No change</Txt>
          <Txt v="bodySm" tone="soft">{stable.map((r) => `${r.ticker} ${r.verdict.verdict}`).join(' · ')}</Txt>
        </Card>
      )}

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="caption" tone="muted">Today's 60-second lesson</Txt>
          <Link href={{ pathname: '/learn/[term]', params: { term: 'margin-of-safety' } } as Href} asChild>
            <Pressable accessibilityRole="link" style={{ minHeight: 32, justifyContent: 'center' }}><Txt v="label" tone="info">What is a margin of safety?</Txt></Pressable>
          </Link>
        </View>
      </Card>
      <Disclaimer text={`${mode === 'demo' ? 'Demo data · ' : ''}Not financial advice`} />
    </Screen>
  );
}
