import { logoUrlFor, type SearchHit } from '@stocklens/engine';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconClose, IconSearch } from '@/components/icons';
import { Logo } from '@/components/logo';
import { Button, Card, IconButton, Row, Segmented, Txt } from '@/components/ui';
import { useApp, useTheme } from '@/state/app-state';
import { fonts, OUTLINE, space } from '@/theme/tokens';

function Field({ id, label, value, onChange, placeholder, hint }: { id: string; label: string; value: string; onChange: (s: string) => void; placeholder: string; hint?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <Txt v="label" nativeID={`${id}-label`}>{label}</Txt>
      <TextInput
        accessibilityLabelledBy={`${id}-label`}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.faint}
        keyboardType="decimal-pad"
        inputMode="decimal"
        style={{ minHeight: 50, borderRadius: 14, borderWidth: OUTLINE, borderColor: c.outline, backgroundColor: c.surface, paddingHorizontal: 14, fontFamily: fonts.mono, fontSize: 16, color: c.text }}
      />
      {hint ? <Txt v="caption" tone="faint">{hint}</Txt> : null}
    </View>
  );
}

const parseNum = (s: string) => Number(s.replace(',', '.'));

export default function AddStock() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { mode, search, addStock, isTracked } = useApp();
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [pick, setPick] = useState<SearchHit | null>(null);
  const [as, setAs] = useState<'hold' | 'watch'>('hold');
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  useEffect(() => {
    if (mode !== 'live' || q.trim().length < 1) { setHits([]); return; }
    const n = ++seq.current;
    setSearching(true);
    const t = setTimeout(() => {
      search(q)
        .then((h) => { if (n === seq.current) { setHits(h); setError(null); } })
        .catch((e: Error) => { if (n === seq.current) setError(e.message); })
        .finally(() => { if (n === seq.current) setSearching(false); });
    }, 350);
    return () => clearTimeout(t);
  }, [q, mode, search]);

  const valid = as === 'watch' || (parseNum(shares) > 0 && parseNum(cost) > 0);
  const submit = async () => {
    if (!pick || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await addStock(pick.symbol, as === 'hold' ? { shares: parseNum(shares), costBasis: parseNum(cost) } : null);
      router.replace({ pathname: '/stock/[ticker]', params: { ticker: pick.symbol } } as Href);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.ground }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.xl, paddingTop: space.xl + 6, paddingBottom: insets.bottom + 40, gap: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="display" accessibilityRole="header">{pick ? pick.symbol : 'Add a\nstock'}</Txt>
          <IconButton label="Close" onPress={close}><IconClose color={c.text} size={18} /></IconButton>
        </Row>

        {mode === 'demo' ? (
          <Card lift style={{ gap: 10 }}>
            <Txt v="title" style={{ fontSize: 20 }}>Connect live data first</Txt>
            <Txt tone="soft">StockLens uses Financial Modeling Prep for company financials and prices. A free account gives you a key in about a minute.</Txt>
            <Button label="Add my key" kind="accent" onPress={() => router.replace('/settings')} />
          </Card>
        ) : !pick ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 54, borderRadius: 16, borderWidth: OUTLINE, borderColor: c.outline, backgroundColor: c.surface, paddingHorizontal: 14 }}>
              <IconSearch color={c.muted} size={20} />
              <TextInput
                accessibilityLabel="Search by ticker or company name"
                autoFocus
                autoCapitalize="characters"
                autoCorrect={false}
                value={q}
                onChangeText={setQ}
                placeholder="Ticker or company, e.g. AAPL"
                placeholderTextColor={c.faint}
                returnKeyType="search"
                style={{ flex: 1, minHeight: 50, fontFamily: fonts.medium, fontSize: 17, color: c.text }}
              />
              {searching && <ActivityIndicator color={c.text} />}
            </View>
            {error && <Txt v="bodySm" tone="down">{error}</Txt>}
            <View style={{ borderRadius: 18, borderWidth: hits.length ? OUTLINE : 0, borderColor: c.outline, overflow: 'hidden', backgroundColor: c.surface }}>
              {hits.map((h, i) => {
                const tracked = isTracked(h.symbol);
                return (
                  <Pressable key={`${h.symbol}-${h.exchange}`} accessibilityRole="button" accessibilityLabel={`${h.symbol}, ${h.name}, ${h.exchange}${tracked ? ', already added' : ''}`}
                    onPress={() => { setPick(h); setError(null); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 60, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                    <Logo uri={logoUrlFor(h.symbol)} ticker={h.symbol} size={36} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 19, color: c.text }}>{h.symbol}</Text>
                      <Txt v="caption" tone="muted" numberOfLines={1}>{h.name}</Txt>
                    </View>
                    <Txt v="eyebrow" tone="faint">{tracked ? 'Added' : `${h.exchange} · ${h.currency}`}</Txt>
                  </Pressable>
                );
              })}
            </View>
            {q.trim().length > 0 && !searching && hits.length === 0 && !error && <Txt tone="muted">No matches for "{q}".</Txt>}
            {q.trim().length === 0 && (
              <Txt v="bodySm" tone="muted">Analysis needs at least four years of financial statements, so very new listings can't be scored yet.</Txt>
            )}
          </>
        ) : (
          <>
            <Txt tone="soft">{pick.name} · {pick.exchange}</Txt>
            <Segmented value={as} onChange={setAs} options={[{ value: 'hold', label: 'I own it' }, { value: 'watch', label: 'Watch it' }]} />
            {as === 'hold' ? (
              <Row gap={12} style={{ alignItems: 'flex-start' }}>
                <Field id="shares" label="Shares" value={shares} onChange={setShares} placeholder="10" />
                <Field id="cost" label={`Avg. price (${pick.currency})`} value={cost} onChange={setCost} placeholder="150.00" hint="What you paid per share" />
              </Row>
            ) : (
              <Txt v="bodySm" tone="muted">Watchlist stocks are scored daily too, and you'll see when they move into the cheap zone.</Txt>
            )}
            {error && <Card tint="bear"><Txt v="bodySm">{error}</Txt></Card>}
            <Button label={busy ? `Analysing ${pick.symbol}…` : `Add & analyse ${pick.symbol}`} kind="accent" disabled={!valid || busy} onPress={submit} />
            <Button label="Pick another stock" kind="outline" disabled={busy} onPress={() => { setPick(null); setError(null); }} />
            {busy && <Txt v="caption" tone="faint" style={{ textAlign: 'center' }}>Downloading five years of statements, prices and earnings…</Txt>}
          </>
        )}
      </ScrollView>
    </View>
  );
}
