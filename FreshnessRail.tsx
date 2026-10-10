import type { Report } from '../../shared/reports.ts'
import { useLang } from '../i18n/LangContext.tsx'
import type { Loadable } from '../lib/hooks.ts'
import { clockTime, relativeTime } from '../lib/time.ts'
import type { WeatherSnapshot } from '../lib/weather.ts'

const SPAN_MS = 24 * 3_600_000

interface Row {
  key: string
  label: string
  /** epoch ms of the newest data, null when unavailable/none, 'loading' while checking */
  at: number | null | 'loading'
  unavailable?: boolean
}

/**
 * The age-of-information ledger: one row per source, a dot placed by how old
 * its newest data is (now on the left, 24 h on the right). Unavailable sources
 * get a dashed, empty track instead of being silently omitted.
 */
export function FreshnessRail({
  weather,
  reports,
  now,
}: {
  weather: Loadable<WeatherSnapshot>
  reports: Loadable<{ reports: Report[] }>
  now: number
}) {
  const { lang, t } = useLang()

  const newestReport =
    reports.state === 'ready' && reports.data.reports.length > 0
      ? Math.max(...reports.data.reports.map((r) => Date.parse(r.lastConfirmedAt)))
      : null

  const rows: Row[] = [
    {
      key: 'model',
      label: t.srcModel,
      at: weather.state === 'ready' ? weather.data.points[0].validAt : weather.state === 'loading' ? 'loading' : null,
      unavailable: weather.state === 'error',
    },
    {
      key: 'community',
      label: reports.state === 'ready' && newestReport === null ? t.srcCommunityNone : t.srcCommunity,
      at: reports.state === 'loading' ? 'loading' : newestReport,
      unavailable: reports.state === 'error' || reports.state === 'unconfigured',
    },
    { key: 'imd', label: t.srcImd, at: null, unavailable: true },
    { key: 'gw', label: t.srcGroundwater, at: null, unavailable: true },
  ]

  return (
    <section className="rail" aria-labelledby="rail-title">
      <h2 id="rail-title" className="rail__title">
        {t.railTitle}
      </h2>
      <div className="rail__scale" aria-hidden="true">
        <span className="rail__scale-track">
          <span>{t.railNow}</span>
          <span>{t.rail24h}</span>
        </span>
      </div>
      <ul className="rail__rows">
        {rows.map((row) => {
          const ready = typeof row.at === 'number'
          const age = ready ? Math.max(0, now - (row.at as number)) : 0
          const pos = ready ? Math.min(age / SPAN_MS, 1) : 0
          const older = ready && age > SPAN_MS
          return (
            <li key={row.key} className={`rail__row${row.unavailable ? ' is-unavailable' : ''}`}>
              <span className="rail__label">{row.label}</span>
              <span className="rail__track" aria-hidden="true">
                {ready && <span className="rail__dot" style={{ left: `${pos * 100}%` }} />}
              </span>
              <span className="rail__value">
                {row.at === 'loading' ? (
                  <span className="muted">{t.railLoading}</span>
                ) : ready ? (
                  <time dateTime={new Date(row.at as number).toISOString()} title={clockTime(row.at as number, lang)}>
                    {older ? t.railOlder : relativeTime(row.at as number, now, lang)}
                  </time>
                ) : row.unavailable ? (
                  <span className="muted">{t.railUnavailable}</span>
                ) : (
                  <span className="muted">—</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
