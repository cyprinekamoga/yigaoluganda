import type { TextStyle } from 'react-native';
import type { Hue } from '../content/types';

/**
 * Design tokens. A warm cream page, Ugandan-flag black/yellow/red as the core,
 * and six chapter hues. Every text pairing is checked for WCAG AA in theme.test.ts.
 */
export const C = {
  paper: '#FBF5EA',
  paperDeep: '#F3EAD8',
  card: '#FFFFFF',
  ink: '#1F1A17',
  ink2: '#5A5048',
  ink3: '#8C8279',
  line: '#E9DEC9',
  onInk: '#FFF8EC',

  sun: '#FFC233',
  sunSoft: '#FFF1C9',
  sunDeep: '#8A5A00',

  red: '#E03A3E',
  redSoft: '#FDE4E2',
  redDeep: '#A8242A',

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

export const HUES: Record<Hue, HueSet> = {
  sun: { base: '#F5B400', soft: '#FFF1C9', deep: '#8A5A00', track: '#FBE3A1' },
  clay: { base: '#D9663A', soft: '#FCE4D8', deep: '#9E4322', track: '#F4C3AC' },
  leaf: { base: '#2F9A5B', soft: '#DDF2E3', deep: '#1D6B3E', track: '#B5E0C3' },
  plum: { base: '#8B55C9', soft: '#EFE4FA', deep: '#62349A', track: '#D6C2EF' },
  lake: { base: '#2D6FDB', soft: '#DFEAFC', deep: '#1D4E9E', track: '#B8CEF4' },
  teal: { base: '#13A1A0', soft: '#D5F2F1', deep: '#0C6E6E', track: '#A9E0DE' },
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
  shadowColor: '#4A3B22',
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
