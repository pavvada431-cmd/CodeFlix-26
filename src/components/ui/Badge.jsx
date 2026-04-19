const VARIANT_CLASSES = {
  neutral: 'border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-muted)]',
  success: 'border-[#14532d] bg-[#052e16] text-[#22c55e]',
  error: 'border-[#7f1d1d] bg-[#450a0a] text-[#ef4444]',
  accent: 'border-[#155e75] bg-[#083344] text-[#22d3ee]',
}

export default function Badge({ variant = 'neutral', className = '', children }) {
  const variantClass = VARIANT_CLASSES[variant] || VARIANT_CLASSES.neutral

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${variantClass} ${className}`.trim()}>
      {children}
    </span>
  )
}
