/**
 * Simple illustrated backdrops for Story mode, drawn in SVG (no external artwork).
 * Each scene name in content/story.json maps to one backdrop; emoji "props" stand on top.
 */
import type { ReactElement } from 'react'

const W = 320
const H = 180

function Sky({ from, to }: { from: string; to: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`sky-${from}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#sky-${from})`} />
    </>
  )
}

const Cloud = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity="0.95">
    <ellipse cx="0" cy="0" rx="22" ry="11" />
    <ellipse cx="16" cy="-6" rx="14" ry="11" />
    <ellipse cx="-14" cy="-3" rx="12" ry="9" />
  </g>
)

const Sun = ({ x, y }: { x: number; y: number }) => (
  <g>
    <circle cx={x} cy={y} r="18" fill="#ffc72c" />
    <circle cx={x} cy={y} r="26" fill="#ffc72c" opacity="0.25" />
  </g>
)

const BananaPlant = ({ x, s = 1 }: { x: number; s?: number }) => (
  <g transform={`translate(${x} ${H - 40}) scale(${s})`}>
    <rect x="-4" y="-60" width="8" height="70" rx="3" fill="#6b8e23" />
    <path d="M0 -58 C-30 -80 -50 -60 -56 -46 C-36 -56 -18 -56 0 -50Z" fill="#3f8f3a" />
    <path d="M0 -58 C30 -84 52 -64 58 -50 C38 -60 18 -58 0 -50Z" fill="#4ca346" />
    <path d="M0 -60 C-6 -92 10 -100 16 -96 C8 -86 4 -74 2 -58Z" fill="#3f8f3a" />
  </g>
)

