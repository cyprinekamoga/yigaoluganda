import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

/**
 * Ngaali, the grey crowned crane (Uganda's national bird), drawn for this app.
 * Mascot states from the PRD: idle, correct, incorrect and badge, plus a few extra poses
 * used by the chapter illustrations.
 */
export type Pose = 'stand' | 'wave' | 'cheer' | 'bow' | 'point' | 'think' | 'hold' | 'ride';
export type Face = 'open' | 'happy' | 'blink' | 'soft' | 'up' | 'sleepy';

const COL = {
  body: '#A7B1BE',
  bodyShade: '#8E99A8',
  wing: '#6F7B8B',
  wingPanel: '#FFFFFF',
  gold: '#F5B400',
  goldTip: '#D98E00',
  cap: '#1F1A17',
  cheek: '#FFFFFF',
  red: '#D71A06',
  beak: '#3D4049',
  leg: '#2A2622',
  eye: '#1F1A17',
};

const WING_ANGLES: Record<Pose, [number, number]> = {
  stand: [0, 0],
  wave: [0, 104],
  cheer: [125, 125],
  bow: [-15, -15],
  point: [0, 82],
  think: [0, 150],
  hold: [-38, -38],
  ride: [-46, -46],
};

const BRISTLES = [-64, -48, -32, -16, 0, 16, 32, 48, 64];

function Wing({ angle }: { angle: number }) {
  return (
    <G transform={`rotate(${angle} 42 92)`}>
      <Path d="M43 88 C24 90 17 108 24 126 C34 121 42 111 48 99 Z" fill={COL.wing} />
      <Path d="M39 95 C29 99 25 108 27 116 C34 111 39 104 43 98 Z" fill={COL.wingPanel} />
      <Path d="M27 116 C25 120 24 124 24 126 C28 123 31 119 33 115 Z" fill={COL.gold} />
    </G>
  );
}

function Eyes({ face }: { face: Face }) {
  if (face === 'happy') {
    return <Path d="M45.5 55 Q50 49 54.5 55 M65.5 55 Q70 49 74.5 55" stroke={COL.eye} strokeWidth={2.8} strokeLinecap="round" fill="none" />;
  }
  if (face === 'blink' || face === 'sleepy') {
    return <Path d="M46 54 Q50 57.5 54 54 M66 54 Q70 57.5 74 54" stroke={COL.eye} strokeWidth={2.6} strokeLinecap="round" fill="none" />;
  }
  const dy = face === 'up' ? -2.4 : 0;
  const dx = face === 'up' ? 1.2 : 0;
  return (
    <G>
      <Circle cx={50 + dx} cy={54 + dy} r={4} fill={COL.eye} />
      <Circle cx={70 + dx} cy={54 + dy} r={4} fill={COL.eye} />
      <Circle cx={51.4 + dx} cy={52.5 + dy} r={1.4} fill="#fff" />
      <Circle cx={71.4 + dx} cy={52.5 + dy} r={1.4} fill="#fff" />
      {face === 'soft' && (
        <Path d="M45 47.5 L53.5 46 M75 47.5 L66.5 46" stroke={COL.eye} strokeWidth={1.9} strokeLinecap="round" />
      )}
    </G>
  );
}

function Head({ face, speaking }: { face: Face; speaking: boolean }) {
  return (
    <G>
      {/* golden crown of bristles */}
      {BRISTLES.map((deg, i) => {
        const len = 15 + (i % 2) * 4.5;
        const rad = ((deg - 90) * Math.PI) / 180;
        const x = 60 + Math.cos(rad) * len;
        const y = 34 + Math.sin(rad) * len;
        return (
          <G key={deg}>
            <Line x1={60} y1={34} x2={x} y2={y} stroke={COL.gold} strokeWidth={2.6} strokeLinecap="round" />
            <Circle cx={x} cy={y} r={2.4} fill={COL.goldTip} />
          </G>
        );
      })}
      <Circle cx={60} cy={51} r={20.5} fill={COL.body} />
      {/* black velvet forehead */}
      <Path d="M40.6 48 A20 20 0 0 1 79.4 48 Q60 40 40.6 48 Z" fill={COL.cap} />
      {/* white cheek patches topped with red */}
      <Ellipse cx={49} cy={55} rx={9} ry={10} fill={COL.cheek} />
      <Ellipse cx={71} cy={55} rx={9} ry={10} fill={COL.cheek} />
      <Ellipse cx={49} cy={46.2} rx={5.6} ry={2.5} fill={COL.red} />
      <Ellipse cx={71} cy={46.2} rx={5.6} ry={2.5} fill={COL.red} />
      <Eyes face={face} />
      <Ellipse cx={44.5} cy={62} rx={3} ry={1.6} fill="#F6A9B3" opacity={0.85} />
      <Ellipse cx={75.5} cy={62} rx={3} ry={1.6} fill="#F6A9B3" opacity={0.85} />
      {/* beak */}
      {speaking ? (
        <G>
          <Path d="M56 59.5 L64 59.5 L60 65 Z" fill={COL.beak} />
          <Path d="M57.2 66.4 L62.8 66.4 L60 70 Z" fill={COL.beak} />
          <Path d="M57 65 L63 65 L62.6 66.5 L57.4 66.5 Z" fill="#C2414C" />
        </G>
      ) : (
        <Path d="M56 59.5 L64 59.5 L60 69 Z" fill={COL.beak} />
      )}
      {/* red wattle */}
      <Ellipse cx={60} cy={73.5} rx={3.1} ry={4.6} fill={COL.red} />
    </G>
  );
}

