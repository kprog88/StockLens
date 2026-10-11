import { money, TERMS, type Check, type Report, type SectionResult } from '@stocklens/engine';
import { Link, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { IconChevron } from '@/components/icons';
import { Card, InfoChip, Row, SoWhat, Txt, VerdictPill } from '@/components/ui';
import {
  BandBar, BeatDots, CheckOptions, DualLine, GrowthBars, MultipleChart, ScoreDots, ScoreRing, scoreTextTone, scoreTone, Stepper,
} from '@/components/viz';
import { useTheme } from '@/state/app-state';
import { fonts, space } from '@/theme/tokens';

const Title = ({ children }: { children: string }) => <Txt v="display" accessibilityRole="header">{children}</Txt>;

function CheckCard({ check, ticker }: { check: Check; ticker: string }) {
  return (
    <Card style={{ gap: space.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="label" style={{ flex: 1 }}>{check.question}</Txt>
        {check.terms[0] && TERMS[check.terms[0]] && <InfoChip term={check.terms[0]} ticker={ticker} label={TERMS[check.terms[0]]!.name} />}
      </Row>
      <CheckOptions check={check} />
      <Txt v="bodySm" tone="soft">{check.explanation}</Txt>
      {check.rating === null && <Txt v="caption" tone="faint">Not disclosed — counted as average and lowers confidence.</Txt>}
    </Card>
  );
}

function Confidence({ s }: { s: SectionResult }) {
  if (s.confidence >= 0.99) return null;
  return <Txt v="caption" tone="faint">Confidence {Math.round(Math.min(1, s.confidence) * 100)}% · some inputs not disclosed</Txt>;
}

// --- Business --------------------------------------------------------------------

export function BusinessView({ r }: { r: Report }) {
  return (
    <>
      <Title>Business quality</Title>
      <Stepper score={r.business.score} labels={r.business.scaleLabels} />
      {r.business.checks.map((ch) => <CheckCard key={ch.id} check={ch} ticker={r.ticker} />)}
      <SoWhat>{r.business.soWhat}</SoWhat>
      <Confidence s={r.business} />
    </>
  );
}

// --- Phase -----------------------------------------------------------------------

export function PhaseView({ r }: { r: Report }) {
  const { c } = useTheme();
  const p = r.phase;
  const metricName = p.profitMetric === 'operatingCashFlow' ? 'Operating cash flow' : p.profitMetric === 'freeCashFlow' ? 'Free cash flow' : 'Net income';
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>Phase</Title>
        <InfoChip term="lifecycle-phase" ticker={r.ticker} label="lifecycle phase" />
      </Row>
      <Stepper score={p.phase} labels={['Startup', 'Hyper growth', 'Op. leverage', 'Capital return', 'Decline']} />
      <Card style={{ gap: 0, paddingVertical: space.sm }}>
        {p.checks.map((ch, i) => (
          <Row key={ch.id} style={{ minHeight: 60, borderBottomWidth: i === p.checks.length - 1 ? 0 : 1, borderBottomColor: c.line }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt v="label">{ch.question}</Txt>
              <Txt v="caption" tone="muted">{ch.explanation}</Txt>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: c.outline, backgroundColor: ch.rating === 'good' ? c.upFill : c.downFill }}>
              <Txt v="label" style={{ color: '#121513', fontSize: 13 }}>{ch.rating === 'good' ? '✓ Yes' : '✕ No'}</Txt>
            </View>
          </Row>
        ))}
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="eyebrow" tone="muted">Revenue vs. {metricName.toLowerCase()}</Txt>
          <InfoChip term={p.profitMetric === 'operatingCashFlow' ? 'operating-cash-flow' : p.profitMetric === 'freeCashFlow' ? 'free-cash-flow' : 'revenue'} ticker={r.ticker} />
        </Row>
        <DualLine a={p.series.map((s) => s.revenue)} b={p.series.map((s) => s.profit)} labels={p.series.map((s) => s.period)} />
        <Row gap={16}>
          <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.up }} /><Txt v="caption" tone="muted">Revenue {money(p.series.at(-1)!.revenue, r.currency)}</Txt></Row>
          <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.info }} /><Txt v="caption" tone="muted">{metricName} {money(p.series.at(-1)!.profit, r.currency)}</Txt></Row>
        </Row>
      </Card>
      <Txt tone="soft">{p.explanation}</Txt>
      <SoWhat>{p.soWhat}</SoWhat>
    </>
  );
}

