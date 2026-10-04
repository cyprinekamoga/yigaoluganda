/**
 * The mascot: an original grey crowned crane (Uganda's national bird), drawn for this app.
 * Default name "Ngaali" (Luganda for the crowned crane).
 */
export type MascotMood = 'happy' | 'cheer' | 'think' | 'gentle' | 'sleep'

interface Props {
  mood?: MascotMood
  size?: number
  className?: string
  /** Accessible name. Leave empty when the crane is decoration next to text. */
  label?: string
  animate?: boolean
}

const BRISTLES = [-62, -46, -31, -16, 0, 16, 31, 46, 62]

export function Mascot({ mood = 'happy', size = 120, className = '', label, animate = true }: Props) {
  const wingClass = mood === 'cheer' && animate ? 'animate-flap' : ''
  const tilt = mood === 'gentle' ? 'rotate(-6 60 50)' : mood === 'think' ? 'rotate(5 60 50)' : undefined
  return (
    <svg
      viewBox="0 -14 120 176"
      width={size}
      height={size * 1.47}
      className={`${animate && mood !== 'sleep' ? 'animate-bob' : ''} ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <ellipse cx="60" cy="157" rx="26" ry="4" fill="rgba(30,27,24,0.12)" />
      {/* legs */}
      <g stroke="#2b2a33" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M53 120 L51 153 M45 154 L57 154" />
        <path d="M67 120 L69 153 M63 154 L75 154" />
      </g>
      {/* wings */}
      <g className={wingClass} style={{ transformOrigin: '44px 92px' }}>
        <path d="M44 86 C22 88 14 106 22 122 C32 116 41 108 48 98 Z" fill="#6e7988" />
        <path d="M40 92 C28 96 24 106 26 114 C33 108 38 102 42 96 Z" fill="#f4f6f9" />
        <path d="M30 104 C27 109 26 113 26 114 C29 111 32 108 34 105 Z" fill="#c9893b" />
      </g>
      <g className={wingClass} style={{ transformOrigin: '76px 92px', animationDirection: 'reverse' }}>
        <path d="M76 86 C98 88 106 106 98 122 C88 116 79 108 72 98 Z" fill="#6e7988" />
        <path d="M80 92 C92 96 96 106 94 114 C87 108 82 102 78 96 Z" fill="#f4f6f9" />
        <path d="M90 104 C93 109 94 113 94 114 C91 111 88 108 86 105 Z" fill="#c9893b" />
      </g>
      {/* body and neck */}
      <ellipse cx="60" cy="102" rx="27" ry="23" fill="#9ba6b4" />
      <path d="M51 50 C50 70 47 84 45 94 L75 94 C73 84 70 70 69 50 Z" fill="#9ba6b4" />
      <path d="M52 80 C55 90 65 90 68 80 C66 96 54 96 52 80 Z" fill="#7f8a99" opacity="0.6" />
      <g transform={`translate(0 -12) ${tilt ?? ''}`}>
        {/* crown of golden bristles */}
        <g strokeLinecap="round">
          {BRISTLES.map((deg, i) => {
            const len = 15 + (i % 2) * 4
            const rad = ((deg - 90) * Math.PI) / 180
            const x = 60 + Math.cos(rad) * len
            const y = 33 + Math.sin(rad) * len
            return (
              <g key={deg}>
                <line x1="60" y1="33" x2={x} y2={y} stroke="#ffc72c" strokeWidth="2.6" />
                <circle cx={x} cy={y} r="2.3" fill="#e9a400" />
              </g>
            )
          })}
        </g>
        {/* head */}
        <circle cx="60" cy="50" r="20" fill="#9ba6b4" />
        <path d="M41 47 A19.5 19.5 0 0 1 79 47 Q60 39 41 47 Z" fill="#23222a" />
        {/* white cheeks with a red patch on top */}
        <ellipse cx="49" cy="54" rx="8.5" ry="9.5" fill="#ffffff" />
        <ellipse cx="71" cy="54" rx="8.5" ry="9.5" fill="#ffffff" />
        <ellipse cx="49" cy="45.5" rx="5.5" ry="2.6" fill="#c8102e" />
        <ellipse cx="71" cy="45.5" rx="5.5" ry="2.6" fill="#c8102e" />
        <Eyes mood={mood} />
        {/* blush */}
        <ellipse cx="45" cy="61" rx="3" ry="1.6" fill="#f7a8b4" opacity="0.8" />
        <ellipse cx="75" cy="61" rx="3" ry="1.6" fill="#f7a8b4" opacity="0.8" />
        {/* beak and red wattle */}
        <path d="M56.5 59 L63.5 59 L60 68 Z" fill="#4a4e57" />
        <ellipse cx="60" cy="72" rx="3" ry="4.5" fill="#c8102e" />
      </g>
    </svg>
  )
}

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === 'cheer' || mood === 'sleep') {
    const d = mood === 'cheer' ? 'M46 56 Q50 50 54 56 M66 56 Q70 50 74 56' : 'M46 54 Q50 58 54 54 M66 54 Q70 58 74 54'
    return <path d={d} stroke="#1e1b18" strokeWidth="2.6" strokeLinecap="round" fill="none" />
  }
  const dy = mood === 'think' ? -2.5 : 0
  return (
    <g>
      <circle cx="50" cy={54 + dy} r="3.8" fill="#1e1b18" />
      <circle cx="70" cy={54 + dy} r="3.8" fill="#1e1b18" />
      <circle cx="51.3" cy={52.6 + dy} r="1.3" fill="#fff" />
      <circle cx="71.3" cy={52.6 + dy} r="1.3" fill="#fff" />
      {mood === 'gentle' && <path d="M45 46.5 L53 48.5 M75 46.5 L67 48.5" stroke="#1e1b18" strokeWidth="1.8" strokeLinecap="round" />}
    </g>
  )
}
