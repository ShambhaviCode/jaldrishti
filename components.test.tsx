import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Report } from '../../shared/reports.ts'
import { LangProvider } from '../i18n/LangContext.tsx'
import type { Lang } from '../i18n/strings.ts'
import { ReportDetail } from './DetailPanel.tsx'
import { FreshnessRail } from './FreshnessRail.tsx'
import { MapSection } from './MapSection.tsx'
import { ReportForm } from './ReportForm.tsx'

vi.mock('../lib/api.ts', async (orig) => ({
  ...(await orig<typeof import('../lib/api.ts')>()),
  sendSignal: vi.fn(),
  createReport: vi.fn(),
  speakAloud: vi.fn(),
}))
const api = await import('../lib/api.ts')
// jsdom has no audio playback.
const play = vi.fn(async () => {})
const pause = vi.fn()
HTMLMediaElement.prototype.play = play
HTMLMediaElement.prototype.pause = pause

const NOW = Date.parse('2026-10-10T06:00:00Z')
const wrap = (ui: ReactNode, lang: Lang = 'hi') => render(<LangProvider initial={lang}>{ui}</LangProvider>)

const report: Report = {
  id: '00000000-0000-4000-8000-000000000001',
  category: 'waterlogging',
  lat: 28.6139,
  lng: 77.209,
  locality: 'मिंटो ब्रिज',
  description: '<img src=x onerror=alert(1)>',
  severity: 3,
  submittedAt: '2026-10-10T05:00:00.000Z',
  lastConfirmedAt: '2026-10-10T05:30:00.000Z',
  lastClearedAt: null,
  confirmCount: 0,
  clearedCount: 0,
  source: 'community',
}

describe('ReportDetail', () => {
  it('shows source, absolute + relative timestamps, unverified status and no official verification', () => {
    wrap(<ReportDetail report={report} now={NOW} onClose={() => {}} onUpdated={() => {}} />, 'en')
    expect(screen.getByRole('heading', { name: 'Waterlogging' })).toBeInTheDocument()
    expect(screen.getByText('Community report')).toBeInTheDocument()
    expect(screen.getByText('Unverified')).toBeInTheDocument()
    expect(screen.getByText('Fresh')).toBeInTheDocument()
    expect(screen.getByText(/No government department has checked this/)).toBeInTheDocument()
    const times = document.querySelectorAll('time')
    expect([...times].map((t) => t.getAttribute('datetime'))).toEqual([
      '2026-10-10T05:00:00.000Z',
      '2026-10-10T05:30:00.000Z',
    ])
    expect(screen.getByText('(1 hour ago)')).toBeInTheDocument()
  })

  it('renders user text as text, never as HTML', () => {
    wrap(<ReportDetail report={report} now={NOW} onClose={() => {}} onUpdated={() => {}} />)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(document.querySelector('img')).toBeNull()
  })

  it('shows a clear message when confirming your own report is refused', async () => {
    vi.mocked(api.sendSignal).mockRejectedValueOnce(new api.ApiError('own_report', 403))
    wrap(<ReportDetail report={report} now={NOW} onClose={() => {}} onUpdated={() => {}} />, 'en')
    await userEvent.click(screen.getByRole('button', { name: /still there/ }))
    expect(await screen.findByText('You cannot confirm your own report.')).toBeInTheDocument()
  })

  it('offers WhatsApp and link sharing that point back to this report', () => {
    wrap(<ReportDetail report={report} now={NOW} onClose={() => {}} onUpdated={() => {}} />, 'en')
    const href = screen.getByRole('link', { name: 'Share on WhatsApp' }).getAttribute('href')!
    const text = decodeURIComponent(href.replace('https://wa.me/?text=', ''))
    expect(text).toContain(`#r=${report.id}`)
    expect(text).toContain('मिंटो ब्रिज')
    expect(screen.getByRole('button', { name: 'Share link' })).toBeInTheDocument()
  })

  it('reads the report aloud in the chosen language, and can stop', async () => {
    vi.mocked(api.speakAloud).mockResolvedValueOnce({ audio: 'QUJD', text: 'spoken' })
    wrap(<ReportDetail report={report} now={NOW} onClose={() => {}} onUpdated={() => {}} />, 'en')
    await userEvent.click(screen.getByRole('button', { name: 'Listen' }))
    expect(api.speakAloud).toHaveBeenCalledWith({ kind: 'report', id: report.id }, 'en')
    expect(play).toHaveBeenCalled()
    await userEvent.click(await screen.findByRole('button', { name: 'Stop' }))
    expect(pause).toHaveBeenCalled()
  })

  it('explains when read-aloud has reached its daily limit', async () => {
    vi.mocked(api.speakAloud).mockRejectedValueOnce(new api.ApiError('speech_busy', 429))
    wrap(<ReportDetail report={report} now={NOW} onClose={() => {}} onUpdated={() => {}} />, 'hi')
    await userEvent.click(screen.getByRole('button', { name: 'सुनें' }))
    expect(await screen.findByText(/आज सुनने की सुविधा की सीमा पूरी हो गई/)).toBeInTheDocument()
  })

  it('updates the report after a recorded confirmation', async () => {
    const updated = { ...report, confirmCount: 1 }
    vi.mocked(api.sendSignal).mockResolvedValueOnce({ report: updated })
    const onUpdated = vi.fn()
    wrap(<ReportDetail report={report} now={NOW} onClose={() => {}} onUpdated={onUpdated} />, 'en')
    await userEvent.click(screen.getByRole('button', { name: /still there/ }))
    expect(onUpdated).toHaveBeenCalledWith(updated)
    expect(await screen.findByText('Your response was recorded.')).toBeInTheDocument()
  })
})

