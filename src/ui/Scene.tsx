import Svg, { Circle, ClipPath, Defs, Ellipse, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import type { Hue, SceneId } from '../content/types';
import { NgaaliArt, type NgaaliArtProps } from './Ngaali';
import { C, HUES, SYSTEM_FONT } from './theme';

/** A darker shade of the brand neon yellow, for leaves and outlines. */
const NEON_SHADE = '#9CC21A';

/** Chapter tile illustrations: Ngaali acting out each chapter's scenario. */

const at = (x: number, y: number, s = 0.6) => `translate(${x} ${y}) scale(${s})`;

function Heart({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
  return <Path transform={`translate(${x} ${y}) scale(${s})`} d="M0 3 C0 -1 5 -2 6 2 C7 -2 12 -1 12 3 C12 7 6 10 6 11 C6 10 0 7 0 3 Z" fill={fill} />;
}

function Sparkle({ x, y, s = 1, fill }: { x: number; y: number; s?: number; fill: string }) {
  return <Path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z" fill={fill} />;
}

const Teacup = (
  <G>
    <Path d="M49 96 L71 96 L68 110 Q60 114 52 110 Z" fill={C.ink} stroke={C.ink3} strokeWidth={1.5} />
    <Path d="M70.5 99 Q77 99 75.5 104 Q74 107 69 106" stroke={C.ink3} strokeWidth={2} fill="none" />
    <Path d="M52 98 L68 98" stroke={C.tomato} strokeWidth={2.5} />
    <Path d="M56 91 Q54 87 57 84 M63 91 Q61 87 64 84" stroke={C.ink3} strokeWidth={1.6} fill="none" strokeLinecap="round" />
  </G>
);

const Plate = (
  <G>
    <Ellipse cx={60} cy={107} rx={19} ry={6} fill={NEON_SHADE} />
    <Ellipse cx={60} cy={105.5} rx={16} ry={5} fill={C.ink} stroke={C.ink3} strokeWidth={1.2} />
    <Path d="M48 104 Q50 94 60 94 Q70 94 72 104 Z" fill={C.neon} />
    <Path d="M53 99 Q57 97 60 99 M61 98 Q65 96 67 99" stroke={NEON_SHADE} strokeWidth={1.2} fill="none" />
    <Path d="M55 89 Q53 85 56 82 M64 89 Q62 85 65 82" stroke={C.ink3} strokeWidth={1.6} fill="none" strokeLinecap="round" />
  </G>
);

const NameTag = (
  <G>
    <Rect x={47} y={95} width={26} height={17} rx={3} fill={C.ink} stroke={C.ink3} strokeWidth={1.2} />
    <Rect x={47} y={95} width={26} height={5} rx={2} fill={C.red} />
    <Rect x={51} y={103} width={18} height={2.4} rx={1.2} fill={C.ink3} />
    <Rect x={51} y={107} width={12} height={2.4} rx={1.2} fill={C.ink2} />
  </G>
);

interface Spec {
  art: NgaaliArtProps;
  x: number;
  y: number;
  s?: number;
  back?: (h: (typeof HUES)[Hue]) => React.ReactNode;
  front?: (h: (typeof HUES)[Hue]) => React.ReactNode;
}

const Basket = (
  <G>
    <Circle cx={53} cy={96} r={5} fill={C.tomato} />
    <Circle cx={62} cy={94} r={5.5} fill={C.tomato} />
    <Circle cx={70} cy={97} r={4.5} fill={C.tomato} />
    <Path d="M52 92 l1.5 -2 M62 89 l1 -2.5 M70 93 l1 -2" stroke={NEON_SHADE} strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M44 99 L78 99 L74 112 Q61 116 48 112 Z" fill={C.ink3} />
    <Path d="M47 104 L75 104 M48 108 L74 108" stroke={C.paperDeep} strokeWidth={1.2} />
  </G>
);

const ClayPot = (
  <G>
    <Path d="M55 86 Q53 82 56 79 M64 86 Q62 82 65 79" stroke={C.ink3} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    <Path d="M53 90 H67 Q68.5 90 68.5 91.6 Q68.5 93.2 67 93.2 H53 Q51.5 93.2 51.5 91.6 Q51.5 90 53 90 Z" fill="#A51404" />
    <Path d="M50.5 94 C42 98 42 110 50.5 114 H69.5 C78 110 78 98 69.5 94 Z" fill={C.tomato} />
    <Path d="M45 102 Q60 106 75 102" stroke={C.neon} strokeWidth={1.6} fill="none" strokeLinecap="round" />
  </G>
);

const SCENES_PART2: Record<'family' | 'numbers' | 'market' | 'kitchen' | 'clock' | 'signpost' | 'home' | 'health' | 'village', Spec> = {
  family: {
    art: { pose: 'wave', face: 'happy', speaking: true },
    x: 4, y: 20,
    front: (h) => (
      <G>
        <G transform={at(70, 56, 0.36)}>
          <NgaaliArt pose="cheer" face="happy" />
        </G>
        <Heart x={86} y={30} s={1.1} fill={h.base} />
        <Heart x={102} y={46} s={0.7} fill={h.track} />
      </G>
    ),
  },
  numbers: {
    art: { pose: 'point', face: 'open', speaking: true },
    x: 4, y: 22,
    back: (h) => (
      <G>
        <Rect x={62} y={12} width={52} height={28} rx={12} fill={C.ink} />
        <Path d="M70 38 L78 38 L66 47 Z" fill={C.ink} />
        {['1', '2', '3'].map((n, i) => (
          <SvgText key={n} x={75 + i * 13.5} y={32} fontSize={15} fontFamily={SYSTEM_FONT} fontWeight="800" fill={i === 1 ? C.tomato : C.onNeon} textAnchor="middle">
            {n}
          </SvgText>
        ))}
        <Sparkle x={104} y={60} s={0.8} fill={h.base} />
      </G>
    ),
  },
  market: {
    art: { pose: 'hold', face: 'happy', speaking: true, held: Basket },
    x: 23, y: 22,
    back: (h) => (
      <G>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Path key={i} d={`M${i * 20} 0 H${i * 20 + 20} V16 Q${i * 20 + 10} 24 ${i * 20} 16 Z`} fill={i % 2 ? C.ink : h.base} />
        ))}
      </G>
    ),
  },
  kitchen: {
    art: { pose: 'hold', face: 'happy', held: ClayPot },
    x: 23, y: 20,
    back: (h) => (
      <G>
        <Path d="M10 70 Q24 40 46 38 Q30 56 10 70 Z" fill={NEON_SHADE} opacity={0.8} />
        <Sparkle x={100} y={28} s={1} fill={h.base} />
        <Sparkle x={106} y={56} s={0.6} fill={h.track} />
      </G>
    ),
  },
  clock: {
    art: { pose: 'think', face: 'up' },
    x: 10, y: 22,
    back: (h) => (
      <G>
        <Circle cx={92} cy={34} r={18} fill={C.ink} />
        <Circle cx={92} cy={34} r={18} fill="none" stroke={h.base} strokeWidth={3} />
        {[0, 90, 180, 270].map((d) => (
          <Line key={d} x1={92 + Math.cos((d * Math.PI) / 180) * 13} y1={34 + Math.sin((d * Math.PI) / 180) * 13} x2={92 + Math.cos((d * Math.PI) / 180) * 15.5} y2={34 + Math.sin((d * Math.PI) / 180) * 15.5} stroke={C.ink3} strokeWidth={2} strokeLinecap="round" />
        ))}
        <Line x1={92} y1={34} x2={92} y2={23} stroke={C.onNeon} strokeWidth={2.6} strokeLinecap="round" />
        <Line x1={92} y1={34} x2={100} y2={38} stroke={C.tomato} strokeWidth={2.6} strokeLinecap="round" />
        <Circle cx={92} cy={34} r={2} fill={C.onNeon} />
      </G>
    ),
  },
  signpost: {
    art: { pose: 'point', face: 'happy', speaking: true },
    x: 0, y: 22,
    front: (h) => (
      <G>
        <Path d="M96 40 L96 112" stroke={C.ink3} strokeWidth={4} strokeLinecap="round" />
        <Path d="M78 42 H110 L116 49 L110 56 H78 Z" fill={h.base} />
        <Path d="M114 62 H82 L76 69 L82 76 H114 Z" fill={C.ink} />
        <Path d="M84 49 H104 M84 69 H106" stroke={C.paper} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      </G>
    ),
  },
  home: {
    art: { pose: 'wave', face: 'happy', speaking: true },
    x: 0, y: 22,
    back: (h) => (
      <G>
        <Rect x={76} y={62} width={38} height={44} fill={C.ink3} />
        <Path d="M70 64 L95 38 L120 64 Z" fill={NEON_SHADE} />
        <Path d="M76 60 L95 41 L114 60" stroke={C.neon} strokeWidth={2} fill="none" />
        <Rect x={89} y={80} width={13} height={26} rx={2} fill={C.paper} />
        <Circle cx={99} cy={93} r={1.4} fill={h.base} />
        <Sparkle x={22} y={26} s={0.9} fill={h.base} />
      </G>
    ),
  },
  health: {
    art: { pose: 'stand', face: 'soft' },
    x: 23, y: 20,
    back: (h) => (
      <G>
        <Path transform="translate(80 18) scale(2.2)" d="M0 3 C0 -1 5 -2 6 2 C7 -2 12 -1 12 3 C12 7 6 10 6 11 C6 10 0 7 0 3 Z" fill={h.base} />
        <Path d="M78 30 H88 L91 23 L95 38 L98 30 H108" stroke={C.ink} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <Sparkle x={18} y={36} s={0.8} fill={h.track} />
      </G>
    ),
  },
  village: {
    art: { pose: 'cheer', face: 'happy' },
    x: 23, y: 26,
    back: (h) => (
      <G>
        <Circle cx={96} cy={26} r={10} fill={C.sun} />
        <Path d="M0 92 Q30 66 64 88 Q92 70 120 86 V120 H0 Z" fill={C.line} />
        <Path d="M14 90 L14 64" stroke={NEON_SHADE} strokeWidth={3} strokeLinecap="round" />
        <Path d="M14 66 Q2 56 0 44 Q12 50 14 64 Q18 50 30 46 Q26 58 14 66 Z" fill={NEON_SHADE} />
        <Path d="M108 88 L108 70" stroke={NEON_SHADE} strokeWidth={2.4} strokeLinecap="round" />
        <Path d="M108 72 Q99 64 98 56 Q107 61 108 70 Q111 61 119 58 Q116 66 108 72 Z" fill={h.base} opacity={0.9} />
      </G>
    ),
  },
};

