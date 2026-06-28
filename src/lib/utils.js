export function formatCurrency(amount) {
  const num = Number(amount) || 0
  const rounded = Math.round(num)
  return `${rounded.toLocaleString('tr-TR')} TL`
}

export function formatCurrencyDecimal(amount) {
  const num = Number(amount) || 0
  return `${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`
}
