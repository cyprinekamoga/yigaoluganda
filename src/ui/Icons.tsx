import Svg, { Circle, Path } from 'react-native-svg';
import { C } from './theme';

export function FlameIcon({ size = 22, off = false }: { size?: number; off?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2 C13 6 18 8 18 14 A6 6 0 0 1 6 14 C6 10.5 8.5 9 9 6.5 C10.5 8 11 9.5 10.8 11 C12.8 9.5 12.8 5.5 12 2 Z" fill={off ? '#D9CFC0' : C.flame} />
      <Path d="M12 12 C13 13.5 15 14.5 15 16.5 A3 3 0 0 1 9 16.5 C9 15 10.5 14 12 12 Z" fill={off ? '#EDE5D8' : C.sun} />
    </Svg>
  );
}

export function GemIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3 H18 L22 9 L12 21 L2 9 Z" fill={C.gem} />
      <Path d="M2 9 H22 M8 3 L12 9 L16 3 M12 9 L12 21 M7 9 L12 21 L17 9" stroke="#fff" strokeOpacity={0.55} strokeWidth={1.1} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}

export function HeartIcon({ size = 22, off = false }: { size?: number; off?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21 C11 20 2 14.5 2 8.5 A5 5 0 0 1 12 6 A5 5 0 0 1 22 8.5 C22 14.5 13 20 12 21 Z" fill={off ? '#D9CFC0' : C.red} />
      {!off && <Circle cx={7.5} cy={8.5} r={1.6} fill="#fff" opacity={0.6} />}
    </Svg>
  );
}

export function XpIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z" fill={C.sun} stroke={C.sunDeep} strokeWidth={1} strokeLinejoin="round" />
    </Svg>
  );
}