export interface NgaaliArtProps {
  pose?: Pose;
  face?: Face;
  speaking?: boolean;
  /** Something Ngaali holds in front (drawn by the caller, centred at 60,100). */
  held?: React.ReactNode;
}

/** Ngaali as an SVG group in a 120 × 160 box, for embedding in scenes. */
export function NgaaliArt({ pose = 'stand', face = 'open', speaking = false, held }: NgaaliArtProps) {
  const [left, right] = WING_ANGLES[pose];
  const headTilt = pose === 'think' ? 'rotate(7 60 70)' : pose === 'point' ? 'rotate(-4 60 70)' : '';
  const upper = pose === 'bow' ? 'rotate(16 60 128)' : '';
  return (
    <G>
      <Ellipse cx={60} cy={155} rx={28} ry={4} fill="rgba(60,45,20,0.12)" />
      {pose !== 'ride' && (
        <G stroke={COL.leg} strokeWidth={4} strokeLinecap="round" fill="none">
          <Path d="M53 120 L51 151 M45 152 L57 152" />
          <Path d="M67 120 L69 151 M63 152 L75 152" />
        </G>
      )}
      <G transform={upper}>
        {/* neck and body */}
        <Path d="M50.5 52 C49.5 72 47 85 45 95 L75 95 C73 85 70.5 72 69.5 52 Z" fill={COL.body} />
        <Ellipse cx={60} cy={104} rx={27} ry={22.5} fill={COL.body} />
        <Path d="M52 80 C55 91 65 91 68 80 C66 97 54 97 52 80 Z" fill={COL.bodyShade} opacity={0.6} />
        <Wing angle={left} />
        <G transform="translate(120 0) scale(-1 1)">
          <Wing angle={right} />
        </G>
        {held}
        <G transform={headTilt}>
          <Head face={face} speaking={speaking} />
        </G>
      </G>
    </G>
  );
}

export type Mood = 'idle' | 'correct' | 'incorrect' | 'badge' | 'think' | 'wave' | 'still';

const MOOD_ART: Record<Mood, { pose: Pose; face: Face; speaking: boolean }> = {
  idle: { pose: 'stand', face: 'open', speaking: false },
  still: { pose: 'stand', face: 'open', speaking: false },
  wave: { pose: 'wave', face: 'happy', speaking: true },
  correct: { pose: 'cheer', face: 'happy', speaking: true },
  incorrect: { pose: 'point', face: 'soft', speaking: false },
  badge: { pose: 'hold', face: 'happy', speaking: true },
  think: { pose: 'think', face: 'up', speaking: false },
};

const useNative = Platform.OS !== 'web';

function Medal() {
  return (
    <G>
      <Path d="M54 84 L60 98 L66 84" stroke={COL.red} strokeWidth={4} fill="none" />
      <Circle cx={60} cy={104} r={9} fill={COL.gold} stroke={COL.goldTip} strokeWidth={2} />
      <Path d="M60 98.5 L61.7 102 L65.5 102.4 L62.6 104.9 L63.5 108.6 L60 106.7 L56.5 108.6 L57.4 104.9 L54.5 102.4 L58.3 102 Z" fill="#fff" />
    </G>
  );
}

export interface NgaaliProps {
  mood?: Mood;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** Accessible name; omit when Ngaali sits next to text that already explains. */
  label?: string;
}

/**
 * The animated mascot. The PRD's state engine:
 * STATE_IDLE → idle (gentle bob, blinks), STATE_CORRECT → correct (hop, wings up),
 * STATE_INCORRECT → incorrect (soft face, encouraging sway), STATE_BADGE → badge (holds a medal).
 */
export function Ngaali({ mood = 'idle', size = 120, style, label }: NgaaliProps) {
  const [anim] = useState(() => new Animated.Value(0));
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    anim.stopAnimation();
    anim.setValue(0);
    let a: Animated.CompositeAnimation | null = null;
    if (mood === 'idle' || mood === 'think' || mood === 'wave') {
      a = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
          Animated.timing(anim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        ]),
      );
    } else if (mood === 'correct' || mood === 'badge') {
      a = Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
        Animated.timing(anim, { toValue: 0, duration: 220, easing: Easing.bounce, useNativeDriver: useNative }),
        Animated.timing(anim, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
        Animated.timing(anim, { toValue: 0, duration: 260, easing: Easing.bounce, useNativeDriver: useNative }),
      ]);
    } else if (mood === 'incorrect') {
      a = Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: useNative }),
        Animated.timing(anim, { toValue: -1, duration: 260, useNativeDriver: useNative }),
        Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: useNative }),
      ]);
    }
    a?.start();
    return () => a?.stop();
  }, [mood, anim]);

  useEffect(() => {
    if (mood !== 'idle' && mood !== 'still') return;
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3600);
    return () => clearInterval(id);
  }, [mood]);

  const transform =
    mood === 'incorrect'
      ? [{ rotate: anim.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] }) }]
      : mood === 'correct' || mood === 'badge'
        ? [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.1] }) }]
        : mood === 'still'
          ? []
          : [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.035] }) }];

  const art = MOOD_ART[mood];
  const face: Face = blink && art.face === 'open' ? 'blink' : art.face;

  return (
    <Animated.View
      style={[{ width: size, height: size * (160 / 120), transform }, style]}
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
    >
      <Svg width="100%" height="100%" viewBox="0 0 120 160">
        <NgaaliArt pose={art.pose} face={face} speaking={art.speaking} held={mood === 'badge' ? <Medal /> : undefined} />
      </Svg>
    </Animated.View>
  );
}

/** A plain round rectangle helper used by scenes. */
export const SceneRect = Rect;
