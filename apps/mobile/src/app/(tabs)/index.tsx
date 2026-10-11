import { money, type Report } from '@stocklens/engine';
import { Link, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { IconChevron, IconPlus } from '@/components/icons';
import { MiniLens } from '@/components/lens';
import { Logo } from '@/components/logo';
import { Button, Card, Disclaimer, IconButton, Row, Screen, Segmented, Txt, VerdictPill } from '@/components/ui';
import { QUOTE_REFRESH_MINUTES, useApp, useTheme } from '@/state/app-state';
import { fonts, space } from '@/theme/tokens';

const ORDER = { BUY: 0, WATCH: 1, HOLD: 2, PASS: 3, SELL: 4 } as const;

function Tile({ r, sub, right, rightTone }: { r: Report; sub: string; right: string; rightTone?: 'up' | 'down' | 'text' }) {
  const { c } = useTheme();
  return (
    <Link href={{ pathname: '/stock/[ticker]', params: { ticker: r.ticker } } as Href} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${r.ticker}, ${r.name}, verdict ${r.verdict.verdict}`}
        style={{ flexGrow: 1, flexBasis: 150, maxWidth: '100%', padding: 14, gap: 10, borderRadius: 20, backgroundColor: c.surface, borderWidth: 1.5, borderColor: c.outline }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <MiniLens report={r} />
          <VerdictPill verdict={r.verdict.verdict} />
        </Row>
        <Row gap={10}>
          <Logo uri={r.logoUrl} ticker={r.ticker} size={36} />
          <View style={{ gap: 1, flex: 1, minWidth: 0 }}>
            <Txt v="title" style={{ fontSize: 24, lineHeight: 26 }} numberOfLines={1}>{r.ticker}</Txt>
            <Txt v="caption" tone="muted" numberOfLines={1}>{sub}</Txt>
          </View>
        </Row>
        <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderStyle: 'dashed', borderTopColor: c.line2, paddingTop: 8 }}>
          <Txt v="num" style={{ fontSize: 13 }}>{money(r.price, r.currency)}</Txt>
          <Txt v="num" tone={rightTone} style={{ fontSize: 12.5, fontFamily: fonts.monoSemibold }}>{right}</Txt>
        </Row>
      </Pressable>
    </Link>
  );
}

export default function Portfolio() {
  const { c, v } = useTheme();
  const { holdings, watchlist, totals, changes, mode, status, refresh } = useApp();
  const [tab, setTab] = useState<'hold' | 'watch'>('hold');
  const sorted = useMemo(() => [...holdings].sort((a, b) => ORDER[a.report.verdict.verdict] - ORDER[b.report.verdict.verdict]), [holdings]);
  const counts = useMemo(() => {
    const n = { BUY: 0, WATCH: 0, HOLD: 0, PASS: 0, SELL: 0 };
    for (const h of holdings) n[h.report.verdict.verdict]++;
    return n;
  }, [holdings]);
  const up = totals.pnl >= 0;
  const verdictChange = changes.find((x) => x.kind === 'verdict');
  const empty = holdings.length === 0 && watchlist.length === 0;

  return (
    <Screen refreshControl={mode === 'live' ? <RefreshControl refreshing={status.refreshing} onRefresh={() => refresh(true)} tintColor={c.text} /> : undefined}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 6, flex: 1 }}>
          <Txt v="eyebrow" tone="muted">{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {mode === 'demo' ? 'Demo data' : 'Live data'}</Txt>
          <Txt v="display" accessibilityRole="header">{'Your\nlenses'}</Txt>
        </View>
        <IconButton label="Add a stock" href="/add" filled={c.info}><IconPlus color="#FFFFFF" size={22} /></IconButton>
      </Row>

      {mode === 'demo' && (
        <Card dashed style={{ gap: 8 }}>
          <Txt v="label">You're looking at demo data</Txt>
          <Txt v="bodySm" tone="soft">Add your free Financial Modeling Prep key to search real stocks, add them, and get live prices and analysis.</Txt>
          <Button label="Connect live data" kind="outline" href="/settings" />
        </Card>
      )}

      {holdings.length > 0 && (
        <Card tint="hero" style={{ gap: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt v="eyebrow" tone="heroMuted">Portfolio value{totals.mixedCurrency ? ' · mixed currencies' : ''}</Txt>
            <Txt v="eyebrow" tone="heroMuted">{holdings.length} holdings</Txt>
          </Row>
          <Row gap={10} style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <Txt v="numXl" tone="heroText">{money(totals.value).replace(/\.\d\d$/, '')}</Txt>
            <Txt v="num" style={{ color: up ? '#6EE7A8' : '#FF8A8E' }}>{`${up ? '▲ +' : '▼ −'}${money(Math.abs(totals.pnl)).replace(/\.\d\d$/, '')} · ${up ? '+' : '−'}${Math.abs(totals.pnlPct * 100).toFixed(1)}%`}</Txt>
          </Row>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', gap: 2 }} accessibilityLabel="Allocation by holding, coloured by verdict">
              {sorted.map((h) => <View key={h.ticker} style={{ flex: Math.max(0.02, h.value / (totals.value || 1)), backgroundColor: v[h.report.verdict.verdict].bg }} />)}
            </View>
            <Txt v="caption" tone="heroMuted">Allocation, coloured by verdict</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['BUY', 'HOLD', 'SELL'] as const).map((k) => (
              <View key={k} style={{ flex: 1, borderWidth: 1, borderColor: c.heroLine, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 }}>
                <Txt v="caption" tone="heroMuted">{k === 'HOLD' ? 'Hold · Watch' : k[0] + k.slice(1).toLowerCase()}</Txt>
                <Txt v="num" tone="heroText" style={{ fontSize: 16 }}>{k === 'HOLD' ? counts.HOLD + counts.WATCH : k === 'SELL' ? counts.SELL + counts.PASS : counts.BUY}</Txt>
              </View>
            ))}
          </View>
        </Card>
      )}

      {verdictChange && (
        <Link href="/digest" asChild>
          <Pressable accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: 14, borderRadius: 16, backgroundColor: c.infoBg, borderWidth: 1.5, borderColor: c.outline }}>
            <View style={{ backgroundColor: c.info, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Txt v="eyebrow" style={{ color: '#FFFFFF' }}>New</Txt>
            </View>
            <Txt v="bodySm" style={{ flex: 1 }}><Txt v="label">{verdictChange.ticker}</Txt> moved {verdictChange.from} → {verdictChange.to}</Txt>
            <IconChevron color={c.text} size={18} />
          </Pressable>
        </Link>
      )}

      {empty ? (
        <Card lift style={{ alignItems: 'flex-start', gap: 10 }}>
          <Txt v="title">Add your first stock</Txt>
          <Txt tone="soft">Search any listed company. StockLens scores it across seven areas and gives a verdict — every number explained.</Txt>
          <Button label="Add a stock" kind="accent" href="/add" />
        </Card>
      ) : (
        <>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ width: 240 }}>
              <Segmented value={tab} onChange={setTab} options={[{ value: 'hold', label: `Holdings ${holdings.length}` }, { value: 'watch', label: `Watchlist ${watchlist.length}` }]} />
            </View>
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {tab === 'hold'
              ? sorted.map((h) => (
                <Tile key={h.ticker} r={h.report} sub={h.report.name}
                  right={`${h.pnl >= 0 ? '+' : '−'}${Math.abs(h.pnlPct * 100).toFixed(1)}%`} rightTone={h.pnl >= 0 ? 'up' : 'down'} />
              ))
              : watchlist.map((r) => (
                <Tile key={r.ticker} r={r} sub={r.name} right={`Q ${r.verdict.quality.toFixed(1)}`} rightTone="text" />
              ))}
            {(tab === 'hold' ? sorted.length : watchlist.length) === 0 && (
              <Card dashed style={{ flexGrow: 1 }}><Txt tone="muted">{tab === 'hold' ? 'No holdings yet.' : 'Nothing on your watchlist yet.'} Tap + to add one.</Txt></Card>
            )}
          </View>
        </>
      )}

      {mode === 'live' && (
        <Txt v="caption" tone={status.error ? 'down' : 'faint'} style={{ textAlign: 'center' }}>
          {status.error ?? (status.refreshing ? 'Updating prices…' : status.lastRefreshed
            ? `Prices updated ${new Date(status.lastRefreshed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · pull to refresh · auto every ${QUOTE_REFRESH_MINUTES} min`
            : 'Pull down to refresh')}
        </Txt>
      )}
      <Disclaimer text={`${mode === 'demo' ? 'Demo data · ' : ''}Educational analysis, not financial advice`} />
    </Screen>
  );
}
