import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Report, SignalType } from '../../shared/reports.ts'
import { useLang } from '../i18n/LangContext.tsx'
import { CATEGORY_LABELS, SEVERITY_LABELS } from '../i18n/strings.ts'
import { ApiError, sendSignal } from '../lib/api.ts'
import { KIND_COLOR } from '../lib/layers.ts'
import { reportLink, whatsappLink } from '../lib/share.ts'
import { clockTime, relativeTime } from '../lib/time.ts'
import type { ModelPoint } from '../lib/weather.ts'
import { Glyph } from './Glyph.tsx'
import { ListenButton } from './ListenButton.tsx'
import { CommunityBadge, FreshnessBadge } from './StatusBadges.tsx'

function When({ iso, now }: { iso: string | number; now: number }) {
  const { lang } = useLang()
  return (
    <>
      <time dateTime={new Date(iso).toISOString()}>{clockTime(iso, lang)}</time>{' '}
      <span className="muted">({relativeTime(iso, now, lang)})</span>
    </>
  )
}

function PanelShell({ title, kindColor, glyph, onClose, children }: {
  title: string
  kindColor: string
  glyph: ReactNode
  onClose: () => void
  children: ReactNode
}) {
  const { t } = useLang()
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Move focus into the panel when it opens so keyboard and screen-reader users land on it.
  useEffect(() => headingRef.current?.focus(), [title])
  return (
    <aside className="panel" aria-labelledby="panel-title" style={{ ['--kind' as string]: kindColor }}>
      <header className="panel__head">
        <span className="panel__glyph">{glyph}</span>
        <h3 id="panel-title" className="panel__title" tabIndex={-1} ref={headingRef}>
          {title}
        </h3>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      {children}
    </aside>
  )
}

