import type { TextStyle } from 'react-native';
import type { Hue } from '../content/types';

/**
 * Design tokens. Brand palette: deep maroon #250104 (ink, dark surfaces), tomato red #D71A06
 * (brand colour: main buttons, hearts, progress) and a touch of neon yellow #CDF73D (small
 * highlights, mostly on maroon). Green is kept for "correct" and gold for medals, XP and
 * Ngaali's crown. Every text pairing is checked for WCAG AA in theme.test.ts.
 */
export const C = {
  paper: '#FCF5F0',
  paperDeep: '#F5E7E1',
  card: '#FFFFFF',
  ink: '#250104',
  ink2: '#6B4B46',
  ink3: '#A3857F',
  line: '#EEDBD3',
  onInk: '#FFF4EE',
  /** Body text on maroon surfaces. */
  onInk2: '#E9CFC9',

  tomato: '#D71A06',
  tomatoSoft: '#FDE5E0',
  tomatoDeep: '#A51404',

  neon: '#CDF73D',
  neonSoft: '#F4FDD2',
  neonDeep: '#475A00',

  /** Gold: medals, XP, the crane's crown, the sun and moon in illustrations. */
  sun: '#F5B400',
  sunSoft: '#FFF1C9',
  sunDeep: '#7A5000',

  /** Hearts and wrong answers use the brand red. */
  red: '#D71A06',
  redSoft: '#FDE5E0',
  redDeep: '#A51404',

  /** Correct answers. */
  leaf: '#2F9A5B',
  leafSoft: '#DDF2E3',
  leafDeep: '#1D6B3E',

  gem: '#1FA3D8',
  flame: '#FF7A1A',
  crane: '#9AA5B4',
  craneDark: '#6E7A8A',
} as const;

export interface HueSet {
  base: string;
  soft: string;
  deep: string;
  track: string;
}

/** Chapter colours, derived from the brand palette. */
export const HUES: Record<Hue, HueSet> = {
  tomato: { base: '#D71A06', soft: '#FDE5E0', deep: '#A51404', track: '#F5B5AA' },
  maroon: { base: '#7A1E16', soft: '#F5E2DF', deep: '#5A130D', track: '#D9B2AD' },
  neon: { base: '#9CC21A', soft: '#F4FDD2', deep: '#475A00', track: '#E3F59A' },
  gold: { base: '#E8A400', soft: '#FFF1C9', deep: '#7A5000', track: '#FBE3A1' },
  coral: { base: '#F0603F', soft: '#FEE8E2', deep: '#A3361F', track: '#F9C3B6' },
  berry: { base: '#A3245A', soft: '#F9E3EC', deep: '#7A1A43', track: '#E9B3C9' },
};

/**
 * Type: the device's own system font — San Francisco on iPhone, iPad and Mac
 * (also in Safari), Roboto on Android, Segoe UI on Windows. Nothing is bundled:
 * on iOS/Android leaving fontFamily unset gives the system font; on the web we
 * name the system font stack. Styles set the weight, so spread them: `...F.semi`.
 */
export const SYSTEM_FONT: string | undefined =
  process.env.EXPO_OS === 'web'
    ? 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    : undefined;

const weight = (fontWeight: TextStyle['fontWeight']): TextStyle => (SYSTEM_FONT ? { fontFamily: SYSTEM_FONT, fontWeight } : { fontWeight });

/**
 * Tracking for big type. iOS already adjusts San Francisco's spacing to the point size,
 * so nothing is added there; on Android and the web large titles are tightened a little to match.
 */
const tighten = (px: number): number | undefined => (process.env.EXPO_OS === 'ios' ? undefined : px);
export const TRACK = { largeTitle: tighten(-0.6), title: tighten(-0.4), h2: tighten(-0.2) } as const;

export const F = {
  display: weight('800'),
  heading: weight('700'),
  body: weight('400'),
  medium: weight('500'),
  semi: weight('600'),
} as const;

export const R = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Content column width on tablets and desktop web. */
export const MAX_W = 640;

export const shadow = {
  shadowColor: '#3A0A08',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