const SCENES: Record<SceneId, Spec> = {
  ...SCENES_PART2,
  sounds: {
    art: { pose: 'stand', face: 'happy', speaking: true },
    x: 10, y: 22,
    back: (h) => (
      <G>
        <Rect x={62} y={14} width={50} height={26} rx={11} fill={C.ink} />
        <Path d="M68 38 L76 38 L64 47 Z" fill={C.ink} />
        {['a', 'e', 'i', 'o', 'u'].map((v, i) => (
          <SvgText key={v} x={71 + i * 8.2} y={31.5} fontSize={11.5} fontFamily={SYSTEM_FONT} fontWeight="700" fill={C.onNeon} textAnchor="middle">
            {v}
          </SvgText>
        ))}
        <Path d="M90 56 Q95 62 90 68 M96 52 Q104 62 96 72" stroke={h.base} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </G>
    ),
  },
  courtesy: {
    art: { pose: 'hold', face: 'happy', held: Teacup },
    x: 23, y: 20,
    back: (h) => (
      <G>
        <Heart x={14} y={34} s={1.2} fill={h.base} />
        <Heart x={92} y={24} s={0.9} fill={h.track} />
        <Heart x={96} y={62} s={0.8} fill={h.base} />
      </G>
    ),
  },
  wave: {
    art: { pose: 'wave', face: 'happy', speaking: true },
    x: 22, y: 20,
    back: () => (
      <G>
        <Circle cx={26} cy={32} r={11} fill={C.sun} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => (
          <Line key={d} x1={26} y1={32} x2={26 + Math.cos((d * Math.PI) / 180) * 18} y2={32 + Math.sin((d * Math.PI) / 180) * 18} stroke={C.sun} strokeWidth={2.4} strokeLinecap="round" />
        ))}
        <Circle cx={26} cy={32} r={11} fill={C.sun} />
      </G>
    ),
  },
  bow: {
    art: { pose: 'bow', face: 'blink' },
    x: 20, y: 22,
    back: (h) => (
      <G>
        <Sparkle x={92} y={30} s={1.3} fill={h.base} />
        <Sparkle x={102} y={52} s={0.8} fill={h.track} />
        <Sparkle x={20} y={40} s={0.9} fill={h.track} />
      </G>
    ),
  },
  night: {
    art: { pose: 'wave', face: 'sleepy' },
    x: 22, y: 20,
    back: (h) => (
      <G>
        <Path d="M96 18 A16 16 0 1 0 108 44 A13 13 0 1 1 96 18 Z" fill={C.sun} />
        <Sparkle x={24} y={26} s={0.9} fill={C.ink} />
        <Sparkle x={36} y={14} s={0.6} fill={C.ink} />
        <Sparkle x={16} y={52} s={0.6} fill={h.track} />
      </G>
    ),
  },
  pointing: {
    art: { pose: 'point', face: 'open', speaking: true },
    x: 4, y: 20,
    front: () => (
      <G>
        <Ellipse cx={95} cy={106} rx={11} ry={2.5} fill="rgba(60,45,20,0.12)" />
        <Path d="M90 84 L89 104 M100 84 L101 104" stroke={C.crane} strokeWidth={2.4} strokeLinecap="round" />
        <Ellipse cx={95} cy={80} rx={12} ry={11} fill="#A7B1BE" />
        <Circle cx={95} cy={66} r={10} fill="#A7B1BE" />
        <Path d="M95 57 L91 49 M95 57 L95 48 M95 57 L99 49" stroke={C.sun} strokeWidth={2} strokeLinecap="round" />
        <Ellipse cx={91} cy={68} rx={4.4} ry={5} fill={C.ink} />
        <Ellipse cx={99} cy={68} rx={4.4} ry={5} fill={C.ink} />
        <Circle cx={91} cy={68} r={2} fill={C.paper} />
        <Circle cx={99} cy={68} r={2} fill={C.paper} />
        <Path d="M93.5 72 L96.5 72 L95 76 Z" fill="#3D4049" />
      </G>
    ),
  },
  nametag: {
    art: { pose: 'stand', face: 'happy', speaking: true, held: NameTag },
    x: 23, y: 20,
    back: (h) => (
      <G>
        <Sparkle x={20} y={30} s={1.1} fill={h.base} />
        <Sparkle x={100} y={40} s={0.8} fill={h.base} />
      </G>
    ),
  },
  words: {
    // Everyday Words: Ngaali points at a stack of word cards.
    art: { pose: 'point', face: 'happy', speaking: true },
    x: 4, y: 22,
    back: (h) => (
      <G>
        {[
          { y: 16, r: -7, word: 'kino', fill: C.ink, ink: C.onNeon },
          { y: 44, r: 5, word: 'wano', fill: h.base, ink: h.on },
          { y: 72, r: -4, word: 'nnyo', fill: C.ink, ink: C.onNeon },
        ].map((c) => (
          <G key={c.word} transform={`rotate(${c.r} 89 ${c.y + 11})`}>
            <Rect x={67} y={c.y} width={44} height={22} rx={6} fill={c.fill} />
            <SvgText x={89} y={c.y + 15.5} fontSize={12} fontFamily={SYSTEM_FONT} fontWeight="800" fill={c.ink} textAnchor="middle">
              {c.word}
            </SvgText>
          </G>
        ))}
      </G>
    ),
  },
  question: {
    art: { pose: 'think', face: 'up' },
    x: 14, y: 22,
    back: (h) => (
      <G>
        <SvgText x={96} y={44} fontSize={34} fontFamily={SYSTEM_FONT} fontWeight="800" fill={h.base} textAnchor="middle">?</SvgText>
        <SvgText x={22} y={40} fontSize={18} fontFamily={SYSTEM_FONT} fontWeight="800" fill={h.track} textAnchor="middle">?</SvgText>
      </G>
    ),
  },
  feelings: {
    art: { pose: 'cheer', face: 'happy', speaking: true },
    x: 23, y: 24,
    back: (h) => (
      <G>
        <Heart x={10} y={52} s={1} fill={C.red} />
        <Heart x={98} y={58} s={0.9} fill={h.base} />
        <Sparkle x={60} y={12} s={0.9} fill={h.base} />
      </G>
    ),
  },
  boda: {
    art: { pose: 'ride', face: 'happy', speaking: true },
    x: 26, y: 8, s: 0.56,
    front: (h) => (
      <G>
        <Path d="M30 98 L52 98 L60 88 L74 88 L86 98" stroke={C.ink} strokeWidth={4} fill="none" strokeLinejoin="round" />
        <Path d="M40 92 Q50 84 64 88 L72 98 L40 98 Z" fill={C.red} />
        <Rect x={48} y={84} width={24} height={6} rx={3} fill={C.ink} />
        <Path d="M78 78 L86 98" stroke={C.ink} strokeWidth={3.5} strokeLinecap="round" />
        <Path d="M74 78 L84 76" stroke={C.ink} strokeWidth={3.5} strokeLinecap="round" />
        <Circle cx={30} cy={100} r={10} fill="none" stroke={C.ink} strokeWidth={4} />
        <Circle cx={88} cy={100} r={10} fill="none" stroke={C.ink} strokeWidth={4} />
        <Circle cx={30} cy={100} r={3} fill={h.deep} />
        <Circle cx={88} cy={100} r={3} fill={h.deep} />
        <Path d="M10 112 L22 112 M100 112 L112 112" stroke={h.base} strokeWidth={2.5} strokeLinecap="round" />
      </G>
    ),
  },
  meal: {
    art: { pose: 'hold', face: 'happy', speaking: true, held: Plate },
    x: 23, y: 20,
    back: (h) => (
      <G>
        <Path d="M10 70 Q24 40 46 38 Q30 56 10 70 Z" fill={NEON_SHADE} opacity={0.8} />
        <Sparkle x={100} y={30} s={1} fill={h.base} />
      </G>
    ),
  },
  journey: {
    art: { pose: 'wave', face: 'happy', speaking: true },
    x: 8, y: 22,
    back: (h) => (
      <G>
        <Path d="M60 122 Q70 92 92 82 Q112 74 108 50" stroke={h.track} strokeWidth={12} fill="none" strokeLinecap="round" />
        <Path d="M60 122 Q70 92 92 82 Q112 74 108 50" stroke={C.ink} strokeWidth={2} strokeDasharray="4 5" fill="none" />
        <Path d="M108 46 C108 34 92 34 92 46 C92 54 100 60 100 64 C100 60 108 54 108 46 Z" fill={C.red} />
        <Circle cx={100} cy={45} r={3.6} fill={C.ink} />
      </G>
    ),
  },
};

export interface SceneProps {
  scene: SceneId;
  hue: Hue;
  size: number;
  muted?: boolean;
}

/** A chapter illustration on a rounded square, like a picture card. */
export function Scene({ scene, hue, size, muted }: SceneProps) {
  const h = HUES[hue];
  const spec = SCENES[scene];
  const clipId = `clip-${scene}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        <ClipPath id={clipId}>
          <Rect x={0} y={0} width={120} height={120} rx={16} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <Rect x={0} y={0} width={120} height={120} fill={muted ? C.paperDeep : h.soft} />
        <G opacity={muted ? 0.35 : 1}>
          {spec.back?.(h)}
          <G transform={at(spec.x, spec.y, spec.s ?? 0.6)}>
            <NgaaliArt {...spec.art} />
          </G>
          {spec.front?.(h)}
        </G>
      </G>
    </Svg>
  );
}
