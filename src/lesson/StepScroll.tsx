import { useRef } from 'react';
import { ScrollView, type ScrollViewInstance, type StyleProp, type ViewStyle } from 'react-native';

/**
 * A step's scrolling page. The result card (`after`) is added at the bottom of the page,
 * and the page scrolls down to it when it appears.
 */
export function StepScroll({ after, contentContainerStyle, children }: { after?: React.ReactNode; contentContainerStyle?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const ref = useRef<ScrollViewInstance>(null);
  const showing = Boolean(after);
  return (
    <ScrollView
      ref={ref}
      contentContainerStyle={contentContainerStyle}
      onContentSizeChange={() => {
        if (showing) ref.current?.scrollToEnd({ animated: true });
      }}
    >
      {children}
      {after}
    </ScrollView>
  );
}
