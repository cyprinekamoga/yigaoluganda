import type { ReactNode } from 'react'

/** Marks Luganda text so screen readers and spell checkers treat it correctly. */
export function Lg({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span lang="lg" className={className}>
      {children}
    </span>
  )
}