const scenes: Record<string, () => ReactElement> = {
  bedroom: () => (
    <>
      <rect width={W} height={H} fill="#fde9cf" />
      <rect x="196" y="22" width="92" height="70" rx="6" fill="#bfe0ff" stroke="#fff" strokeWidth="6" />
      <line x1="242" y1="22" x2="242" y2="92" stroke="#fff" strokeWidth="5" />
      <circle cx="220" cy="40" r="2" fill="#fff" />
      <circle cx="266" cy="54" r="2" fill="#fff" />
      <circle cx="232" cy="70" r="2" fill="#fff" />
      <rect y={H - 40} width={W} height="40" fill="#c99668" />
      <rect x="24" y={H - 78} width="120" height="40" rx="8" fill="#6aa0d8" />
      <rect x="24" y={H - 88} width="40" height="18" rx="6" fill="#fff" />
    </>
  ),
  sky: () => (
    <>
      <Sky from="#5aa9f0" to="#cfe8ff" />
      <Sun x={270} y={36} />
      <Cloud x={60} y={50} />
      <Cloud x={200} y={110} s={1.3} />
      <Cloud x={110} y={150} s={0.8} />
    </>
  ),
  airport: () => (
    <>
      <Sky from="#7cc1f5" to="#e3f2ff" />
      <Sun x={280} y={34} />
      <Cloud x={70} y={40} />
      <rect y={H - 46} width={W} height="46" fill="#7d8794" />
      <rect y={H - 26} width={W} height="4" fill="#fff" opacity="0.6" />
      <rect x="150" y="62" width="150" height="72" rx="6" fill="#e9eef3" />
      <rect x="160" y="76" width="130" height="24" rx="3" fill="#8ec7f2" />
      <rect x="150" y="56" width="150" height="10" rx="3" fill="#0b5cad" />
    </>
  ),
  road: () => (
    <>
      <Sky from="#8ccaf7" to="#eaf6ff" />
      <Sun x={60} y={36} />
      <ellipse cx="90" cy={H - 40} rx="120" ry="50" fill="#5fa04e" />
      <ellipse cx="260" cy={H - 44} rx="110" ry="60" fill="#4b8b3e" />
      <rect y={H - 50} width={W} height="50" fill="#b5532f" />
      <path d={`M0 ${H - 18} L${W} ${H - 18}`} stroke="#fff" strokeWidth="4" strokeDasharray="18 14" />
    </>
  ),
  yard: () => (
    <>
      <Sky from="#8ccaf7" to="#f2f9ff" />
      <rect y={H - 46} width={W} height="46" fill="#c0663c" />
      <rect x="150" y="64" width="130" height="72" fill="#f3d9b1" />
      <path d="M140 68 L215 30 L290 68 Z" fill="#9aa5b1" />
      <rect x="198" y="96" width="30" height="40" rx="3" fill="#7a4a2a" />
      <circle cx="60" cy={H - 58} r="26" fill="#3f8f3a" />
      {[40, 58, 76, 50, 68].map((x, i) => (
        <circle key={i} cx={x} cy={H - 70 + (i % 3) * 10} r="6" fill="#e0408f" />
      ))}
    </>
  ),
  garden: () => (
    <>
      <Sky from="#a5d8ff" to="#f4fbff" />
      <rect y={H - 40} width={W} height="40" fill="#8b5a2b" />
      <BananaPlant x={50} />
      <BananaPlant x={150} s={1.2} />
      <BananaPlant x={260} s={0.9} />
      <ellipse cx="200" cy={H - 26} rx="26" ry="8" fill="#555" />
      <path d="M190 132 C186 118 196 112 192 98" stroke="#bbb" strokeWidth="5" fill="none" opacity="0.7" strokeLinecap="round" />
    </>
  ),
  palace: () => (
    <>
      <Sky from="#86c4f2" to="#eef7ff" />
      <ellipse cx="160" cy={H} rx="220" ry="70" fill="#5c9a4a" />
      <rect x="90" y="60" width="140" height="76" fill="#b45a3c" />
      <rect x="140" y="88" width="40" height="48" rx="20" fill="#3a2a22" />
      <rect x="84" y="52" width="152" height="12" fill="#8e3f28" />
      <circle cx="270" cy={H - 44} r="12" fill="#ff8a1f" />
      <circle cx="270" cy={H - 50} r="7" fill="#ffc72c" />
    </>
  ),
  market: () => (
    <>
      <Sky from="#9bd1fb" to="#f7fbff" />
      <rect y={H - 50} width={W} height="50" fill="#d9a066" />
      {[20, 120, 220].map((x, i) => (
        <g key={x}>
          <rect x={x} y="74" width="84" height="56" fill="#8b5a2b" />
          <path d={`M${x - 6} 74 L${x + 90} 74 L${x + 80} 52 L${x + 4} 52 Z`} fill={['#c8102e', '#0b5cad', '#1e7b34'][i]} />
          <path d={`M${x - 6} 74 L${x + 90} 74`} stroke="#fff" strokeWidth="4" strokeDasharray="12 12" />
        </g>
      ))}
    </>
  ),
  savanna: () => (
    <>
      <Sky from="#ffcf73" to="#fff1cf" />
      <Sun x={250} y={50} />
      <rect y={H - 56} width={W} height="56" fill="#d9b44a" />
      <g transform={`translate(70 ${H - 56})`}>
        <rect x="-3" y="-44" width="6" height="44" fill="#6b4a2b" />
        <ellipse cx="0" cy="-48" rx="44" ry="10" fill="#4f7d32" />
      </g>
    </>
  ),
  river: () => (
    <>
      <Sky from="#8fd0ff" to="#eef8ff" />
      <rect y={H - 70} width={W} height="70" fill="#5fa04e" />
      <path d={`M0 ${H - 46} C80 ${H - 66} 160 ${H - 26} ${W} ${H - 50} L${W} ${H - 6} C200 ${H + 6} 100 ${H - 20} 0 ${H - 6} Z`} fill="#2f7fd0" />
      <rect x="250" y="20" width="22" height="100" fill="#fff" opacity="0.85" />
      <ellipse cx="261" cy="120" rx="30" ry="8" fill="#fff" opacity="0.7" />
    </>
  ),
  party: () => (
    <>
      <Sky from="#ffd9a8" to="#fff6e8" />
      <rect y={H - 44} width={W} height="44" fill="#5fa04e" />
      <path d="M0 26 Q80 56 160 26 T320 26" stroke="#1e1b18" strokeWidth="1.5" fill="none" />
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${12 + i * 26} ${30 + Math.sin(i) * 6} l8 16 l8 -16 Z`} fill={['#ffc72c', '#c8102e', '#0b5cad', '#1e7b34'][i % 4]} />
      ))}
    </>
  ),
  night: () => (
    <>
      <Sky from="#0d1b3d" to="#2b3f75" />
      {Array.from({ length: 26 }, (_, i) => (
        <circle key={i} cx={(i * 53) % W} cy={(i * 29) % 110 + 8} r={i % 3 ? 1.4 : 2.4} fill="#fff7cc" />
      ))}
      <circle cx="270" cy="36" r="14" fill="#fff3b0" />
      <rect y={H - 36} width={W} height="36" fill="#3c2a1e" />
      <ellipse cx="160" cy={H - 30} rx="60" ry="22" fill="#ff8a1f" opacity="0.25" />
    </>
  ),
}

export function Scene({ name, props }: { name: string; props: string[] }) {
  const draw = scenes[name] ?? scenes.sky
  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_10px_24px_-16px_rgba(43,29,20,0.4)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true">
        {draw()}
      </svg>
      <div className="absolute inset-x-0 bottom-3 flex items-end justify-center gap-2 text-5xl sm:text-6xl" aria-hidden="true">
        {props.map((p, i) => (
          <span key={i} className="drop-shadow-md">
            {p}
          </span>
        ))}
      </div>
    </div>
  )
}
