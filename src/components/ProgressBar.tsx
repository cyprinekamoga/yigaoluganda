export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-5 flex-1 overflow-hidden rounded-full bg-line">
      <div className="h-full rounded-full bg-leaf transition-[width] duration-500" style={{ width: `${pct}%` }}>
        <div className="mx-2 mt-1 h-1.5 rounded-full bg-white/35" />
      </div>
    </div>
  )
}
