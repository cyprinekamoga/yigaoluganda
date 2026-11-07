import type { TextStyle } from 'react-native';
import type { Hue } from '../content/types';

/**
 * Design tokens. Only the brand colours, plus shades and tints made from them:
 *   deep maroon #250104 — page and card surfaces
 *   tomato red  #D71A06 — buttons, hearts, wrong answers, progress
 *   neon yellow #CDF73D — highlights, correct answers, the selected tab
 * Text is a soft off-white tinted from the palette. Every text pairing is checked
 * for WCAG AA contrast in theme.test.ts.
 */
export const BRAND = { maroon: '#250104', tomato: '#D71A06', neon: '#CDF73D' } as const;

export const C = {
  /** Surfaces: shades of deep maroon. */
  paper: '#250104',
  card: '#3A0A0D',
  paperDeep: '#4D1116',
  line: '#5E1C22',

  /** Text on maroon. */
  ink: '#FFF1EC',
  ink2: '#E3BEB7',
  ink3: '#A8807A',
  /** Text on light surfaces (rare). */
  onInk: '#250104',
  onInk2: '#E3BEB7',

  tomato: '#D71A06',
  tomatoSoft: '#4A0B08',
  /** Tomato lightened so it reads as text on maroon. */
  tomatoDeep: '#FF7A66',
  onTomato: '#FFF1EC',

  neon: '#CDF73D',
  /** Darkening neon yellow turns it olive green, so its 'soft' background is a maroon shade. */
  neonSoft: '#4D1116',
  neonDeep: '#CDF73D',
  onNeon: '#250104',

  /** Medals, XP and the crane's crown: neon yellow. */
  sun: '#CDF73D',
  sunSoft: '#4D1116',
  sunDeep: '#CDF73D',

  /** Hearts and wrong answers: tomato. */
  red: '#D71A06',
  redSoft: '#4A0B08',
  redDeep: '#FF7A66',

  /** Correct answers: neon yellow. */
  leaf: '#CDF73D',
  leafSoft: '#4D1116',
  leafDeep: '#CDF73D',

  gem: '#D71A06',
  flame: '#D71A06',
  crane: '#9AA5B4',
  craneDark: '#6E7A8A',
} as const;

export interface HueSet {
  /** Ring and decoration colour. */
  base: string;
  /** Dark background of the illustration circle. */
  soft: string;
  /** Text colour on maroon surfaces. */
  deep: string;
  /** Unfilled part of the progress ring. */
  track: string;
  /** Text colour on top of `base`. */
  on: string;
}

/** Chapter colours: tomato, neon yellow and a tomato tint. */
export const HUES: Record<Hue, HueSet> = {
  tomato: { base: '#D71A06', soft: '#4A0B08', deep: '#FF7A66', track: '#5E1510', on: '#FFF1EC' },
  neon: { base: '#CDF73D', soft: '#4D1116', deep: '#CDF73D', track: '#5E1C22', on: '#250104' },
  blush: { base: '#FF8A78', soft: '#45121A', deep: '#FFB3A6', track: '#6A2A2E', on: '#250104' },
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
  shadowColor: '#000000',
  shadowOpacity: 0.25,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
