/**
 * Open-Meteo forecast API client (https://open-meteo.com, CC BY 4.0, no key,
 * free tier for non-commercial use). IMPORTANT: Open-Meteo "current" values
 * are weather-MODEL output at ~15-minute steps, not station observations.
 * Every value we show keeps: provider, grid coordinates, valid time,
 * retrieval time, units, and kind ('model' for now/past, 'forecast' for future).
 */

export interface ModelPoint {
  id: string
  name: { hi: string; en: string }
  requested: { lat: number; lng: number }
  /** Centre of the model grid cell Open-Meteo actually used. */
  grid: { lat: number; lng: number }
  /** Epoch ms the value is valid for (not when we fetched it). */
  validAt: number
  intervalSec: number
  temperature: number | null
  apparent: number | null
  humidity: number | null
  precipitation: number | null
  units: { temperature: string; apparent: string; humidity: string; precipitation: string }
}

export interface HourlySeries {
  time: number[]
  apparent: (number | null)[]
  precipProbability: (number | null)[]
}

export interface WeatherSnapshot {
  provider: 'Open-Meteo'
  license: 'CC BY 4.0'
  kind: 'model'
  retrievedAt: number
  points: ModelPoint[]
  /** Hourly series for the first (central) point: past 24 h model + next 24 h forecast. */
  centralHourly: HourlySeries
}

export const SAMPLE_POINTS: Array<Pick<ModelPoint, 'id' | 'name' | 'requested'>> = [
  { id: 'central', name: { hi: 'मध्य दिल्ली', en: 'Central Delhi' }, requested: { lat: 28.6139, lng: 77.209 } },
  { id: 'north', name: { hi: 'नरेला', en: 'Narela' }, requested: { lat: 28.8526, lng: 77.0932 } },
  { id: 'south', name: { hi: 'महरौली', en: 'Mehrauli' }, requested: { lat: 28.5245, lng: 77.1855 } },
  { id: 'east', name: { hi: 'मयूर विहार', en: 'Mayur Vihar' }, requested: { lat: 28.6077, lng: 77.2933 } },
  { id: 'west', name: { hi: 'द्वारका', en: 'Dwarka' }, requested: { lat: 28.5921, lng: 77.046 } },
  { id: 'northeast', name: { hi: 'शाहदरा', en: 'Shahdara' }, requested: { lat: 28.6731, lng: 77.2894 } },
]

export function buildWeatherUrl(): string {
  const p = new URLSearchParams({
    latitude: SAMPLE_POINTS.map((s) => s.requested.lat).join(','),
    longitude: SAMPLE_POINTS.map((s) => s.requested.lng).join(','),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,precipitation',
    hourly: 'apparent_temperature,precipitation_probability',
    past_hours: '24',
    forecast_hours: '24',
    timeformat: 'unixtime',
    timezone: 'Asia/Kolkata',
  })
  return `https://api.open-meteo.com/v1/forecast?${p}`
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback)

/** Defensive parser: throws on a shape we don't understand instead of showing wrong numbers. */
export function parseWeather(json: unknown, retrievedAt: number): WeatherSnapshot {
  const arr = Array.isArray(json) ? json : [json]
  if (arr.length !== SAMPLE_POINTS.length) throw new Error('unexpected_location_count')

  const points: ModelPoint[] = arr.map((loc, i) => {
    const l = loc as Record<string, Record<string, unknown> | unknown>
    const cur = l.current as Record<string, unknown> | undefined
    const units = (l.current_units ?? {}) as Record<string, unknown>
    const time = num(cur?.time)
    if (!cur || time === null) throw new Error('missing_current')
    return {
      ...SAMPLE_POINTS[i],
      grid: { lat: num(l.latitude) ?? SAMPLE_POINTS[i].requested.lat, lng: num(l.longitude) ?? SAMPLE_POINTS[i].requested.lng },
      validAt: time * 1000,
      intervalSec: num(cur.interval) ?? 900,
      temperature: num(cur.temperature_2m),
      apparent: num(cur.apparent_temperature),
      humidity: num(cur.relative_humidity_2m),
      precipitation: num(cur.precipitation),
      units: {
        temperature: str(units.temperature_2m, '°C'),
        apparent: str(units.apparent_temperature, '°C'),
        humidity: str(units.relative_humidity_2m, '%'),
        precipitation: str(units.precipitation, 'mm'),
      },
    }
  })

  const hourly = (arr[0] as Record<string, unknown>).hourly as Record<string, unknown[]> | undefined
  if (!hourly || !Array.isArray(hourly.time)) throw new Error('missing_hourly')
  const centralHourly: HourlySeries = {
    time: hourly.time.map((t) => (num(t) ?? 0) * 1000),
    apparent: (hourly.apparent_temperature ?? []).map(num),
    precipProbability: (hourly.precipitation_probability ?? []).map(num),
  }

  return { provider: 'Open-Meteo', license: 'CC BY 4.0', kind: 'model', retrievedAt, points, centralHourly }
}

export async function fetchWeather(signal?: AbortSignal, now: () => number = Date.now): Promise<WeatherSnapshot> {
  const res = await fetch(buildWeatherUrl(), { signal })
  if (!res.ok) throw new Error(`http_${res.status}`)
  return parseWeather(await res.json(), now())
}

/** Split a series at "now": earlier points are model history, later points are forecast. */
export function splitAtNow(series: HourlySeries, now: number) {
  let idx = series.time.findIndex((t) => t > now)
  if (idx === -1) idx = series.time.length
  return { pastEnd: idx }
}
