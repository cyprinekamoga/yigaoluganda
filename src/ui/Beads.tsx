import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { C } from './theme';

/**
 * Progress as a string of beads, after Uganda's rolled paper beads.
 * One bead per step (or lesson). Done beads are filled; the current bead is larger.
 */
export function Beads({
  total,
  done,
  current,
  size = 12,
  color = C.neon,
  currentColor = C.tomato,
  emptyColor = C.line,
  style,
  accessibilityLabel,
  fit = false,
}: {
  total: number;
  done: number;
  /** Index of the bead to emphasise (e.g. the step being played). */
  current?: number;
  size?: number;
  color?: string;
  currentColor?: string;
  emptyColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Shrink the beads so the whole string fits the available width. */
  fit?: boolean;
}) {
  const [width, setWidth] = useState(0);
  // Each bead takes about 1.3 sizes (bead + gap); the current one is half a size bigger.
  const bead = fit && width > 0 && total > 0 ? Math.max(5, Math.min(size, Math.floor(width / (total * 1.3 + 0.6)))) : size;
  const gap = Math.max(2, Math.round(bead * 0.3));
  return (
    <View
      onLayout={fit ? (e) => setWidth(e.nativeEvent.layout.width) : undefined}
      style={[styles.row, { gap }, style]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? 'progressbar' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={accessibilityLabel ? { min: 0, max: total, now: done } : undefined}
    >
      <View style={[styles.thread, { backgroundColor: emptyColor, top: '50%' }]} />
      {Array.from({ length: total }, (_, i) => {
        const isCurrent = i === current;
        const isDone = i < done;
        const s = isCurrent ? Math.round(bead * 1.45) : bead;
        return (
          <View
            key={i}
            style={{
              width: s,
              // Paper beads are longer than they are wide.
              height: Math.round(s * 0.78),
              borderRadius: s,
              backgroundColor: isCurrent ? currentColor : isDone ? color : C.paper,
              borderWidth: isDone || isCurrent ? 0 : 1.5,
              borderColor: emptyColor,
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  thread: { position: 'absolute', left: 0, right: 0, height: 2, marginTop: -1, borderRadius: 1 },
});
