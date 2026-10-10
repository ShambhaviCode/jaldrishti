import { useId } from 'react'
import { useLang } from '../i18n/LangContext.tsx'
import { hourLabel } from '../lib/time.ts'
import { splitAtNow, type HourlySeries } from '../lib/weather.ts'

const W = 320
const H = 96
const PAD = { l: 4, r: 4, t: 14, b: 18 }

/** Feels-like temperature: solid line for model history, dashed for forecast, a rule at "now". */
export function Sparkline({ series, now }: { series: HourlySeries; now: number }) {
  const { lang, t } = useLang()
  const titleId = useId()
  const pts = series.time
    .map((time, i) => ({ time, v: series.apparent[i] }))
    .filter((p): p is { time: number; v: number } => p.v !== null)
  if (pts.length < 2) return null

  const t0 = pts[0].time
  const t1 = pts[pts.length - 1].time
  const vals = pts.map((p) => p.v)
  const lo = Math.floor(Math.min(...vals) - 1)
  const hi = Math.ceil(Math.max(...vals) + 1)
  const x = (time: number) => PAD.l + ((time - t0) / (t1 - t0)) * (W - PAD.l - PAD.r)
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)

  const { pastEnd } = splitAtNow({ ...series, time: pts.map((p) => p.time) }, now)
  const past = pts.slice(0, Math.max(pastEnd, 1))
  const future = pts.slice(Math.max(pastEnd - 1, 0))
  const line = (arr: typeof pts) => arr.map((p, i) => `${i ? 'L' : 'M'}${x(p.time).toFixed(1)},${y(p.v).toFixed(1)}`).join('')

  const futurePts = pts.slice(pastEnd)
  const peak = futurePts.length ? futurePts.reduce((a, b) => (b.v > a.v ? b : a)) : null
  const nowX = x(Math.min(Math.max(now, t0), t1))

  return (
    <figure className="spark">
      <figcaption id={titleId} className="spark__title">
        {t.chartTitle}
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="spark__svg" role="img" aria-labelledby={titleId}>
        <path d={line(past)} className="spark__past" />
        {future.length > 1 && <path d={line(future)} className="spark__future" />}
        <line x1={nowX} x2={nowX} y1={PAD.t - 6} y2={H - PAD.b + 2} className="spark__now" />
        <text x={nowX} y={PAD.t - 8} className="spark__now-label" textAnchor="middle">
          {t.railNow}
        </text>
        {peak && (
          <>
            <circle cx={x(peak.time)} cy={y(peak.v)} r={3} className="spark__peak" />
            <text
              x={Math.min(x(peak.time), W - 40)}
              y={y(peak.v) - 6}
              className="spark__peak-label"
              textAnchor="middle"
            >
              {Math.round(peak.v)}°
            </text>
          </>
        )}
        <text x={PAD.l} y={H - 4} className="spark__axis">
          {hourLabel(t0, lang)}
        </text>
        <text x={W - PAD.r} y={H - 4} className="spark__axis" textAnchor="end">
          {hourLabel(t1, lang)}
        </text>
      </svg>
      <div className="spark__legend">
        <span className="spark__key spark__key--past">{t.chartPast}</span>
        <span className="spark__key spark__key--future">{t.chartFuture}</span>
      </div>
      {peak && (
        <p className="spark__summary">
          {t.chartMax}: <strong>{Math.round(peak.v)}°C</strong> ({hourLabel(peak.time, lang)})
        </p>
      )}
    </figure>
  )
}
