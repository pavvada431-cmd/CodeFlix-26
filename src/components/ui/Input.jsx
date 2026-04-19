export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[#22d3ee] ${className}`.trim()}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-colors duration-200 focus:border-[#22d3ee] ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  )
}
