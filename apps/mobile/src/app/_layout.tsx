import {
  BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold, useFonts as useDisplay,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold, useFonts as useSans,
} from '@expo-google-fonts/instrument-sans';
import {
  JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold, useFonts as useMono,
} from '@expo-google-fonts/jetbrains-mono';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider, useApp, useTheme } from '@/state/app-state';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigation() {
  const { scheme, c } = useTheme();
  const { ready } = useApp();
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  if (!ready) return null;
  const sheet = {
    presentation: 'formSheet' as const,
    sheetAllowedDetents: [0.94],
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
    contentStyle: { backgroundColor: c.ground },
  };
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c.ground, card: c.surface, text: c.text, border: c.line, primary: c.info } }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.ground } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="stock/[ticker]" />
        <Stack.Screen name="learn/[term]" options={{ ...sheet, contentStyle: { backgroundColor: c.info } }} />
        <Stack.Screen name="add" options={sheet} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [a] = useDisplay({ BricolageGrotesque_600SemiBold, BricolageGrotesque_800ExtraBold });
  const [b] = useSans({ InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold, InstrumentSans_700Bold });
  const [m] = useMono({ JetBrainsMono_400Regular, JetBrainsMono_500Medium, JetBrainsMono_600SemiBold });
  if (!(a && b && m)) return null;
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Navigation />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