// --- Moat ------------------------------------------------------------------------

export function MoatView({ r }: { r: Report }) {
  const { c } = useTheme();
  const m = r.moat;
  const tone = { none: c.downFill, weak: c.midBar, moderate: c.midBar, strong: c.upFill } as const;
  const fill = { none: 1, weak: 1, moderate: 2, strong: 3 } as const;
  return (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <Title>Moat</Title>
        <InfoChip term="moat" ticker={r.ticker} label="a moat" />
      </Row>
      <Txt v="eyebrow" tone="muted">Width</Txt>
      <Stepper score={m.score} labels={m.scaleLabels} />
      <Txt v="eyebrow" tone="muted">Direction</Txt>
      <Stepper score={m.direction} labels={['Narrowing', 'Eroding', 'Stable', 'Growing', 'Widening']} />
      {m.sources.map((s) => {
        const st = s.strength ?? 'none';
        return (
          <Card key={s.id} style={{ gap: space.sm, padding: space.lg }}>
            <Row>
              <View style={{ flex: 1, gap: 6 }}>
                <Txt v="h2">{s.name}</Txt>
                <Row gap={4}>
                  {[1, 2, 3].map((k) => <View key={k} style={{ width: 26, height: 7, borderRadius: 4, backgroundColor: s.strength !== null && k <= fill[st] ? tone[st] : c.track }} />)}
                </Row>
              </View>
              <Txt v="eyebrow" tone={s.strength === null ? 'muted' : st === 'strong' ? 'up' : st === 'none' ? 'down' : 'mid'}>{s.strength === null ? 'NOT REVIEWED' : st.toUpperCase()}</Txt>
              <InfoChip term={s.id === 'switchingCosts' ? 'switching-costs' : s.id === 'networkEffects' ? 'network-effects' : s.id === 'intangibleAssets' ? 'intangible-assets' : s.id === 'lowCostProduction' ? 'low-cost-production' : 'counter-positioning'} ticker={r.ticker} label={s.name} />
            </Row>
            {s.evidence ? <Txt v="bodySm" tone="soft">{s.evidence}</Txt> : null}
          </Card>
        );
      })}
      <Txt tone="soft">{m.explanation}</Txt>
      <SoWhat>{m.soWhat}</SoWhat>
      <Confidence s={m} />
    </>
  );
}

// --- Growth ----------------------------------------------------------------------

