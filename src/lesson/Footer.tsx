import { StyleSheet, View } from 'react-native';
import { C, MAX_W, S } from '../ui/theme';

export function Footer({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.paper, paddingVertical: S.md },
  inner: { width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: S.lg, gap: S.sm },
});
