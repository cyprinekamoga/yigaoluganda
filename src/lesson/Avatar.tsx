import { View } from 'react-native';
import Svg, { G } from 'react-native-svg';
import type { CastRole } from '../content/types';
import { NgaaliArt } from '../ui/Ngaali';
import { C, F, HUES } from '../ui/theme';
import { Txt } from '../ui/Txt';

const ROLE_HUE: Record<CastRole, keyof typeof HUES> = {
  ngaali: 'sun',
  elder: 'plum',
  friend: 'leaf',
  parent: 'clay',
  rider: 'lake',
  seller: 'teal',
};

export function Avatar({ role, name, size = 40 }: { role: CastRole; name: string; size?: number }) {
  const h = HUES[ROLE_HUE[role]];
  if (role === 'ngaali') {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: h.soft, overflow: 'hidden' }}>
        <Svg width={size} height={size} viewBox="22 12 76 76">
          <G>
            <NgaaliArt face="happy" />
          </G>
        </Svg>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: h.deep, alignItems: 'center', justifyContent: 'center' }}>
      <Txt style={{ ...F.heading, fontSize: size * 0.45, color: '#fff', lineHeight: size * 0.6 }}>{name.charAt(0)}</Txt>
    </View>
  );
}

export const YOU_COLOR = C.ink;
