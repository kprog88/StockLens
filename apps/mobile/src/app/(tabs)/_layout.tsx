import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconDigest, IconLearn, IconLens, IconSettings } from '@/components/icons';
import { useApp, useTheme } from '@/state/app-state';
import { fonts } from '@/theme/tokens';

const ICONS = { index: IconLens, digest: IconDigest, learn: IconLearn, settings: IconSettings } as const;
const LABELS = { index: 'Lenses', digest: 'Digest', learn: 'Learn', settings: 'You' } as const;

/** Floating ink tab bar, inset from the edges and above the gesture area. */
export default function TabsLayout() {
  const { c, scheme } = useTheme();
  const { changes } = useApp();
  const insets = useSafeAreaInsets();
  const bar = scheme === 'dark' ? '#1E2321' : '#121513';
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.ground } }}
      tabBar={({ state, navigation }) => (
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: Math.max(insets.bottom, 12), paddingHorizontal: 16 }}>
          <View accessibilityRole="tablist" style={{
            height: 66, borderRadius: 22, backgroundColor: bar, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6,
            maxWidth: 560, width: '100%', alignSelf: 'center', borderWidth: scheme === 'dark' ? 1.5 : 0, borderColor: c.outline,
          }}>
            {state.routes.map((route, i) => {
              const focused = state.index === i;
              const name = route.name as keyof typeof ICONS;
              const Icon = ICONS[name] ?? IconLens;
              const color = focused ? '#121513' : '#9AA39B';
              const badge = name === 'digest' && changes.length > 0;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={`${LABELS[name]}${badge ? `, ${changes.length} updates` : ''}`}
                  onPress={() => {
                    const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
                  }}
                  style={{ flex: 1, height: 54, marginHorizontal: 3, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: focused ? '#F3F5F0' : 'transparent' }}>
                  <View>
                    <Icon color={color} size={20} />
                    {badge && <View style={{ position: 'absolute', top: -3, right: -6, width: 10, height: 10, borderRadius: 5, backgroundColor: '#5B74FF', borderWidth: 2, borderColor: focused ? '#F3F5F0' : bar }} />}
                  </View>
                  <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 11, fontFamily: focused ? fonts.semibold : fonts.regular, color }}>{LABELS[name]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="digest" />
      <Tabs.Screen name="learn" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
