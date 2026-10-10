import type { Lang } from '../i18n/strings.ts'

const LOCALE: Record<Lang, string> = { hi: 'hi-IN', en: 'en-IN' }
const TZ = 'Asia/Kolkata'

/** "12 मिनट पहले" / "12 minutes ago". Future times (clock skew) clamp to "now". */
export function relativeTime(iso: string | number, now: number, lang: Lang): string {
  const t = typeof iso === 'number' ? iso : Date.parse(iso)
  const diffSec = Math.round((t - now) / 1000)
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto' })
  const abs = Math.abs(diffSec)
  if (diffSec > 0 || abs < 45) return rtf.format(0, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86_400), 'day')
}

/** Absolute IST clock time, e.g. "10 अक्टू॰, 12:45 am". Always shown next to relative time. */
export function clockTime(iso: string | number, lang: Lang): string {
  const t = typeof iso === 'number' ? iso : Date.parse(iso)
  return new Intl.DateTimeFormat(LOCALE[lang], {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(t)
}

export function hourLabel(epochMs: number, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TZ, hour: 'numeric' }).format(epochMs)
}
