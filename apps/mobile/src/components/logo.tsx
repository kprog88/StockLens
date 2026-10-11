import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/state/app-state';
import { fonts, OUTLINE } from '@/theme/tokens';

/**
 * Company logo from the data provider, on a white plate so dark and light
 * logos both read. Falls back to the ticker's first letter when there's no
 * logo or it fails to load (offline, unknown symbol, demo companies).
 */
export function Logo({ uri, ticker, size = 40 }: { uri?: string; ticker: string; size?: number }) {
  const { c } = useTheme();
  const [failed, setFailed] = useState(false);
  const radius = Math.round(size * 0.28);
  const showImage = !!uri && !failed;
  return (
    <View
      accessibilityLabel={`${ticker} logo`}
      style={{
        width: size, height: size, borderRadius: radius, borderWidth: OUTLINE, borderColor: c.outline,
        backgroundColor: showImage ? '#FFFFFF' : c.segment, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
      {showImage ? (
        <Image source={{ uri }} contentFit="contain" style={{ width: size * 0.72, height: size * 0.72 }} onError={() => setFailed(true)} cachePolicy="disk" transition={150} />
      ) : (
        <Text maxFontSizeMultiplier={1.2} style={{ fontFamily: fonts.display, fontSize: size * 0.45, color: c.text }}>{ticker[0]}</Text>
      )}
    </View>
  );
}
