export function SimulationError({ title, message, suggestion }) {
  return (
    <div
      className="flex h-full flex-col items-center justify-center rounded-[24px] border p-8 text-center"
      style={{
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
      }}
    >
      <h3
        className="mb-2 font-heading text-xl font-semibold"
        style={{ color: '#ef4444' }}
      >
        {title}
      </h3>
      <p className="mb-6 max-w-md text-sm" style={{ color: 'var(--color-text-muted)' }}>
        {message}
      </p>
      {suggestion && (
        <p className="text-xs" style={{ color: 'var(--color-text-dim)' }}>
          💡 {suggestion}
        </p>
      )}
    </div>
  )
}
