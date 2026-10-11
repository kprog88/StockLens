import { money, type Report } from '@stocklens/engine';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconBack, IconMore } from '@/components/icons';
import { Lens, petalsOf, VerdictDial, type PetalId } from '@/components/lens';
import { Logo } from '@/components/logo';
import {
  BusinessView, GrowthView, ManagementView, MoatView, PhaseView, RiskView, ValuationView,
} from '@/components/sections';
import { Button, Card, Disclaimer, IconButton, InfoChip, Row, Txt, VerdictPill } from '@/components/ui';
import { BandBar } from '@/components/viz';
import { useApp, useTheme } from '@/state/app-state';
import { fonts, OUTLINE, space } from '@/theme/tokens';

type Sel = 'overview' | 'phase' | PetalId;

function Overview({ r }: { r: Report }) {
  return (
    <>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="eyebrow" tone="muted">Price vs. its own history</Txt>
          <Txt v="caption" tone="muted">{r.valuation.metric === 'pe' ? 'P/E' : 'P/S'} {r.valuation.current.toFixed(1)}× · avg {r.valuation.bands.average.toFixed(1)}×</Txt>
        </Row>
        <BandBar price={r.price} cheapBelow={r.valuation.bandPrices.cheapBelow} expensiveAbove={r.valuation.bandPrices.expensiveAbove} currency={r.currency} />
        <Txt v="bodySm" tone="soft">{r.valuation.soWhat}</Txt>
      </Card>
      {r.verdict.triggers.length > 0 && (
        <Card dashed>
          <Txt v="eyebrow" tone="muted">What would change it</Txt>
          {r.verdict.triggers.map((t) => (
            <Row key={t.text} gap={10} style={{ alignItems: 'flex-start' }}>
              <View style={{ paddingTop: 2 }}><VerdictPill verdict={t.to} /></View>
              <Txt v="bodySm" style={{ flex: 1 }}>{t.text}</Txt>
            </Row>
          ))}
        </Card>
      )}
      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Card tint="bull" style={{ flexGrow: 1, flexBasis: 150, gap: 8 }}>
          <Txt v="title" style={{ fontSize: 18, lineHeight: 22 }}>For</Txt>
          {r.verdict.bull.length ? r.verdict.bull.map((b) => <Txt key={b} v="bodySm">{b}</Txt>) : <Txt v="bodySm" tone="muted">Nothing stands out.</Txt>}
        </Card>
        <Card tint="bear" style={{ flexGrow: 1, flexBasis: 150, gap: 8 }}>
          <Txt v="title" style={{ fontSize: 18, lineHeight: 22 }}>Against</Txt>
          {r.verdict.bear.length ? r.verdict.bear.map((b) => <Txt key={b} v="bodySm">{b}</Txt>) : <Txt v="bodySm" tone="muted">Nothing stands out.</Txt>}
        </Card>
      </View>
    </>
  );
}

