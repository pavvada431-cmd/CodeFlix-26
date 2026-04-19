const VARIANT_CLASSES = {
  primary: 'border-[#22d3ee] bg-[#22d3ee] text-[#0b0f17] hover:opacity-90',
  secondary: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-bg)]',
  ghost: 'border-transparent bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]',
}

export default function Button({
  variant = 'secondary',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const variantClasses = VARIANT_CLASSES[variant] || VARIANT_CLASSES.secondary

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
