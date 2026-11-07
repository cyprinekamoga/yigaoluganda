import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useT } from '@/i18n';
import { useApp } from '@/state/store';
import { C, F } from '@/ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function TabsLayout() {
  const profile = useApp((s) => s.profile);
  const { t } = useT();
  const insets = useSafeAreaInsets();
  if (!profile?.name) return <Redirect href="/onboarding" />;

  const icon = (on: IconName, off: IconName) =>
    function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
      return <Ionicons name={focused ? on : off} size={24} color={color as string} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.ink2,
        tabBarLabelStyle: { ...F.semi, fontSize: 12, lineHeight: 17 },
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.line,
          height: 72 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 6,
        },
        sceneStyle: { backgroundColor: C.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: icon('grid', 'grid-outline'), tabBarButtonTestID: 'tab-home' }} />
      <Tabs.Screen name="practice" options={{ title: t('tabs.practice'), tabBarIcon: icon('chatbubbles', 'chatbubbles-outline'), tabBarButtonTestID: 'tab-practice' }} />
      <Tabs.Screen name="dictionary" options={{ title: t('tabs.dictionary'), tabBarIcon: icon('book', 'book-outline'), tabBarButtonTestID: 'tab-dictionary' }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: icon('person-circle', 'person-circle-outline'), tabBarButtonTestID: 'tab-profile' }} />
    </Tabs>
  );
}
