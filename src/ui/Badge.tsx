import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { BADGES, type BadgeIcon } from '../logic/badges';
import { C } from './theme';

type Name = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON: Record<BadgeIcon, Name> = {
  feather: 'feather',
  ear: 'ear-hearing',
  heart: 'hand-heart',
  bow: 'human-greeting-variant',
  chat: 'chat',
  star: 'star',
  flame: 'fire',
  flame2: 'fire-circle',
  bolt: 'lightning-bolt',
  mic: 'microphone',
  mountain: 'image-filter-hdr',
  crown: 'crown',
};

/** A medal: gold ring when earned, flat grey when not. Icon + title text carry meaning, never colour alone. */
export function BadgeMedal({ id, earned, size = 64 }: { id: string; earned: boolean; size?: number }) {
  const def = BADGES.find((b) => b.id === id);
  const icon = def ? ICON[def.icon] : 'star';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: earned ? C.sunSoft : C.paperDeep,
        borderWidth: size * 0.07,
        borderColor: earned ? C.sun : C.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={icon} size={size * 0.48} color={earned ? C.sunDeep : C.ink3} />
    </View>
  );
}
