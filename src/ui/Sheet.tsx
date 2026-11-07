import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, MAX_W, R, S } from './theme';

/** A simple bottom sheet built on Modal. */
export function Sheet({ visible, onClose, children, testID }: { visible: boolean; onClose: () => void; children: React.ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.wrap}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <View testID={testID} style={[styles.sheet, { paddingBottom: S.xl + insets.bottom }]}>
          <View style={styles.grab} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(31,26,23,0.42)', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: MAX_W, backgroundColor: C.paper, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, padding: S.xl, paddingTop: S.md, gap: S.lg },
  grab: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, marginBottom: S.sm },
});
