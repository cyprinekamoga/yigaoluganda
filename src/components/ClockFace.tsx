/** A simple clock face showing a whole hour (like the clocks on page 23 of the book). */
export function ClockFace({ hour, size = 96 }: { hour: number; size?: number }) {
  const angle = ((hour % 12) / 12) * 360
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="45" fill="#fff" stroke="#2f5d34" strokeWidth="6" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) / 12) * 2 * Math.PI
        return (
          <text key={i} x={50 + Math.sin(a) * 33} y={50 - Math.cos(a) * 33 + 4} fontSize="11" textAnchor="middle" fill="#2f5d34" fontFamily="Nunito, sans-serif" fontWeight="700">
            {i + 1}
          </text>
        )
      })}
      <line x1="50" y1="50" x2="50" y2="20" stroke="#c9893b" strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2="31" stroke="#8a4b1f" strokeWidth="5" strokeLinecap="round" transform={`rotate(${angle} 50 50)`} />
      <circle cx="50" cy="50" r="4" fill="#2f5d34" />
    </svg>
  )
}
