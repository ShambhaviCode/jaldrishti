import { useCallback, useEffect, useRef, useState } from 'react'
import type { Report } from '../../shared/reports.ts'
import { ApiError, API_BASE, listReports } from './api.ts'
import { fetchWeather, type WeatherSnapshot } from './weather.ts'

export type Loadable<T> =
  | { state: 'loading' }
  | { state: 'ready'; data: T }
  | { state: 'error'; code: string }
  | { state: 'unconfigured' }

/** Ticks so "5 minutes ago" labels stay correct while the page is open. */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

const WEATHER_REFRESH_MS = 15 * 60_000 // model updates every 15 min; polling faster adds nothing
const REPORTS_REFRESH_MS = 60_000

export function useWeather() {
  const [value, setValue] = useState<Loadable<WeatherSnapshot>>({ state: 'loading' })
  const [nonce, setNonce] = useState(0)
  const retry = useCallback(() => {
    setValue({ state: 'loading' })
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    const load = () =>
      fetchWeather(ctrl.signal)
        .then((data) => setValue({ state: 'ready', data }))
        .catch((e: unknown) => {
          if (ctrl.signal.aborted) return
          // Keep showing the last good snapshot (its retrieval time stays visible) rather than blanking.
          setValue((prev) => (prev.state === 'ready' ? prev : { state: 'error', code: e instanceof Error ? e.message : 'error' }))
        })
    load()
    const id = window.setInterval(load, WEATHER_REFRESH_MS)
    return () => {
      ctrl.abort()
      window.clearInterval(id)
    }
  }, [nonce])

  return { weather: value, retry }
}

export function useReports() {
  const [value, setValue] = useState<Loadable<{ reports: Report[]; serverTime: string; retrievedAt: number }>>(
    API_BASE ? { state: 'loading' } : { state: 'unconfigured' },
  )
  const ctrlRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    if (!API_BASE) return
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    listReports(ctrl.signal)
      .then((d) => setValue({ state: 'ready', data: { reports: d.reports, serverTime: d.serverTime, retrievedAt: Date.now() } }))
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return
        setValue((prev) => (prev.state === 'ready' ? prev : { state: 'error', code: e instanceof ApiError ? e.code : 'generic' }))
      })
  }, [])

  useEffect(() => {
    refresh()
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh()
    }, REPORTS_REFRESH_MS)
    return () => {
      window.clearInterval(id)
      ctrlRef.current?.abort()
    }
  }, [refresh])

  /** Merge a report returned by POST so it appears immediately, without waiting for the next poll. */
  const upsert = useCallback((r: Report) => {
    setValue((prev) => {
      if (prev.state !== 'ready') return { state: 'ready', data: { reports: [r], serverTime: r.submittedAt, retrievedAt: Date.now() } }
      const others = prev.data.reports.filter((x) => x.id !== r.id)
      return { state: 'ready', data: { ...prev.data, reports: [r, ...others] } }
    })
  }, [])

  return { reports: value, refresh, upsert }
}
