import { CONFIG } from '@stocklens/engine';
import { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';

import { Button, Card, Row, Screen, Segmented, Txt } from '@/components/ui';
import { isHostedPreview, PREVIEW_MESSAGE, QUOTE_REFRESH_MINUTES, useApp, useTheme } from '@/state/app-state';
import { fonts, OUTLINE, space } from '@/theme/tokens';

const pct = (x: number) => `${Math.round(x * 100)}%`;

function LiveData() {
  const { c } = useTheme();
  const { mode, apiKey, saveApiKey, clearApiKey, status, holdings, watchlist } = useApp();
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await saveApiKey(key);
      setKey('');
      setMsg({ ok: true, text: 'Connected. Search and add your first stock with the + button.' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(false);
  };

  return (
    <Card lift={mode === 'demo'} style={{ gap: 10 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="title" style={{ fontSize: 20 }}>Live data</Txt>
        <View style={{ borderRadius: 7, borderWidth: OUTLINE, borderColor: c.outline, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: mode === 'live' ? c.upFill : c.segment }}>
          <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.monoSemibold, fontSize: 11, color: '#121513' }}>{mode === 'live' ? 'CONNECTED' : 'DEMO'}</Text>
        </View>
      </Row>
      {mode === 'live' ? (
        <>
          <Txt v="bodySm" tone="soft">
            Financial Modeling Prep · key ending {apiKey?.slice(-4)}. Tracking {holdings.length + watchlist.length} stocks. Prices refresh every {QUOTE_REFRESH_MINUTES} minutes while the app is open; statements are re-downloaded twice a day.
          </Txt>
          {status.error && <Txt v="bodySm" tone="down">{status.error}</Txt>}
          <Button label="Disconnect and show demo" kind="outline" onPress={clearApiKey} />
          <Txt v="caption" tone="faint">Your portfolio stays saved on this device and comes back when you reconnect.</Txt>
        </>
      ) : (
        <>
          <Txt v="bodySm" tone="soft">Paste a free Financial Modeling Prep API key to search real stocks and get live analysis. The key stays on this device.</Txt>
          {isHostedPreview && <Card tint="info" style={{ gap: 4 }}><Txt v="label">Demo-only preview</Txt><Txt v="bodySm">{PREVIEW_MESSAGE}</Txt></Card>}
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL('https://site.financialmodelingprep.com/register')} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Txt v="label" tone="info">Get a free key at financialmodelingprep.com →</Txt>
          </Pressable>
          <Txt v="label" nativeID="key-label">API key</Txt>
          <TextInput
            accessibilityLabelledBy="key-label"
            accessibilityLabel="API key"
            value={key}
            onChangeText={setKey}
            placeholder="Paste your key"
            placeholderTextColor={c.faint}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            style={{ minHeight: 50, borderRadius: 14, borderWidth: OUTLINE, borderColor: c.outline, backgroundColor: c.surface, paddingHorizontal: 14, fontFamily: fonts.mono, fontSize: 15, color: c.text }}
          />
          <Button label={busy ? 'Checking key…' : 'Connect'} kind="accent" disabled={busy || key.trim().length < 8} onPress={save} />
          <Txt v="caption" tone="faint">FMP is used for search, live prices and logos (free plan: about 250 requests a day). Financial statements for US companies come free from official SEC filings, so any US stock works.</Txt>
        </>
      )}
      {msg && <Txt v="bodySm" tone={msg.ok ? 'up' : 'down'}>{msg.text}</Txt>}
    </Card>
  );
}

export default function Settings() {
  const { themePref, setThemePref, learnMode, setLearnMode } = useApp();
  return (
    <Screen>
      <Txt v="display" accessibilityRole="header">You</Txt>
      <LiveData />

      <Card>
        <Txt v="h2">Appearance</Txt>
        <Txt v="bodySm" tone="muted">Follows your phone's light or dark mode unless you choose one here.</Txt>
        <Segmented value={themePref} onChange={setThemePref} options={[
          { value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
        ]} />
      </Card>

      <Card>
        <Txt v="h2">Explanations</Txt>
        <Txt v="bodySm" tone="muted">Beginner adds everyday analogies. Pro shows formulas.</Txt>
        <Segmented value={learnMode} onChange={setLearnMode} options={[
          { value: 'beginner', label: 'Beginner' }, { value: 'pro', label: 'Pro' },
        ]} />
      </Card>

      <Card style={{ gap: space.sm }}>
        <Txt v="h2">How the verdict works</Txt>
        <Txt v="bodySm" tone="soft">
          Quality is a weighted average: business {pct(CONFIG.verdict.weights.business)}, moat {pct(CONFIG.verdict.weights.moat)}, moat direction {pct(CONFIG.verdict.weights.moatDirection)},
          growth {pct(CONFIG.verdict.weights.growth)}, management {pct(CONFIG.verdict.weights.management)}, risk {pct(CONFIG.verdict.weights.risk)}.
        </Txt>
        {[
          ['BUY', `Quality ≥ ${CONFIG.verdict.buy.quality} and valuation ≥ ${CONFIG.verdict.buy.valuation}, or quality ≥ ${CONFIG.verdict.buyOnBargain.quality} at a very attractive price.`],
          ['WATCH', `Quality ≥ ${CONFIG.verdict.watch.quality} at a fair price.`],
          ['HOLD / PASS', `Quality ≥ ${CONFIG.verdict.holdQuality} but the price isn't compelling — hold if you own it.`],
          ['SELL', `Quality below ${CONFIG.verdict.sellQuality}, or the moat is eroding while risk is high.`],
        ].map(([k, t]) => (
          <Row key={k} gap={10} style={{ alignItems: 'flex-start' }}>
            <Txt v="label" style={{ width: 92 }}>{k}</Txt>
            <Txt v="bodySm" tone="soft" style={{ flex: 1 }}>{t}</Txt>
          </Row>
        ))}
        <Txt v="caption" tone="faint">Stocks added from live data have no reviewed moat sources or management details yet. Those count as "not disclosed", lower confidence, and the moat is estimated from margins. Rules version {CONFIG.version}.</Txt>
      </Card>

      <Txt v="caption" tone="faint" style={{ textAlign: 'center', paddingHorizontal: space.lg }}>
        StockLens is an educational tool. It is not financial advice and does not know your personal situation. Do your own research before investing.
      </Txt>
    </Screen>
  );
}
