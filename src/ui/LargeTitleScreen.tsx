import { useState } from 'react';
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, MAX_W, S, TRACK } from './theme';

const BAR_H = 44;
const useNativeDriver = process.env.EXPO_OS !== 'web';

/**
 * iOS-style large title, the same on iOS, Android and web.
 * The 34 pt title sits at the top of the scrolling content. As it scrolls away, a compact
 * 17 pt title fades into the top bar and a hairline appears under the bar. Pulling down
 * stretches the title a little, like iOS. Expo Router's native large titles are iOS-only,
 * which is why this is drawn in JavaScript.
 */
export function LargeTitleScreen({
  title,
  trailing,
  children,
  testID,
  contentStyle,
  compactAlign = 'center',
}: {
  title: string;
  /** Buttons on the right of the top bar. */
  trailing?: React.ReactNode;
  children: React.ReactNode;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** Centre the compact title like iOS, or start it on the left when the bar has wide trailing content. */
  compactAlign?: 'center' | 'leading';
}) {
  const insets = useSafeAreaInsets();
  const [y] = useState(() => new Animated.Value(0));
  const [titleH, setTitleH] = useState(45);

  const compactOpacity = y.interpolate({ inputRange: [titleH * 0.45, titleH], outputRange: [0, 1], extrapolate: 'clamp' });
  const hairline = y.interpolate({ inputRange: [0, 10], outputRange: [0, 1], extrapolate: 'clamp' });
  const stretch = y.interpolate({ inputRange: [-150, 0], outputRange: [1.12, 1], extrapolate: 'clamp' });

  return (
    <View style={styles.root} testID={testID}>
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <View style={styles.barInner}>
          <Animated.Text
            testID="compact-title"
            numberOfLines={1}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.compact, compactAlign === 'center' ? styles.compactCenter : styles.compactLeading, { opacity: compactOpacity }]}
          >
            {title}
          </Animated.Text>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
        </View>
        <Animated.View style={[styles.hairline, { opacity: hairline }]} />
      </View>

      <Animated.ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y } } }], { useNativeDriver })}
      >
        <View style={[styles.col, contentStyle]}>
          <Animated.Text
            accessibilityRole="header"
            numberOfLines={2}
            onLayout={(e) => setTitleH(e.nativeEvent.layout.height)}
            style={[styles.large, { transform: [{ scale: stretch }] }]}
          >
            {title}
          </Animated.Text>
          {children}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  fill: { flex: 1 },
  bar: { backgroundColor: C.paper, zIndex: 2 },
  barInner: { height: BAR_H, flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: S.lg, gap: S.sm },
  compact: { ...F.semi, fontSize: 17, lineHeight: 22, color: C.ink },
  compactCenter: { position: 'absolute', left: 72, right: 72, textAlign: 'center' },
  compactLeading: { flex: 1 },
  trailing: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' },
  hairline: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,241,236,0.16)' },
  scroll: { paddingBottom: S.xxl * 2 },
  col: { width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: S.lg, gap: S.lg },
  large: { ...F.heading, fontSize: 34, lineHeight: 41, color: C.ink, letterSpacing: TRACK.largeTitle, transformOrigin: 'left bottom', marginTop: 2, marginBottom: -4 },
});