export function GrowthView({ r }: { r: Report }) {
  const g = r.growth;
  const series = r.phase.series.filter((s) => s.period !== 'LTM');
  const yoy = series.slice(1).map((s, i) => s.revenue / series[i]!.revenue - 1);
  const metric = (id: string) => g.metrics.find((m) => m.id === id)!;
  const Block = ({ title, ids, term }: { title: string; ids: string[]; term: string }) => (
    <Card style={{ flexGrow: 1, flexBasis: 160, padding: space.lg, gap: space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt v="label" tone={title.startsWith('Revenue') ? 'up' : 'info'}>{title}</Txt>
        <InfoChip term={term} ticker={r.ticker} />
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        {ids.map((id) => (
          <View key={id} style={{ alignItems: 'center', gap: 2 }}>
            <Txt v="caption" tone="muted">{id.replace(/\D/g, '')}Y</Txt>
            <Txt v="num" style={{ fontFamily: fonts.monoSemibold, fontSize: 15 }}>{metric(id).display}</Txt>
          </View>
        ))}
      </Row>
    </Card>
  );
  return (
    <>
      <Title>Growth</Title>
      <Stepper score={g.score} labels={g.scaleLabels} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <Block title="Revenue CAGR" ids={['rev1', 'rev3', 'rev5']} term="cagr" />
        <Block title="Earnings CAGR" ids={['eps1', 'eps3', 'eps5']} term="eps" />
      </View>
      <Card>
        <Txt v="eyebrow" tone="muted">Revenue growth by year</Txt>
        <GrowthBars values={yoy} labels={series.slice(1).map((s) => s.period)} />
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {g.checks.map((ch) => (
          <Card key={ch.id} style={{ flexGrow: 1, flexBasis: 150, padding: space.lg, gap: 4 }}>
            <Txt v="bodySm" tone="muted">{ch.question}</Txt>
            <Txt v="title" tone={ch.rating === 'good' ? 'up' : ch.rating === 'bad' ? 'down' : 'mid'}>{ch.label}</Txt>
          </Card>
        ))}
      </View>
      <Txt tone="soft">{g.explanation}</Txt>
      <SoWhat>{g.soWhat}</SoWhat>
    </>
  );
}

// --- Management ------------------------------------------------------------------

export function ManagementView({ r, quarters, ceo }: { r: Report; quarters: { period: string; revenue: number; revenueEstimate: number | null; eps: number; epsEstimate: number | null }[]; ceo: { name: string; title: string; tenure: number | null } }) {
  const { c } = useTheme();
  const m = r.management;
  const metric = (id: string) => m.metrics.find((x) => x.id === id)!;
  const initials = ceo.name.replace(/[[\]]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <>
      <Title>Management</Title>
      <Stepper score={m.score} labels={m.scaleLabels} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.segment, alignItems: 'center', justifyContent: 'center' }}>
          <Txt v="h2" tone="muted">{initials}</Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt v="caption" tone="muted">{ceo.title}</Txt>
          <Txt v="title" style={{ fontSize: 24, lineHeight: 28 }}>{ceo.name}</Txt>
          <Txt v="caption" tone="muted">{ceo.tenure !== null ? `${ceo.tenure} yrs in the seat · ` : ''}owns {metric('insider').display}</Txt>
        </View>
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="label">Revenue vs. estimate ($B)</Txt>
          <Txt v="caption" tone="up" style={{ fontFamily: fonts.bold }}>{metric('revBeat').display}</Txt>
        </Row>
        <BeatDots rows={quarters.map((q) => ({ period: q.period, actual: q.revenue, estimate: q.revenueEstimate, display: (q.revenue / 1e9).toFixed(1) }))} />
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={8}><Txt v="label">EPS vs. estimate</Txt><InfoChip term="earnings-beat" ticker={r.ticker} /></Row>
          <Txt v="caption" tone="up" style={{ fontFamily: fonts.bold }}>{metric('epsBeat').display}</Txt>
        </Row>
        <BeatDots rows={quarters.map((q) => ({ period: q.period, actual: q.eps, estimate: q.epsEstimate, display: `$${q.eps.toFixed(2)}` }))} />
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        <Card style={{ flexGrow: 1, flexBasis: 150, padding: space.lg, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}><Txt v="caption" tone="muted">Insider ownership</Txt><InfoChip term="insider-ownership" ticker={r.ticker} /></Row>
          <Txt v="num" style={{ fontSize: 16 }}>{metric('insider').display}</Txt>
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 150, padding: space.lg, gap: 4 }}>
          <Txt v="caption" tone="muted">Employee rating</Txt>
          <Txt v="num" style={{ fontSize: 16 }}>{metric('employees').display}</Txt>
        </Card>
      </View>
      <Txt tone="soft">{m.explanation}</Txt>
      <SoWhat>{m.soWhat}</SoWhat>
      <Confidence s={m} />
    </>
  );
}

// --- Risk ------------------------------------------------------------------------

export function RiskView({ r }: { r: Report }) {
  return (
    <>
      <Title>Risk</Title>
      <Stepper score={r.risk.score} labels={r.risk.scaleLabels} />
      {r.risk.checks.map((ch) => <CheckCard key={ch.id} check={ch} ticker={r.ticker} />)}
      <SoWhat>{r.risk.soWhat}</SoWhat>
      <Confidence s={r.risk} />
    </>
  );
}