describe('FreshnessRail', () => {
  it('lists unavailable sources explicitly instead of hiding them', () => {
    wrap(<FreshnessRail weather={{ state: 'loading' }} reports={{ state: 'unconfigured' }} now={NOW} />, 'en')
    const rows = screen.getAllByRole('listitem')
    expect(rows).toHaveLength(4)
    expect(within(rows[0]).getByText('Checking')).toBeInTheDocument()
    expect(within(rows[2]).getByText('IMD heatwave warnings')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Not available')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Not available')).toBeInTheDocument()
  })

  it('says "none yet" when the service works but has no reports', () => {
    wrap(<FreshnessRail weather={{ state: 'error', code: 'x' }} reports={{ state: 'ready', data: { reports: [] } }} now={NOW} />, 'en')
    expect(screen.getByText('Community reports: none yet')).toBeInTheDocument()
  })
})

describe('MapSection states', () => {
  const props = { weather: { state: 'loading' } as const, now: NOW, formOpen: false, setFormOpen: () => {}, onReportChanged: () => {} }
  afterEach(() => {
    window.location.hash = ''
  })

  it('opens a report from a shared link', () => {
    Element.prototype.scrollIntoView = vi.fn()
    window.location.hash = `#r=${report.id}`
    wrap(<MapSection {...props} reports={{ state: 'ready', data: { reports: [report] } }} />, 'en')
    expect(screen.getByRole('heading', { name: 'Waterlogging' })).toBeInTheDocument()
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it('says so when a shared report is no longer on the map', () => {
    Element.prototype.scrollIntoView = vi.fn()
    window.location.hash = `#r=${report.id}`
    wrap(<MapSection {...props} reports={{ state: 'ready', data: { reports: [] } }} />, 'en')
    expect(screen.getByText(/no longer on the map/)).toBeInTheDocument()
  })

  it('tells people to tap the map while reporting, and pins cannot steal that tap', () => {
    wrap(<MapSection {...props} formOpen reports={{ state: 'ready', data: { reports: [report] } }} />, 'en')
    expect(screen.getByText('Tap the map to choose the spot')).toBeInTheDocument()
    // only the list row is a button; the map pin is not, so tapping it picks the spot instead of closing the form
    expect(screen.getAllByRole('button', { name: /Waterlogging, मिंटो ब्रिज/ })).toHaveLength(1)
  })

  it('explains that an empty map does not mean safe', () => {
    wrap(<MapSection {...props} reports={{ state: 'ready', data: { reports: [] } }} />, 'en')
    expect(screen.getByText(/does not mean there is no problem here/)).toBeInTheDocument()
  })

  it('shows loading, error and not-configured states', () => {
    const { unmount } = wrap(<MapSection {...props} reports={{ state: 'loading' }} />, 'en')
    expect(screen.getByText('Loading reports')).toBeInTheDocument()
    unmount()
    const r2 = wrap(<MapSection {...props} reports={{ state: 'error', code: 'network' }} />, 'en')
    expect(screen.getByRole('alert')).toHaveTextContent('Could not reach the report service')
    r2.unmount()
    wrap(<MapSection {...props} reports={{ state: 'unconfigured' }} />, 'en')
    expect(screen.getByText(/not connected yet/)).toBeInTheDocument()
  })

  it('draws the report on the OpenStreetMap map and in the list, and groundwater as unavailable', () => {
    wrap(<MapSection {...props} reports={{ state: 'ready', data: { reports: [report] } }} />, 'en')
    expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
    // one pin on the map, one row in the list
    expect(screen.getAllByRole('button', { name: /Waterlogging, मिंटो ब्रिज/ })).toHaveLength(2)
    expect(screen.getByRole('button', { name: /Groundwater/ })).toBeDisabled()
  })

  it('filters reports out of the list when their layer is switched off', async () => {
    wrap(<MapSection {...props} reports={{ state: 'ready', data: { reports: [report] } }} />, 'en')
    const filter = screen.getByRole('button', { name: /^Waterlogging$/ })
    expect(filter).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(filter)
    expect(filter).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: /Waterlogging, मिंटो ब्रिज/ })).toBeNull()
  })
})

