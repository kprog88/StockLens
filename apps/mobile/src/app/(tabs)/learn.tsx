import { GLOSSARY, QUIZZES } from '@stocklens/engine';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { IconChevron } from '@/components/icons';
import { Screen, Txt } from '@/components/ui';
import { useApp, useTheme } from '@/state/app-state';
import { fonts, OUTLINE, space } from '@/theme/tokens';

const SECTIONS = [
  { id: 'all', label: 'All' }, { id: 'business', label: 'Business' }, { id: 'phase', label: 'Phase' }, { id: 'moat', label: 'Moat' },
  { id: 'growth', label: 'Growth' }, { id: 'management', label: 'Management' }, { id: 'risk', label: 'Risk' }, { id: 'valuation', label: 'Value' },
];

export default function Learn() {
  const { c } = useTheme();
  const { holdings, watchlist } = useApp();
  const [sec, setSec] = useState('all');
  const terms = GLOSSARY.filter((t) => sec === 'all' || t.section === sec);
  // Show the cards with a stock the user actually follows, so the numbers are theirs.
  const example = holdings[0]?.ticker ?? watchlist[0]?.ticker;
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Txt v="display" accessibilityRole="header">Learn</Txt>
        <Txt tone="soft">Every number in StockLens, in plain words{example ? `, shown with ${example}'s real figures` : ''}. Cards with a quick check are marked.</Txt>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: space.xl }} style={{ marginHorizontal: -space.xl }}>
        {SECTIONS.map((s) => {
          const on = s.id === sec;
          return (
            <Pressable key={s.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setSec(s.id)}
              style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 12, justifyContent: 'center', backgroundColor: on ? c.ink : 'transparent', borderWidth: OUTLINE, borderColor: c.outline }}>
              <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.semibold, fontSize: 14, color: on ? c.inkText : c.text }}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ gap: 10 }}>
        {terms.map((t) => (
          <Link key={t.id} href={{ pathname: '/learn/[term]', params: { term: t.id, ...(example ? { ticker: example } : {}) } } as Href} asChild>
            <Pressable accessibilityRole="button" style={{
              flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 64,
              borderRadius: 18, borderWidth: OUTLINE, borderColor: c.outline, backgroundColor: c.surface,
            }}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text maxFontSizeMultiplier={1.3} style={{ fontFamily: fonts.display, fontSize: 19, color: c.text }}>{t.name}</Text>
                <Txt v="caption" tone="muted" numberOfLines={2}>{t.what}</Txt>
              </View>
              {QUIZZES[t.id] && (
                <View style={{ borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: c.info }}>
                  <Text style={{ fontFamily: fonts.monoSemibold, fontSize: 10, color: '#FFFFFF' }}>QUIZ</Text>
                </View>
              )}
              <IconChevron color={c.text} size={18} />
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}
