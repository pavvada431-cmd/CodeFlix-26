export default function Card({ className = '', children, ...props }) {
  return (
    <section
      className={`rounded-xl border border-[#1f2937] bg-[#111827] shadow-lg shadow-black/20 ${className}`.trim()}
      {...props}
    >
      {children}
    </section>
  )
}
