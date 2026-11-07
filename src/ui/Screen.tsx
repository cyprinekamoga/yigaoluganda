import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { C, MAX_W, S } from './theme';

/** Page wrapper: cream background, safe areas, centred column on wide screens. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  header,
  testID,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
  testID?: string;
}) {
  return (
    <SafeAreaView edges={edges} style={styles.safe} testID={testID}>
      {header}
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.col, contentStyle]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.col, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.paper },
  scroll: { paddingBottom: S.xxl * 2 },
  col: { width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: S.lg, gap: S.lg },
  fill: { flex: 1 },
});
