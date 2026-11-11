import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BADGES, type BadgeIcon } from '../logic/badges';
import { DrumIcon } from './Icons';
import { C } from './theme';

type Name = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICON: Record<Exclude<BadgeIcon, 'drum'>, Name> = {
  feather: 'feather',
  ear: 'ear-hearing',
  heart: 'hand-heart',
  bow: 'human-greeting-variant',
  chat: 'chat',
  target: 'bullseye-arrow',
  beat: 'waveform',
  basket: 'basket',
  mic: 'microphone',
  mountain: 'image-filter-hdr',
  crown: 'crown',
};

/**
 * An achievement, drawn as a Kiganda shield (engabo): tall, oval and pointed, with a raised rib.
 * Earned shields are outlined in neon; unearned ones are flat maroon. The title always goes with it,
 * so colour never carries the meaning alone.
 */
export function BadgeMedal({ id, earned, size = 64 }: { id: string; earned: boolean; size?: number }) {
  const def = BADGES.find((b) => b.id === id);
  const icon = def?.icon ?? 'feather';
  const w = Math.round(size * 0.84);
  const iconSize = Math.round(size * 0.4);
  return (
    <View style={{ width: w, height: size }}>
      <Svg width={w} height={size} viewBox="0 0 40 48">
        <Path
          d="M20 1.5 C31 4 37.5 13 37.5 24 C37.5 35 30.5 43 20 46.5 C9.5 43 2.5 35 2.5 24 C2.5 13 9 4 20 1.5 Z"
          fill={earned ? C.tomatoSoft : C.paperDeep}
          stroke={earned ? C.neon : C.line}
          strokeWidth={2.4}
        />
        <Path d="M20 6 L20 13 M20 35 L20 42" stroke={earned ? C.tomato : C.line} strokeWidth={1.6} strokeLinecap="round" opacity={0.8} />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        {icon === 'drum' ? (
          <DrumIcon size={iconSize} off={!earned} />
        ) : (
          <MaterialCommunityIcons name={ICON[icon]} size={iconSize} color={earned ? C.neon : C.ink3} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
