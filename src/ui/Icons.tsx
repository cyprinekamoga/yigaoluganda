import Svg, { Ellipse, Path } from 'react-native-svg';
import { C } from './theme';

/**
 * The game's own symbols, drawn from Buganda life and only in the brand colours.
 * "Off" states use the maroon surface shades.
 */

const TOMATO_SHADE = '#A51404';

/** A clay water pot: the learner's "lives". A wrong answer spills one. */
export function PotIcon({ size = 22, off = false }: { size?: number; off?: boolean }) {
  const body = off ? C.line : C.tomato;
  const neck = off ? C.paperDeep : TOMATO_SHADE;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7.2 3.4 H16.8 Q17.6 3.4 17.6 4.3 Q17.6 5.2 16.8 5.2 H7.2 Q6.4 5.2 6.4 4.3 Q6.4 3.4 7.2 3.4 Z" fill={neck} />
      <Path d="M9 5 H15 L16.2 8.6 H7.8 Z" fill={neck} />
      <Path d="M7.6 8.4 C2.6 10.6 2.8 18.8 7.6 21 H16.4 C21.2 18.8 21.4 10.6 16.4 8.4 Z" fill={body} />
      <Path d="M4.6 13.2 Q12 15.6 19.4 13.2" stroke={off ? C.paperDeep : C.neon} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {!off && <Ellipse cx={8.2} cy={16.6} rx={1.3} ry={2.2} fill={C.ink} opacity={0.35} />}
    </Svg>
  );
}

/** A cowrie shell: the app's currency, as cowries once were in Buganda. */
export function CowrieIcon({ size = 22 }: { size?: number }) {
  const teeth = [6.6, 9, 11.4, 13.8, 16.2];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx={12} cy={12} rx={7.4} ry={9.6} fill={C.ink} />
      <Path d="M12 3.4 Q10.4 12 12 20.6" stroke={C.paper} strokeWidth={1.7} fill="none" strokeLinecap="round" />
      {teeth.map((y) => (
        <Path key={y} d={`M${10.1 + Math.abs(y - 12) * 0.08} ${y} h-1.5 M${12.4 - Math.abs(y - 12) * 0.05} ${y} h1.5`} stroke={C.ink3} strokeWidth={1} strokeLinecap="round" />
      ))}
      <Ellipse cx={15.4} cy={8.2} rx={1.2} ry={2} fill="#FFFFFF" opacity={0.35} />
    </Svg>
  );
}

/** A Kiganda drum: the drumbeat keeps time with every day you practise. */
export function DrumIcon({ size = 22, off = false }: { size?: number; off?: boolean }) {
  // Off: a plain silhouette, so the drum shape still reads when it is small.
  const body = off ? C.line : C.tomato;
  const skin = off ? C.ink3 : C.ink;
  const lace = off ? C.line : C.neon;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.8 6.4 L6.2 19 Q12 22.2 17.8 19 L20.2 6.4 Q12 9.4 3.8 6.4 Z" fill={body} />
      <Path d="M5.6 7.6 L8.4 19.8 L11.2 8.6 L14 19.9 L16.6 8.3 L18.4 7.6" stroke={lace} strokeWidth={1.1} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Ellipse cx={12} cy={6.2} rx={8.2} ry={2.6} fill={skin} />
    </Svg>
  );
}