describe('ReportForm', () => {
  it('validates on the client before sending anything', async () => {
    wrap(<ReportForm picked={null} onPick={() => {}} mapAvailable onCancel={() => {}} onCreated={() => {}} />, 'en')
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }))
    expect(screen.getByText('Choose a category.')).toBeInTheDocument()
    expect(screen.getByText('Pick a spot on the map.')).toBeInTheDocument()
    expect(screen.getByText('Area name needs at least 2 characters.')).toBeInTheDocument()
    expect(api.createReport).not.toHaveBeenCalled()
  })

  it('sends a valid report and hands back the stored one', async () => {
    const onCreated = vi.fn()
    vi.mocked(api.createReport).mockResolvedValueOnce({ report })
    wrap(
      <ReportForm picked={{ lat: 28.6139, lng: 77.209 }} onPick={() => {}} mapAvailable onCancel={() => {}} onCreated={onCreated} />,
      'en',
    )
    await userEvent.click(screen.getByRole('radio', { name: /Water leak/ }))
    await userEvent.type(screen.getByLabelText('Area name'), 'ITO crossing')
    await userEvent.click(screen.getByRole('button', { name: 'Send report' }))
    expect(api.createReport).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'leak', locality: 'ITO crossing', severity: 2, lat: 28.6139 }),
    )
    expect(onCreated).toHaveBeenCalledWith(report)
  })

  it('shows the server reason when rate limited', async () => {
    vi.mocked(api.createReport).mockRejectedValueOnce(new api.ApiError('rate_limited', 429))
    wrap(<ReportForm picked={{ lat: 28.6, lng: 77.2 }} onPick={() => {}} mapAvailable onCancel={() => {}} onCreated={() => {}} />, 'hi')
    await userEvent.click(screen.getByRole('radio', { name: /जलभराव/ }))
    await userEvent.type(screen.getByLabelText('इलाके का नाम'), 'आईटीओ')
    await userEvent.click(screen.getByRole('button', { name: 'रिपोर्ट भेजें' }))
    expect(await screen.findByText(/एक घंटे में बहुत सारी रिपोर्ट/)).toBeInTheDocument()
  })
})
