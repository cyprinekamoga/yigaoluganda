import Svg, { Circle, Path } from 'react-native-svg';
import { View } from 'react-native';

/**
 * Segmented progress meter: one arc per lesson, with a small gap between arcs.
 * Done arcs use the chapter colour; the track is a lighter step of the same hue.
 */
export function ProgressRing({
  size,
  stroke = 7,
  segments,
  done,
  color,
  track,
  children,
}: {
  size: number;
  stroke?: number;
  segments: number;
  done: number;
  color: string;
  track: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = size / 2;
  const gapDeg = segments > 1 ? 14 : 0;
  const seg = 360 / segments;
  const arc = (start: number, end: number) => {
    const p = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return `${c + r * Math.cos(rad)} ${c + r * Math.sin(rad)}`;
    };
    const large = end - start > 180 ? 1 : 0;
    return `M ${p(start)} A ${r} ${r} 0 ${large} 1 ${p(end)}`;
  };
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        {segments === 1 ? (
          <Circle cx={c} cy={c} r={r} stroke={done ? color : track} strokeWidth={stroke} fill="none" />
        ) : (
          Array.from({ length: segments }, (_, i) => (
            <Path
              key={i}
              d={arc(i * seg + gapDeg / 2, (i + 1) * seg - gapDeg / 2)}
              stroke={i < done ? color : track}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
            />
          ))
        )}
      </Svg>
      {children}
    </View>
  );
}
