import { useEffect, useMemo, useState } from 'react'
import type { Report } from '../../shared/reports.ts'
import { useLang } from '../i18n/LangContext.tsx'
import { CATEGORY_LABELS } from '../i18n/strings.ts'
import type { Loadable } from '../lib/hooks.ts'
import { KIND_COLOR, LAYERS, layerOf, type LayerId } from '../lib/layers.ts'
import { clockTime, relativeTime } from '../lib/time.ts'
import type { WeatherSnapshot } from '../lib/weather.ts'
import { HeatDetail, ReportDetail } from './DetailPanel.tsx'
import { Glyph } from './Glyph.tsx'
import type { Selection } from '../lib/mapConfig.ts'
import { scrollToId } from '../lib/scroll.ts'
import { reportIdFromHash } from '../lib/share.ts'
import { MapCanvas } from './MapCanvas.tsx'
import { ReportForm } from './ReportForm.tsx'
import { CommunityBadge, FreshnessBadge } from './StatusBadges.tsx'

interface Props {
  weather: Loadable<WeatherSnapshot>
  reports: Loadable<{ reports: Report[] }>
  now: number
  formOpen: boolean
  setFormOpen: (open: boolean) => void
  onReportChanged: (r: Report) => void
}

export function MapSection({ weather, reports, now, formOpen, setFormOpen, onReportChanged }: Props) {
  const { lang, t } = useLang()
  const [active, setActive] = useState<Set<LayerId>>(() => new Set(LAYERS.filter((l) => l.available).map((l) => l.id)))
  // A shared link (#r=<id>) opens that report.
  const [sharedId] = useState(() => reportIdFromHash(window.location.hash))
  const [selection, setSelection] = useState<Selection>(sharedId ? { kind: 'report', id: sharedId } : null)
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const flash = (text: string) => {
    setToast(text)
    window.setTimeout(() => setToast(null), 5000)
  }

  const allReports = useMemo(() => (reports.state === 'ready' ? reports.data.reports : []), [reports])

  useEffect(() => {
    if (sharedId) scrollToId('map')
  }, [sharedId])
  // If the shared report has left the map, say so (until the person selects something else).
  const sharedGone =
    reports.state === 'ready' &&
    selection?.kind === 'report' &&
    selection.id === sharedId &&
    !allReports.some((r) => r.id === sharedId)

  // Detect reports that appeared since the last refresh (not on first load) so they can pulse once.
  // Uses React's "adjust state during render" pattern instead of an effect.
  const idsKey = reports.state === 'ready' ? allReports.map((r) => r.id).join(',') : null
  const [lastIdsKey, setLastIdsKey] = useState<string | null>(null)
  const [newIds, setNewIds] = useState<ReadonlySet<string>>(new Set())
  if (idsKey !== null && idsKey !== lastIdsKey) {
    if (lastIdsKey !== null) {
      const before = new Set(lastIdsKey.split(','))
      setNewIds(new Set(allReports.filter((r) => !before.has(r.id)).map((r) => r.id)))
    }
    setLastIdsKey(idsKey)
  }
  const visibleReports = useMemo(() => allReports.filter((r) => active.has(layerOf(r.category))), [allReports, active])
  const heatPoints = weather.state === 'ready' && active.has('heat') ? weather.data.points : []

  const layerName = (id: LayerId) =>
    id === 'heat'
      ? t.layerHeat
      : id === 'groundwater'
        ? t.layerGroundwater
        : id === 'tanker'
          ? lang === 'hi'
            ? 'टैंकर'
            : 'Tankers'
          : CATEGORY_LABELS[lang][id].name

  const toggle = (id: LayerId) =>
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const selectedReport = selection?.kind === 'report' ? allReports.find((r) => r.id === selection.id) : undefined
  const selectedHeat =
    selection?.kind === 'heat' && weather.state === 'ready' ? weather.data.points.find((p) => p.id === selection.id) : undefined

  let panel = null
  if (formOpen) {
    panel = (
      <ReportForm
        picked={picked}
        onPick={setPicked}
        mapAvailable
        onCancel={() => {
          setFormOpen(false)
          setPicked(null)
        }}
        onCreated={(r) => {
          onReportChanged(r)
          setFormOpen(false)
          setPicked(null)
          setSelection({ kind: 'report', id: r.id })
          flash(t.submitted)
        }}
      />
    )
  } else if (selectedReport) {
    panel = (
      <ReportDetail key={selectedReport.id} report={selectedReport} now={now} onClose={() => setSelection(null)} onUpdated={onReportChanged} />
    )
  } else if (selectedHeat && weather.state === 'ready') {
    panel = (
      <HeatDetail point={selectedHeat} retrievedAt={weather.data.retrievedAt} now={now} onClose={() => setSelection(null)} />
    )
  }

  return (
    <section id="map" className="map-section" aria-labelledby="map-title" tabIndex={-1}>
      <div className="map-section__bar">
        <h2 id="map-title" className="map-section__title">
          {t.mapTitle}
        </h2>
        <div className="filters" role="group" aria-label={t.filtersLabel}>
          {LAYERS.map((l) => {
            const on = l.available && active.has(l.id)
            const glyphKind = l.id === 'tanker' ? 'tanker_available' : l.id
            return (
              <button
                key={l.id}
                type="button"
                className={`filter${on ? ' is-on' : ''}`}
                aria-pressed={l.available ? on : undefined}
                disabled={!l.available}
                title={l.available ? undefined : t.layerUnavailableHint}
                onClick={() => toggle(l.id)}
                style={{ ['--kind' as string]: KIND_COLOR[glyphKind] }}
              >
                <Glyph kind={glyphKind} size={16} />
                <span>{layerName(l.id)}</span>
                {!l.available && <span className="filter__na">{t.railUnavailable}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className={`map-stage${panel ? ' has-panel' : ''}`}>
        <div className="map-stage__map">
          <MapCanvas
            reports={visibleReports}
            heatPoints={heatPoints}
            now={now}
            selection={selection}
            newIds={newIds}
            onSelect={(s) => {
              setFormOpen(false)
              setSelection(s)
            }}
            picking={formOpen}
            picked={picked}
            onPick={setPicked}
          />
          {(toast || sharedGone) && (
            <p className="toast" role="status">
              {toast ?? t.sharedMissing}
            </p>
          )}
        </div>
        {panel && <div className="map-stage__panel">{panel}</div>}
      </div>

      <ReportList
        reports={reports}
        visible={visibleReports}
        weather={weather}
        showHeat={active.has('heat')}
        now={now}
        onSelect={(s) => {
          setFormOpen(false)
          setSelection(s)
          scrollToId('map')
        }}
      />
    </section>
  )
}

function ReportList({ reports, visible, weather, showHeat, now, onSelect }: {
  reports: Loadable<{ reports: Report[] }>
  visible: Report[]
  weather: Loadable<WeatherSnapshot>
  showHeat: boolean
  now: number
  onSelect: (s: Selection) => void
}) {
  const { lang, t } = useLang()
  return (
    <div className="list">
      <h3 className="list__title">{t.listTitle}</h3>
      {reports.state === 'loading' && (
        <p className="list__state" aria-live="polite">
          <span className="spinner" aria-hidden="true" /> {t.reportsLoading}
        </p>
      )}
      {reports.state === 'error' && (
        <p className="list__state list__state--error" role="alert">
          {t.reportsError}
        </p>
      )}
      {reports.state === 'unconfigured' && <p className="list__state">{t.reportsNotConfigured}</p>}
      {reports.state === 'ready' && visible.length === 0 && <p className="list__state">{t.noReportsHere}</p>}

      <ul className="list__items">
        {visible.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="list-item"
              onClick={() => onSelect({ kind: 'report', id: r.id })}
              style={{ ['--kind' as string]: KIND_COLOR[r.category] }}
            >
              <span className="list-item__glyph">
                <Glyph kind={r.category} size={18} />
              </span>
              <span className="list-item__main">
                <span className="list-item__name">
                  {CATEGORY_LABELS[lang][r.category].name}, {r.locality}
                </span>
                <span className="list-item__meta">
                  {t.detailLastConfirmed}{' '}
                  <time dateTime={r.lastConfirmedAt} title={clockTime(r.lastConfirmedAt, lang)}>
                    {relativeTime(r.lastConfirmedAt, now, lang)}
                  </time>
                </span>
              </span>
              <span className="list-item__badges">
                <FreshnessBadge report={r} now={now} />
                <CommunityBadge report={r} />
              </span>
            </button>
          </li>
        ))}
        {showHeat &&
          weather.state === 'ready' &&
          weather.data.points.map((p) => (
            <li key={`heat-${p.id}`}>
              <button
                type="button"
                className="list-item"
                onClick={() => onSelect({ kind: 'heat', id: p.id })}
                style={{ ['--kind' as string]: KIND_COLOR.heat }}
              >
                <span className="list-item__glyph">
                  <Glyph kind="heat" size={18} />
                </span>
                <span className="list-item__main">
                  <span className="list-item__name">
                    {p.name[lang]}: {p.apparent === null ? '—' : `${Math.round(p.apparent)}°C`} {t.feelsLike.toLowerCase()}
                  </span>
                  <span className="list-item__meta">
                    {t.sourceModel}, {relativeTime(p.validAt, now, lang)}
                  </span>
                </span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  )
}
