export default function Card({ className = '', children, ...props }) {
  return (
    <section
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg shadow-black/20 ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  )
}
