import { Text, type TextProps, type TextStyle, StyleSheet } from 'react-native';
import { C, F } from './theme';

export type Variant = 'hero' | 'title' | 'h2' | 'h3' | 'body' | 'strong' | 'small' | 'caption' | 'lg' | 'lgBig' | 'label';

const V: Record<Variant, TextStyle> = {
  hero: { fontFamily: F.display, fontSize: 34, lineHeight: 40, color: C.ink },
  title: { fontFamily: F.display, fontSize: 28, lineHeight: 34, color: C.ink },
  h2: { fontFamily: F.heading, fontSize: 22, lineHeight: 28, color: C.ink },
  h3: { fontFamily: F.heading, fontSize: 18, lineHeight: 23, color: C.ink },
  body: { fontFamily: F.body, fontSize: 16, lineHeight: 24, color: C.ink },
  strong: { fontFamily: F.semi, fontSize: 16, lineHeight: 23, color: C.ink },
  small: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.ink2 },
  caption: { fontFamily: F.medium, fontSize: 12, lineHeight: 16, color: C.ink2, letterSpacing: 0.3 },
  label: { fontFamily: F.semi, fontSize: 13, lineHeight: 17, color: C.ink2, letterSpacing: 0.6, textTransform: 'uppercase' },
  /** Luganda text. Lexend's wide spacing keeps double letters (nn, ŋŋ, ii) easy to see. */
  lg: { fontFamily: F.semi, fontSize: 20, lineHeight: 27, color: C.ink },
  lgBig: { fontFamily: F.semi, fontSize: 34, lineHeight: 42, color: C.ink, letterSpacing: 0.5 },
};

export function Txt({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <Text maxFontSizeMultiplier={1.6} {...rest} style={[V[variant], style]} />;
}

export const txt = StyleSheet.create(V as Record<Variant, TextStyle>);
