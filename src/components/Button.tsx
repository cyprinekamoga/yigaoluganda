import type { ButtonHTMLAttributes, Ref } from 'react'

type Variant = 'primary' | 'success' | 'sun' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary: 'bg-lake text-white [--edge:var(--color-lake-dark)]',
  success: 'bg-leaf text-white [--edge:var(--color-leaf-dark)]',
  sun: 'bg-sun text-ink [--edge:#c99400]',
  ghost: 'bg-cloud text-ink border-2 border-line [--edge:var(--color-line)]',
  danger: 'bg-crane text-white [--edge:#8e0b20]',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
}

/** Big, friendly pill button. At least 56px high for small fingers. */
export function Button({ variant = 'primary', block, className = '', ref, ...rest }: Props & { ref?: Ref<HTMLButtonElement> }) {
  return (
    <button
      ref={ref}
      type="button"
      className={`btn-3d min-h-14 rounded-full px-7 py-3 font-display text-xl font-bold tracking-wide
        disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${styles[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  )
}
