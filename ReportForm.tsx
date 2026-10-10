import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  LIMITS,
  REPORT_CATEGORIES,
  SEVERITIES,
  validateReportInput,
  type FieldError,
  type Report,
  type ReportCategory,
  type Severity,
} from '../../shared/reports.ts'
import { useLang } from '../i18n/LangContext.tsx'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '../i18n/strings.ts'
import { ApiError, createReport } from '../lib/api.ts'
import { KIND_COLOR } from '../lib/layers.ts'
import { Glyph } from './Glyph.tsx'

interface Props {
  picked: { lat: number; lng: number } | null
  onPick: (p: { lat: number; lng: number }) => void
  mapAvailable: boolean
  onCancel: () => void
  onCreated: (r: Report) => void
}

export function ReportForm({ picked, onPick, mapAvailable, onCancel, onCreated }: Props) {
  const { lang, t } = useLang()
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [locality, setLocality] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>(2)
  const [errors, setErrors] = useState<FieldError[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [serverMsg, setServerMsg] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [locMsg, setLocMsg] = useState<string | null>(null)
  // One id per attempt: a retried send (e.g. after a timeout) is stored once, not twice.
  const requestId = useRef(crypto.randomUUID())
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => headingRef.current?.focus(), [])

  const errFor = (field: string) => errors.find((e) => e.field === field)
  const errText = (field: string) => {
    const e = errFor(field)
    return e ? (t.errors[e.code] ?? t.errors.generic) : null
  }

  function locateMe() {
    if (!('geolocation' in navigator)) {
      setLocMsg(t.locationDenied)
      return
    }
    setLocating(true)
    setLocMsg(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onPick({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setLocating(false)
        setLocMsg(t.locationDenied)
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setServerMsg(null)
    const v = validateReportInput({
      category,
      lat: picked?.lat,
      lng: picked?.lng,
      locality,
      description,
      severity,
      requestId: requestId.current,
    })
    if (!v.ok) {
      setErrors(v.errors)
      return
    }
    setErrors([])
    setSubmitting(true)
    try {
      const { report } = await createReport(v.value)
      requestId.current = crypto.randomUUID()
      onCreated(report)
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields as FieldError[])
      const code = err instanceof ApiError ? err.code : 'generic'
      setServerMsg(t.errors[code] ?? t.errors.generic)
    } finally {
      setSubmitting(false)
    }
  }

  const locErr = errText('lat') ?? errText('lng')

  return (
    <aside className="panel panel--form" aria-labelledby="form-title">
      <header className="panel__head">
        <h3 id="form-title" className="panel__title" tabIndex={-1} ref={headingRef}>
          {t.reportTitle}
        </h3>
        <button type="button" className="icon-btn" onClick={onCancel} aria-label={t.close}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <p className="panel__hint">{t.reportIntro}</p>

      <form onSubmit={submit} noValidate className="form">
        <fieldset className="field">
          <legend className="field__label">{t.fCategory}</legend>
          <div className="choice-grid">
            {REPORT_CATEGORIES.map((c) => (
              <label key={c} className="choice" style={{ ['--kind' as string]: KIND_COLOR[c] }}>
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={category === c}
                  onChange={() => setCategory(c)}
                />
                <span className="choice__body">
                  <span className="choice__icon">
                    <Glyph kind={c} size={18} />
                  </span>
                  <span className="choice__name">{CATEGORY_LABELS[lang][c].name}</span>
                  <span className="choice__hint">{CATEGORY_LABELS[lang][c].hint}</span>
                </span>
              </label>
            ))}
          </div>
          {errText('category') && <p className="field__error">{errText('category')}</p>}
        </fieldset>

        <fieldset className="field">
          <legend className="field__label">{t.fLocation}</legend>
          <p className="field__help">{mapAvailable ? t.fLocationHelpMap : t.fLocationHelpNoMap}</p>
          <div className="loc-row">
            <button type="button" className="btn btn--ghost btn--sm" onClick={locateMe} disabled={locating}>
              {locating && <span className="spinner spinner--sm" aria-hidden="true" />}
              {locating ? t.locating : t.useMyLocation}
            </button>
            {picked && (
              <span className="loc-picked" aria-live="polite">
                {t.locationPicked}: <span className="num">{picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}</span>
              </span>
            )}
          </div>
          {locMsg && <p className="field__error">{locMsg}</p>}
          {locErr && <p className="field__error">{locErr}</p>}
        </fieldset>

        <div className="field">
          <label htmlFor="f-locality" className="field__label">
            {t.fLocality}
          </label>
          <input
            id="f-locality"
            className="input"
            value={locality}
            maxLength={LIMITS.localityMax}
            placeholder={t.fLocalityHint}
            onChange={(e) => setLocality(e.target.value)}
            aria-invalid={!!errFor('locality')}
            aria-describedby={errFor('locality') ? 'f-locality-err' : undefined}
            autoComplete="off"
          />
          {errText('locality') && (
            <p id="f-locality-err" className="field__error">
              {errText('locality')}
            </p>
          )}
        </div>

        <fieldset className="field">
          <legend className="field__label">{t.fSeverity}</legend>
          <div className="segmented">
            {SEVERITIES.map((s) => (
              <label key={s} className="segmented__item">
                <input type="radio" name="severity" value={s} checked={severity === s} onChange={() => setSeverity(s)} />
                <span>{SEVERITY_LABELS[lang][s]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="f-desc" className="field__label">
            {t.fDescription}
          </label>
          <textarea
            id="f-desc"
            className="input input--area"
            rows={3}
            value={description}
            maxLength={LIMITS.descriptionMax}
            onChange={(e) => setDescription(e.target.value)}
            aria-describedby="f-desc-count"
          />
          <p id="f-desc-count" className="field__count">
            {description.length}/{LIMITS.descriptionMax}
          </p>
          {errText('description') && <p className="field__error">{errText('description')}</p>}
        </div>

        <p className={`form-msg${serverMsg ? ' is-error' : ''}`} role="status" aria-live="polite">
          {serverMsg}
        </p>
        <div className="panel__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting && <span className="spinner spinner--sm" aria-hidden="true" />}
            {submitting ? t.submitting : t.submit}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </form>
    </aside>
  )
}