export function ReportDetail({ report, now, onClose, onUpdated }: {
  report: Report
  now: number
  onClose: () => void
  onUpdated: (r: Report) => void
}) {
  const { lang, t } = useLang()
  const label = CATEGORY_LABELS[lang][report.category]
  const [busy, setBusy] = useState<SignalType | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function signal(type: SignalType) {
    setBusy(type)
    setMsg(null)
    try {
      const res = await sendSignal(report.id, type)
      onUpdated(res.report)
      setMsg({ ok: true, text: t.signalSaved })
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'generic'
      const errs = t.signalErrors as Record<string, string>
      setMsg({ ok: false, text: errs[code] ?? errs.generic })
    } finally {
      setBusy(null)
    }
  }

  const link = reportLink(report.id)
  const shareText = t.shareText(label.name, report.locality)

  // Phones open the system share sheet; elsewhere the link is copied.
  async function shareOrCopy() {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'जलदृष्टि | JalDrishti', text: shareText, url: link })
        return
      }
      await navigator.clipboard.writeText(link)
      setMsg({ ok: true, text: t.linkCopied })
    } catch (e) {
      // Closing the share sheet is not an error; if copying is blocked, show the link to copy by hand.
      if ((e as Error).name !== 'AbortError') setMsg({ ok: true, text: link })
    }
  }

  return (
    <PanelShell
      title={label.name}
      kindColor={KIND_COLOR[report.category]}
      glyph={<Glyph kind={report.category} size={20} />}
      onClose={onClose}
    >
      <p className="panel__place">{report.locality}</p>
      <p className="panel__hint">{label.hint}</p>
      <div className="panel__badges">
        <FreshnessBadge report={report} now={now} />
        <CommunityBadge report={report} />
      </div>
      <ListenButton target={{ kind: 'report', id: report.id }} />
      {report.description && <p className="panel__desc">{report.description}</p>}

      <dl className="facts">
        <div>
          <dt>{t.detailSource}</dt>
          <dd>{t.sourceCommunity}</dd>
        </div>
        <div>
          <dt>{t.detailWhen}</dt>
          <dd>
            <When iso={report.submittedAt} now={now} />
          </dd>
        </div>
        <div>
          <dt>{t.detailLastConfirmed}</dt>
          <dd>
            <When iso={report.lastConfirmedAt} now={now} />
          </dd>
        </div>
        <div>
          <dt>{t.detailSeverity}</dt>
          <dd>{SEVERITY_LABELS[lang][report.severity]}</dd>
        </div>
        <div>
          <dt>{t.detailStatus}</dt>
          <dd>
            {report.confirmCount === 0 ? t.detailNoConfirms : `${report.confirmCount} ${t.detailConfirms}`}
            {report.clearedCount > 0 && (
              <>
                , {report.clearedCount} {t.detailCleared}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>{t.detailOfficial}</dt>
          <dd>{t.detailOfficialNo}</dd>
        </div>
      </dl>

      <div className="panel__actions">
        <button type="button" className="btn btn--primary" disabled={busy !== null} onClick={() => signal('confirm')}>
          {busy === 'confirm' && <span className="spinner spinner--sm" aria-hidden="true" />}
          {t.stillThere}
        </button>
        <button type="button" className="btn btn--ghost" disabled={busy !== null} onClick={() => signal('cleared')}>
          {busy === 'cleared' && <span className="spinner spinner--sm" aria-hidden="true" />}
          {t.goneNow}
        </button>
      </div>
      <p className={`form-msg${msg ? (msg.ok ? ' is-ok' : ' is-error') : ''}`} role="status" aria-live="polite">
        {msg?.text}
      </p>

      <div className="share">
        <p className="share__hint">{t.shareHint}</p>
        <div className="share__actions">
          <a className="btn btn--whatsapp btn--sm" href={whatsappLink(shareText, link)} target="_blank" rel="noopener noreferrer">
            {t.shareWhatsApp}
          </a>
          <button type="button" className="btn btn--ghost btn--sm" onClick={shareOrCopy}>
            {t.shareLink}
          </button>
        </div>
      </div>
    </PanelShell>
  )
}

export function HeatDetail({ point, retrievedAt, now, onClose }: {
  point: ModelPoint
  retrievedAt: number
  now: number
  onClose: () => void
}) {
  const { lang, t } = useLang()
  return (
    <PanelShell title={point.name[lang]} kindColor={KIND_COLOR.heat} glyph={<Glyph kind="heat" size={20} />} onClose={onClose}>
      <p className="panel__big">
        {point.apparent === null ? '—' : Math.round(point.apparent)}
        <span>
          {point.units.apparent} {t.feelsLike}
        </span>
      </p>
      <p className="panel__hint">{t.heatDetail}</p>
      {point.apparent !== null && <ListenButton target={{ kind: 'heat', point: point.id, feelsLike: point.apparent }} />}
      <dl className="facts">
        <div>
          <dt>{t.airTemp}</dt>
          <dd>{point.temperature === null ? '—' : `${point.temperature.toFixed(1)}${point.units.temperature}`}</dd>
        </div>
        <div>
          <dt>{t.humidity}</dt>
          <dd>{point.humidity === null ? '—' : `${point.humidity}${point.units.humidity}`}</dd>
        </div>
        <div>
          <dt>{t.detailSource}</dt>
          <dd>{t.sourceModel}</dd>
        </div>
        <div>
          <dt>{t.validAt}</dt>
          <dd>
            <When iso={point.validAt} now={now} />
          </dd>
        </div>
        <div>
          <dt>{t.fetchedAt}</dt>
          <dd>
            <When iso={retrievedAt} now={now} />
          </dd>
        </div>
        <div>
          <dt>{lang === 'hi' ? 'मॉडल ग्रिड केंद्र' : 'Model grid centre'}</dt>
          <dd className="num">
            {point.grid.lat.toFixed(3)}, {point.grid.lng.toFixed(3)}
          </dd>
        </div>
      </dl>
    </PanelShell>
  )
}
