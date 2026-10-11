import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Inline stroke icons (no icon font needed, identical on iOS and Android).
type P = { color: string; size?: number };
const S = ({ size = 22, color, children }: P & { children: React.ReactNode }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);

export const IconHome = (p: P) => <S {...p}><Path d="M3 12l9-8 9 8" /><Path d="M5 10v10h14V10" /></S>;
export const IconDigest = (p: P) => <S {...p}><Path d="M4 6h16M4 12h10M4 18h13" /></S>;
export const IconLearn = (p: P) => <S {...p}><Path d="M4 5h7v14H4zM13 5h7v14h-7z" /></S>;
export const IconSettings = (p: P) => <S {...p}><Circle cx={12} cy={9} r={3.5} /><Path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></S>;
export const IconSearch = (p: P) => <S {...p}><Circle cx={11} cy={11} r={7} /><Path d="M20 20l-3.5-3.5" /></S>;
export const IconPlus = (p: P) => <S {...p}><Path d="M12 5v14M5 12h14" /></S>;
export const IconBack = (p: P) => <S {...p}><Path d="M15 6l-6 6 6 6" /></S>;
export const IconChevron = (p: P) => <S {...p}><Path d="M9 6l6 6-6 6" /></S>;
export const IconClose = (p: P) => <S {...p}><Path d="M6 6l12 12M18 6L6 18" /></S>;
export const IconBell = (p: P) => <S {...p}><Path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><Path d="M10 21h4" /></S>;
export const IconArrow = (p: P) => <S {...p}><Path d="M5 12h14M13 6l6 6-6 6" /></S>;
export const IconCheck = (p: P) => <S {...p}><Path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const IconX = (p: P) => <S {...p}><Path d="M7 7l10 10M17 7L7 17" /></S>;
export const IconMinus = (p: P) => <S {...p}><Path d="M6 12h12" /></S>;
export const IconLens = (p: P) => <S {...p}><Circle cx={12} cy={12} r={8} /><Circle cx={12} cy={12} r={2.5} /></S>;
export const IconRefresh = (p: P) => <S {...p}><Path d="M20 11a8 8 0 1 0-2.3 5.7" /><Path d="M20 5v6h-6" /></S>;
export const IconMore = (p: P) => <S {...p}><Circle cx={5} cy={12} r={1.2} /><Circle cx={12} cy={12} r={1.2} /><Circle cx={19} cy={12} r={1.2} /></S>;
