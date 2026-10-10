import { useLang } from '../i18n/LangContext.tsx'
import type { Loadable } from '../lib/hooks.ts'
import { clockTime, relativeTime } from '../lib/time.ts'
import { splitAtNow, type WeatherSnapshot } from '../lib/weather.ts'
import { ListenButton } from './ListenButton.tsx'
import { Sparkline } from './Sparkline.tsx'

const fmt = (v: number | null, unit: string, digits = 0) => (v === null ? '—' : `${v.toFixed(digits)}${unit}`)

export function WeatherPanel({ weather, now, onRetry }: { weather: Loadable<WeatherSnapshot>; now: number; onRetry: () => void }) {
  const { lang, t } = useLang()

  if (weather.state === 'loading') {
    return (
      <section className="weather weather--loading" aria-busy="true" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        {t.weatherLoading}
      </section>
    )
  }
  if (weather.state !== 'ready') {
    return (
      <section className="weather weather--error" role="alert">
        <p>{t.weatherError}</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          {t.retry}
        </button>
      </section>
    )
  }

  const w = weather.data
  const c = w.points[0]
  const { pastEnd } = splitAtNow(w.centralHourly, now)
  const futureRain = w.centralHourly.precipProbability.slice(pastEnd).filter((v): v is number => v !== null)
  const maxRain = futureRain.length ? Math.max(...futureRain) : null

  return (
    <section className="weather" aria-labelledby="weather-title">
      <header className="weather__head">
        <h2 id="weather-title" className="weather__title">
          {t.weatherTitle}
        </h2>
        <p className="weather__kind">{t.weatherKind}</p>
      </header>

      <div className="weather__main">
        <p className="weather__temp">
          <span className="weather__temp-value">{c.temperature === null ? '—' : Math.round(c.temperature)}</span>
          <span className="weather__temp-unit">{c.units.temperature}</span>
        </p>
        <dl className="weather__facts">
          <div>
            <dt>{t.feelsLike}</dt>
            <dd>{fmt(c.apparent, c.units.apparent)}</dd>
          </div>
          <div>
            <dt>{t.humidity}</dt>
            <dd>{fmt(c.humidity, c.units.humidity)}</dd>
          </div>
          <div>
            <dt>{t.rain15}</dt>
            <dd>{fmt(c.precipitation, ` ${c.units.precipitation}`, 1)}</dd>
          </div>
        </dl>
      </div>
      {c.apparent !== null && <ListenButton target={{ kind: 'heat', point: c.id, feelsLike: c.apparent }} />}

      <Sparkline series={w.centralHourly} now={now} />
      {maxRain !== null && (
        <p className="weather__rain">
          {t.rainChance}: <strong>{maxRain}%</strong>
        </p>
      )}

      <dl className="provenance">
        <div>
          <dt>{t.validAt}</dt>
          <dd>
            <time dateTime={new Date(c.validAt).toISOString()}>{clockTime(c.validAt, lang)}</time>{' '}
            <span className="muted">({relativeTime(c.validAt, now, lang)})</span>
          </dd>
        </div>
        <div>
          <dt>{t.fetchedAt}</dt>
          <dd>
            <time dateTime={new Date(w.retrievedAt).toISOString()}>{clockTime(w.retrievedAt, lang)}</time>{' '}
            <span className="muted">({relativeTime(w.retrievedAt, now, lang)})</span>
          </dd>
        </div>
      </dl>
      <p className="attribution">
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer noopener">
          {t.attributionWeather}
        </a>
      </p>
    </section>
  )
}
