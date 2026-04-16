export function formatNumber(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return value.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits === 0 ? 0 : 2,
  })
}