export default function StockScreen() {
  const { ticker = '' } = useLocalSearchParams<{ ticker: string }>();
  const { reportFor, companies, mode, removeStock, isOwned, status, refresh } = useApp();
  const { c, v } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [sel, setSel] = useState<Sel>('overview');
  const [menu, setMenu] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const detailY = useRef(0);
  const r = reportFor(ticker);
  const d = companies[ticker.toUpperCase()];
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!r || !d) {
    return (
      <View style={{ flex: 1, backgroundColor: c.ground, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Txt>{ticker} isn't in your lenses.</Txt>
        <Button label="Back" kind="outline" onPress={back} />
      </View>
    );
  }

  const lensW = Math.min(Math.min(width, 640) - 2 * space.xl - 2 * space.lg - 3, 380);
  const pick = (id: Sel) => {
    setSel(id);
    requestAnimationFrame(() => scroll.current?.scrollTo({ y: Math.max(0, detailY.current - 12), animated: true }));
  };
  const chips: { id: Sel; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    ...petalsOf(r).map((p) => ({ id: p.id as Sel, label: p.name })),
    { id: 'phase', label: 'Phase' },
  ];
  const changePct = d.quote?.changePct ?? null;
  const updated = d.quote?.at ? new Date(d.quote.at) : null;

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView
        ref={scroll}
        refreshControl={mode === 'live' ? <RefreshControl refreshing={status.refreshing} onRefresh={() => refresh()} tintColor={c.text} /> : undefined}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: space.xl, paddingBottom: insets.bottom + 40, gap: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton label="Back" onPress={back}><IconBack color={c.text} size={20} /></IconButton>
          <Txt v="eyebrow" tone="muted" style={{ flex: 1, textAlign: 'center' }} numberOfLines={1}>
            {updated ? `Updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `As of ${r.asOf}`} · Rules v{r.configVersion}
          </Txt>
          <IconButton label="More options" onPress={() => setMenu((m) => !m)}><IconMore color={c.text} size={20} /></IconButton>
        </Row>

        {menu && (
          <Card style={{ gap: 10 }}>
            {mode === 'live' ? (
              <>
                <Txt v="label">Remove {r.ticker} from your {isOwned(r.ticker) ? 'holdings' : 'watchlist'}?</Txt>
                <Row gap={8}>
                  <View style={{ flex: 1 }}><Button label="Remove" kind="ink" onPress={() => { removeStock(r.ticker); back(); }} /></View>
                  <View style={{ flex: 1 }}><Button label="Keep" kind="outline" onPress={() => setMenu(false)} /></View>
                </Row>
              </>
            ) : (
              <Txt v="bodySm" tone="soft">Demo stocks can't be removed. Connect live data in You → Live data to build your own portfolio.</Txt>
            )}
          </Card>
        )}

        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt v="hero" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>{r.ticker}</Txt>
            <Row gap={10} style={{ marginTop: 8 }}>
              <Logo uri={r.logoUrl} ticker={r.ticker} size={34} />
              <Txt v="bodySm" tone="muted" numberOfLines={2} style={{ flex: 1 }}>{r.name} · {r.exchange} · Phase {r.phase.phase}, {r.phase.phaseName.toLowerCase()}</Txt>
            </Row>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt v="numLg">{money(r.price, r.currency)}</Txt>
            {changePct !== null && (
              <Txt v="num" tone={changePct >= 0 ? 'up' : 'down'} style={{ fontSize: 12 }}>{`${changePct >= 0 ? '▲' : '▼'} ${Math.abs(changePct).toFixed(2)}% today`}</Txt>
            )}
          </View>
        </Row>

        <Card lift style={{ alignItems: 'center', gap: 6 }}>
          <View style={{ alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'flex-end' }}><InfoChip term="verdict" ticker={r.ticker} label="the verdict" /></View>
          <View style={{ marginTop: -18 }}><VerdictDial verdict={r.verdict.verdict} width={Math.min(lensW, 300)} /></View>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.2, color: r.verdict.verdict === 'PASS' ? c.text : v[r.verdict.verdict].bg }}>{r.verdict.verdict}</Text>
          <Txt v="title" style={{ fontSize: 19, lineHeight: 24, textAlign: 'center', fontFamily: fonts.displaySemi }}>{r.verdict.headline}</Txt>
          <Txt v="eyebrow" tone="muted" style={{ textAlign: 'center' }}>
            Quality {r.verdict.quality.toFixed(1)} / 5 · Value {r.verdict.valuationScore} / 5 · Confidence {Math.round(r.verdict.confidence * 100)}%
          </Txt>
          <Txt v="bodySm" tone="soft" style={{ textAlign: 'center', marginTop: 6 }}>{r.verdict.explanation}</Txt>
        </Card>

        <Card style={{ gap: 8 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt v="title" style={{ fontSize: 22 }}>The lens</Txt>
            <Txt v="caption" tone="muted">Tap a petal</Txt>
          </Row>
          <View style={{ alignItems: 'center' }}>
            <Lens report={r} width={lensW} selected={sel === 'overview' || sel === 'phase' ? null : sel} onSelect={(id) => pick(id)} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityRole="tablist">
            {chips.map((ch) => {
              const on = ch.id === sel;
              return (
                <Pressable key={ch.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => pick(ch.id)}
                  style={{ minHeight: 38, paddingHorizontal: 12, borderRadius: 11, borderWidth: OUTLINE, borderColor: c.outline, justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent' }}>
                  <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.semibold, fontSize: 13.5, color: on ? c.inkText : c.text }}>{ch.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <View onLayout={(e) => { detailY.current = e.nativeEvent.layout.y; }} style={{ gap: space.lg }}>
          {sel === 'overview' && <Overview r={r} />}
          {sel === 'business' && <BusinessView r={r} />}
          {sel === 'phase' && <PhaseView r={r} />}
          {(sel === 'moat' || sel === 'direction') && <MoatView r={r} />}
          {sel === 'growth' && <GrowthView r={r} />}
          {sel === 'management' && <ManagementView r={r} quarters={d.quarters} ceo={{ name: d.management.ceoName, title: d.management.ceoTitle, tenure: d.management.ceoTenureYears }} />}
          {sel === 'risk' && <RiskView r={r} />}
          {sel === 'valuation' && <ValuationView r={r} />}
        </View>

        <Txt v="caption" tone="faint" style={{ textAlign: 'center' }}>{r.source}</Txt>
        <Disclaimer />
      </ScrollView>
    </View>
  );
}