// --- Valuation -------------------------------------------------------------------

export function ValuationView({ r }: { r: Report }) {
  const { c } = useTheme();
  const val = r.valuation;
  const name = val.metric === 'pe' ? 'Price to Earnings' : 'Price to Sales';
  const term = val.metric === 'pe' ? 'pe-ratio' : 'ps-ratio';
  const rows = [
    { label: `Cheap-zone edge · ${val.bands.cheapBelow.toFixed(1)}×`, price: val.bandPrices.cheapBelow, tone: 'up' as const },
    { label: `5-yr average · ${val.bands.average.toFixed(1)}×`, price: val.bandPrices.average, tone: 'text' as const },
    { label: `Expensive-zone edge · ${val.bands.expensiveAbove.toFixed(1)}×`, price: val.bandPrices.expensiveAbove, tone: 'down' as const },
  ];
  return (
    <>
      <Title>Valuation</Title>
      <Stepper score={val.score} labels={val.scaleLabels} />
      <Link href={{ pathname: '/learn/[term]', params: { term, ticker: r.ticker } } as Href} asChild>
        <Pressable accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: 16, backgroundColor: c.infoBg, borderWidth: 1, borderColor: c.infoLine }}>
          <Txt v="bodySm" style={{ flex: 1 }}>{r.name} is in phase {r.phase.phase}, so <Txt v="label">{name}</Txt> is the right yardstick.</Txt>
          <IconChevron color={c.info} size={18} />
        </Pressable>
      </Link>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt v="h2">{val.metric === 'pe' ? 'P/E, trailing' : 'P/S'}</Txt>
          <Txt v="caption" tone="muted">5 years · now {val.current.toFixed(1)}×</Txt>
        </Row>
        <MultipleChart history={val.history} bands={val.bands} current={val.current} />
        <Row gap={14} style={{ flexWrap: 'wrap' }}>
          <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.up, opacity: 0.5 }} /><Txt v="caption" tone="muted">Cheap</Txt></Row>
          <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.muted, opacity: 0.4 }} /><Txt v="caption" tone="muted">Fair</Txt></Row>
          <Row gap={6}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.down, opacity: 0.5 }} /><Txt v="caption" tone="muted">Expensive</Txt></Row>
          <Txt v="caption" tone="muted">- - average</Txt>
        </Row>
      </Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
        {val.metrics.map((m) => (
          <Link key={m.id} href={{ pathname: '/learn/[term]', params: { term: m.term!, ticker: r.ticker } } as Href} asChild>
            <Pressable accessibilityRole="button" accessibilityLabel={`${m.label} ${m.display}. Learn more.`} style={{ flexGrow: 1, flexBasis: 140, backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.line, padding: space.lg, gap: 4 }}>
              <Row style={{ justifyContent: 'space-between' }}><Txt v="bodySm" tone="muted">{m.label}</Txt><Txt v="caption" tone="faint">ⓘ</Txt></Row>
              <Txt v="numLg">{m.display}</Txt>
              <Txt v="caption" tone="faint">{TERMS[m.term!]?.formula ?? ''}</Txt>
            </Pressable>
          </Link>
        ))}
      </View>
      <Card>
        <Txt v="eyebrow" tone="muted">What if the multiple moves?</Txt>
        {rows.map((x) => (
          <Row key={x.label} style={{ justifyContent: 'space-between' }}>
            <Txt v="bodySm" tone="soft" style={{ flex: 1 }}>{x.label}</Txt>
            <Txt v="num" tone={x.tone}>{money(x.price, r.currency)}</Txt>
          </Row>
        ))}
        <Txt v="caption" tone="faint">Assumes {val.metric === 'pe' ? 'earnings' : 'sales'} per share stay at today's level.</Txt>
      </Card>
      <Txt tone="soft">{val.explanation}</Txt>
      <SoWhat>{val.soWhat}</SoWhat>
    </>
  );
}
