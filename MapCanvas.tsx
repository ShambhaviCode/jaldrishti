import { divIcon, map as createMap, marker as createMarker, tileLayer, type Map as LeafletMap } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { communityStatusOf, freshnessOf, type Report } from '../../shared/reports.ts'
import { useLang } from '../i18n/LangContext.tsx'
import { CATEGORY_LABELS } from '../i18n/strings.ts'
import { KIND_COLOR } from '../lib/layers.ts'
import type { ModelPoint } from '../lib/weather.ts'
import { DELHI_CENTER, TILE_ATTRIBUTION, TILE_URL, type Selection } from '../lib/mapConfig.ts'
import { Glyph } from './Glyph.tsx'

interface Props {
  reports: Report[]
  heatPoints: ModelPoint[]
  now: number
  selection: Selection
  onSelect: (s: Selection) => void
  /** Report ids that arrived since the previous refresh; they pulse once. */
  newIds: ReadonlySet<string>
  picking: boolean
  picked: { lat: number; lng: number } | null
  onPick: (p: { lat: number; lng: number }) => void
}

const MapContext = createContext<LeafletMap | null>(null)

export function MapCanvas({ reports, heatPoints, now, selection, onSelect, newIds, picking, picked, onPick }: Props) {
  const { lang, t } = useLang()
  // While reporting, a tap anywhere (even on a pin) picks the spot instead of opening that item and losing the form.
  const select = (s: Selection) => (picking ? undefined : () => onSelect(s))
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [tiles, setTiles] = useState<'loading' | 'loaded' | 'failed'>('loading')
  // Leaflet keeps the click handler from the first render; the ref gives it the current props.
  const pick = useRef({ picking, onPick })
  useEffect(() => {
    pick.current = { picking, onPick }
  })

  useEffect(() => {
    const m = createMap(container.current!, { center: DELHI_CENTER, zoom: 11, minZoom: 9, scrollWheelZoom: false })
    let loaded = 0
    let failed = 0
    tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION })
      .on('tileload', () => {
        loaded++
        setTiles('loaded')
      })
      .on('tileerror', () => {
        failed++
        if (loaded === 0 && failed >= 4) setTiles('failed')
      })
      .addTo(m)
    m.on('click', (e) => {
      if (!pick.current.picking) return
      const { lat, lng } = e.latlng.wrap()
      pick.current.onPick({ lat, lng })
    })
    // The detail panel narrows the map; Leaflet only watches window resizes on its own.
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => m.invalidateSize())
    resize?.observe(container.current!)
    setMap(m)
    return () => {
      resize?.disconnect()
      m.remove()
      setMap(null)
    }
  }, [])

  return (
    <div className={`map-canvas${picking ? ' is-picking' : ''}`}>
      {tiles !== 'loaded' && (
        <div className="map-state map-state--overlay" role={tiles === 'failed' ? 'alert' : undefined} aria-live="polite">
          {tiles === 'failed' ? (
            t.mapError
          ) : (
            <>
              <span className="spinner" aria-hidden="true" /> {t.mapLoading}
            </>
          )}
        </div>
      )}
      {picking && (
        <p className={`map-hint${picked ? ' is-done' : ''}`} role="status">
          {picked ? t.mapPicked : t.mapPickHint}
        </p>
      )}
      <div ref={container} className="map-canvas__map" />
      <MapContext.Provider value={map}>
        {heatPoints.map((p) => (
          <DivMarker
            key={`heat-${p.id}`}
            lat={p.requested.lat}
            lng={p.requested.lng}
            title={`${p.name[lang]}: ${p.apparent === null ? '—' : Math.round(p.apparent)}°C`}
            onClick={select({ kind: 'heat', id: p.id })}
            zIndex={1}
          >
            <span
              className={`heat-chip${selection?.kind === 'heat' && selection.id === p.id ? ' is-selected' : ''}`}
            >
              <Glyph kind="heat" size={14} />
              {p.apparent === null ? '—' : `${Math.round(p.apparent)}°`}
            </span>
          </DivMarker>
        ))}

        {reports.map((r) => {
          const f = freshnessOf(r.category, r.lastConfirmedAt, now)
          const s = communityStatusOf(r)
          const isSel = selection?.kind === 'report' && selection.id === r.id
          return (
            <DivMarker
              key={r.id}
              lat={r.lat}
              lng={r.lng}
              title={`${CATEGORY_LABELS[lang][r.category].name}, ${r.locality}`}
              onClick={select({ kind: 'report', id: r.id })}
              zIndex={isSel ? 10 : 2}
            >
              <span
                className={`pin pin--${f} pin--${s}${isSel ? ' is-selected' : ''}${newIds.has(r.id) ? ' is-new' : ''}`}
                style={{ ['--pin' as string]: KIND_COLOR[r.category] }}
              >
                <Glyph kind={r.category} size={16} />
              </span>
            </DivMarker>
          )
        })}

        {picked && (
          <DivMarker lat={picked.lat} lng={picked.lng} zIndex={20}>
            <span className="pick-mark" aria-hidden="true" />
          </DivMarker>
        )}
      </MapContext.Provider>
    </div>
  )
}

interface MarkerProps {
  lat: number
  lng: number
  title?: string
  zIndex: number
  onClick?: () => void
  children: ReactNode
}

/** A Leaflet marker whose content is rendered by React (through a portal into the marker's element). */
function DivMarker({ lat, lng, title, zIndex, onClick, children }: MarkerProps) {
  const map = useContext(MapContext)
  const [el] = useState(() => document.createElement('div'))
  const click = useRef(onClick)
  useEffect(() => {
    click.current = onClick
  })
  const clickable = onClick !== undefined

  useEffect(() => {
    if (!map) return
    const m = createMarker([lat, lng], {
      // Zero-size icon: CSS centres the content on the point (see .map-marker).
      icon: divIcon({ html: el, className: 'map-marker', iconSize: [0, 0] }),
      title,
      interactive: clickable,
      keyboard: clickable,
      zIndexOffset: zIndex * 1000,
    })
      .on('click', () => click.current?.())
      .addTo(map)
    return () => {
      m.remove()
    }
  }, [map, el, lat, lng, title, zIndex, clickable])

  return createPortal(children, el)
}
