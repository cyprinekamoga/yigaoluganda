import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import type { Hue, TipIcon } from '../content/types';
import { HUES } from './theme';

type Name = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<TipIcon, Name> = {
  sound: 'waveform',
  heart: 'hand-heart',
  bow: 'human-greeting-variant',
  chat: 'chat-processing',
  moon: 'weather-night',
  people: 'account-group',
  drum: 'family-tree',
  question: 'help-circle',
  market: 'storefront',
  boda: 'motorbike',
  food: 'food-variant',
  star: 'star-four-points',
};

export function TipIconBadge({ icon, hue = 'gold', size = 40 }: { icon: TipIcon; hue?: Hue; size?: number }) {
  const h = HUES[hue];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: h.soft, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name={ICONS[icon]} size={size * 0.55} color={h.deep} />
    </View>
  );
}
