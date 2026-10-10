import { describe, expect, it } from 'vitest'
import { buildWeatherUrl, parseWeather, SAMPLE_POINTS, splitAtNow } from './weather.ts'

// Shape mirrors Open-Meteo's documented multi-location JSON (an array, one object per location).
function loc(i: number) {
  return {
    latitude: 28.625 + i * 0.01,
    longitude: 77.25,
    current_units: { time: 'unixtime', interval: 'seconds', temperature_2m: '°C', apparent_temperature: '°C', relative_humidity_2m: '%', precipitation: 'mm' },
    current: { time: 1_791_574_200, interval: 900, temperature_2m: 31.4 + i, apparent_temperature: 35.2 + i, relative_humidity_2m: 62, precipitation: 0 },
    hourly: {
      time: [1_791_568_800, 1_791_572_400, 1_791_576_000],
      apparent_temperature: [34, null, 36],
      precipitation_probability: [10, 20, 30],
    },
  }
}

describe('parseWeather', () => {
  it('keeps provenance: grid coordinates, valid time, retrieval time, units, kind', () => {
    const snap = parseWeather(SAMPLE_POINTS.map((_, i) => loc(i)), 1_791_574_999_000)
    expect(snap.provider).toBe('Open-Meteo')
    expect(snap.kind).toBe('model')
    expect(snap.retrievedAt).toBe(1_791_574_999_000)
    const c = snap.points[0]
    expect(c.validAt).toBe(1_791_574_200_000) // seconds -> ms
    expect(c.grid).toEqual({ lat: 28.625, lng: 77.25 })
    expect(c.requested).toEqual(SAMPLE_POINTS[0].requested)
    expect(c.units.apparent).toBe('°C')
    expect(snap.points[2].temperature).toBeCloseTo(33.4)
    expect(snap.centralHourly.apparent).toEqual([34, null, 36])
  })

  it('throws on an unexpected shape rather than showing wrong numbers', () => {
    expect(() => parseWeather({}, 0)).toThrow()
    expect(() => parseWeather([loc(0)], 0)).toThrow('unexpected_location_count')
    const broken = SAMPLE_POINTS.map((_, i) => ({ ...loc(i), current: undefined }))
    expect(() => parseWeather(broken, 0)).toThrow('missing_current')
  })

  it('treats non-numeric values as missing, not zero', () => {
    const data = SAMPLE_POINTS.map((_, i) => loc(i))
    ;(data[0].current as Record<string, unknown>).temperature_2m = null
    expect(parseWeather(data, 0).points[0].temperature).toBeNull()
  })
})

describe('buildWeatherUrl', () => {
  it('requests every sample point, IST timezone and unix time', () => {
    const u = new URL(buildWeatherUrl())
    expect(u.hostname).toBe('api.open-meteo.com')
    expect(u.searchParams.get('latitude')!.split(',')).toHaveLength(SAMPLE_POINTS.length)
    expect(u.searchParams.get('timezone')).toBe('Asia/Kolkata')
    expect(u.searchParams.get('timeformat')).toBe('unixtime')
  })
})

describe('splitAtNow', () => {
  it('splits model history from forecast at the current time', () => {
    const s = { time: [1000, 2000, 3000], apparent: [], precipProbability: [] }
    expect(splitAtNow(s, 2500).pastEnd).toBe(2)
    expect(splitAtNow(s, 5000).pastEnd).toBe(3)
    expect(splitAtNow(s, 0).pastEnd).toBe(0)
  })
})
