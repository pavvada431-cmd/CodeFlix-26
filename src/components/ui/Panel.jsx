import Card from './Card'

export default function Panel({ title, subtitle, action, className = '', children }) {
  return (
    <Card className={`p-4 ${className}`.trim()}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-[var(--color-text)]">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}
