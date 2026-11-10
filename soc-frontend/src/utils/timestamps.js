const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true
})

export function formatSocTimestamp(value) {
  if (!value) return '—'

  let date
  if (value instanceof Date) {
    date = value
  } else {
    const raw = String(value).trim()
    const hasTimeZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(raw)
    const isoValue = raw.includes(' ') ? raw.replace(' ', 'T') : raw
    date = new Date(hasTimeZone ? isoValue : `${isoValue}Z`)
  }

  if (Number.isNaN(date.getTime())) return '—'

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value: part }) => [type, part])
  )
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute}:${parts.second} ${parts.dayPeriod.toUpperCase()} IST`
}

