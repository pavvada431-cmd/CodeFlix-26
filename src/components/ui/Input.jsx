export function Textarea({ className = '', ...props }) {
  return (
    <textarea
      className={`w-full rounded-xl border border-[#1f2937] bg-[#0b0f17] px-3 py-2 text-sm text-[#e5e7eb] outline-none transition-colors duration-200 placeholder:text-[#6b7280] focus:border-[#22d3ee] ${className}`.trim()}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-xl border border-[#1f2937] bg-[#0b0f17] px-3 py-2 text-sm text-[#e5e7eb] outline-none transition-colors duration-200 focus:border-[#22d3ee] ${className}`.trim()}
      {...props}
    >
      {children}
    </select>
  )
}
