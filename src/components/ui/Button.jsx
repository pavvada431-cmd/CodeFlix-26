const VARIANT_CLASSES = {
  primary: 'border-[#22d3ee] bg-[#22d3ee] text-[#0b0f17] hover:opacity-90',
  secondary: 'border-[#1f2937] bg-[#111827] text-[#e5e7eb] hover:bg-[#0f172a]',
  ghost: 'border-transparent bg-transparent text-[#9ca3af] hover:bg-[#111827] hover:text-[#e5e7eb]',
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
