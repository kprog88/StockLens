import { liveFormula, QUIZZES, TERMS } from '@stocklens/engine';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconClose } from '@/components/icons';
import { IconButton, Row, Txt } from '@/components/ui';
import { useApp, useTheme } from '@/state/app-state';
import { fonts, OUTLINE, space } from '@/theme/tokens';

const SECTION: Record<string, string> = {
  business: 'Business', phase: 'Phase', moat: 'Moat', growth: 'Growth', management: 'Management', risk: 'Risk', valuation: 'Value', verdict: 'Verdict',
};

/** Learn card: front = plain meaning + analogy; back = this company's numbers, good vs. bad, price impact. Then a quick check. */
export default function LearnCard() {
  const { term = '', ticker } = useLocalSearchParams<{ term: string; ticker?: string }>();
  const { companies, learnMode } = useApp();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [front, setFront] = useState(true);
  const [answer, setAnswer] = useState<number | null>(null);
  useEffect(() => { setFront(true); setAnswer(null); }, [term]);

  const t = TERMS[term];
  const d = ticker ? companies[ticker.toUpperCase()] : undefined;
  const live = t && d ? liveFormula(t.id, d) : null;
  const quiz = QUIZZES[term];
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const ink = '#121513';
  const paper = '#F8FAF6';

  if (!t) return <View style={{ flex: 1, backgroundColor: c.info, padding: 24 }}><Txt style={{ color: '#FFFFFF' }}>Unknown term.</Txt></View>;

  return (
    <View style={{ flex: 1, backgroundColor: c.info }}>
      <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: space.xl + 6, paddingBottom: insets.bottom + 32, gap: space.lg, width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.monoMedium, fontSize: 12, letterSpacing: 0.8, color: '#DCE2FF' }}>LEARN · {SECTION[t.section]?.toUpperCase()}</Text>
          <IconButton label="Close" onPress={close} filled={paper}><IconClose color={ink} size={18} /></IconButton>
        </Row>

        <View style={{ paddingTop: 14 }}>
          <View aria-hidden style={{ position: 'absolute', left: 22, right: 22, top: 0, height: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#8FA0FF', borderWidth: OUTLINE, borderColor: ink }} />
          <View aria-hidden style={{ position: 'absolute', left: 11, right: 11, top: 7, height: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#C4CDFF', borderWidth: OUTLINE, borderColor: ink }} />
          <View style={{ backgroundColor: paper, borderWidth: OUTLINE, borderColor: ink, borderRadius: 26, padding: 20, gap: 14, minHeight: 400, shadowColor: ink, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 5, height: 5 }, marginRight: 5 }}>
            {front ? (
              <>
                <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.9, color: '#565D57' }}>THE TERM</Text>
                <Text maxFontSizeMultiplier={1.2} accessibilityRole="header" style={{ fontFamily: fonts.display, fontSize: 52, lineHeight: 50, letterSpacing: -2, color: ink }}>{t.name}</Text>
                <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 19, lineHeight: 27, color: ink }}>{t.what}</Text>
                {learnMode === 'beginner' && t.analogy && (
                  <View style={{ marginTop: 'auto', borderRadius: 18, backgroundColor: '#F2B01E', borderWidth: OUTLINE, borderColor: ink, padding: 14 }}>
                    <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: ink }}>{t.analogy}</Text>
                  </View>
                )}
                {learnMode === 'pro' && t.formula && (
                  <Text style={{ marginTop: 'auto', fontFamily: fonts.mono, fontSize: 15, color: ink }}>{t.formula}</Text>
                )}
              </>
            ) : (
              <>
                {live && d && (
                  <>
                    <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.9, color: '#565D57' }}>{d.name.replace(' (demo)', '').toUpperCase()}, TODAY</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {live.parts.map((p, i) => (
                        <View key={p.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ fontFamily: fonts.monoSemibold, fontSize: 16, color: ink }}>{p.value}</Text>
                            <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: '#565D57', textAlign: 'center' }}>{p.label}</Text>
                          </View>
                          <Text style={{ fontSize: 18, color: ink }}>{i === 0 ? live.op : '='}</Text>
                        </View>
                      ))}
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: ink }}>{live.result.value}</Text>
                        <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: '#565D57' }}>{live.result.label}</Text>
                      </View>
                    </View>
                  </>
                )}
                <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.9, color: '#565D57' }}>WHY INVESTORS CARE</Text>
                <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 15.5, lineHeight: 22, color: ink }}>{t.why}</Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <View style={{ flexGrow: 1, flexBasis: 130, borderRadius: 14, backgroundColor: '#3FBF7F', borderWidth: OUTLINE, borderColor: ink, padding: 10, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: ink }}>Good sign</Text>
                    <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: ink }}>{t.good}</Text>
                  </View>
                  <View style={{ flexGrow: 1, flexBasis: 130, borderRadius: 14, backgroundColor: '#E5585C', borderWidth: OUTLINE, borderColor: ink, padding: 10, gap: 2 }}>
                    <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: ink }}>Watch out</Text>
                    <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: ink }}>{t.bad}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.9, color: '#565D57' }}>HOW IT MOVES THE PRICE</Text>
                <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: ink }}>▲ {t.priceUp}</Text>
                <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: ink }}>▼ {t.priceDown}</Text>
              </>
            )}
            <Pressable accessibilityRole="button" onPress={() => setFront((x) => !x)}
              style={{ minHeight: 50, borderRadius: 14, backgroundColor: ink, alignItems: 'center', justifyContent: 'center', marginTop: front ? 0 : 4 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: paper }}>{front ? `Flip — ${d ? `see it with ${d.ticker} numbers` : 'why it matters'}` : 'Flip back'}</Text>
            </Pressable>
          </View>
        </View>

        {quiz && (
          <View style={{ backgroundColor: ink, borderRadius: 22, padding: 16, gap: 10 }}>
            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.9, color: '#9AA39B' }}>QUICK CHECK</Text>
            <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: fonts.displaySemi, fontSize: 18, lineHeight: 23, color: '#F3F5F0' }}>{quiz.q}</Text>
            {quiz.options.map((o, i) => {
              const shown = answer !== null;
              const right = i === quiz.answer;
              const bg = shown && right ? '#3FBF7F' : answer === i ? '#E5585C' : 'transparent';
              return (
                <Pressable key={o} accessibilityRole="button" accessibilityState={{ selected: answer === i }} onPress={() => setAnswer(i)}
                  style={{ minHeight: 48, borderRadius: 12, borderWidth: OUTLINE, borderColor: '#3A423C', paddingHorizontal: 14, justifyContent: 'center', backgroundColor: bg }}>
                  <Text maxFontSizeMultiplier={1.4} style={{ fontFamily: fonts.medium, fontSize: 15, color: bg === 'transparent' ? '#F3F5F0' : ink }}>{o}</Text>
                </Pressable>
              );
            })}
            {answer !== null && (
              <Text maxFontSizeMultiplier={1.5} style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: '#C8CEC8' }}>{answer === quiz.answer ? 'Right. ' : 'Not quite. '}{quiz.explain}</Text>
            )}
          </View>
        )}

        {t.related.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: fonts.monoMedium, fontSize: 11, letterSpacing: 0.9, color: '#DCE2FF' }}>RELATED</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {t.related.map((id) => (
                <Pressable key={id} accessibilityRole="button" onPress={() => router.setParams({ term: id })}
                  style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, borderWidth: OUTLINE, borderColor: ink, backgroundColor: paper, justifyContent: 'center' }}>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: ink }}>{TERMS[id]?.name ?? id}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
        <Text style={{ fontFamily: fonts.regular, fontSize: 12.5, color: '#DCE2FF', lineHeight: 18 }}>Rules of thumb differ by industry — compare a company with its own history and its peers.</Text>
      </ScrollView>
    </View>
  );
}
