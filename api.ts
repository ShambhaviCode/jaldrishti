import type { Report, ReportInput, SignalType } from '../../shared/reports.ts'

/** Public URL of the reports API (API Gateway in production, dev server locally). Not a secret. */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export class ApiError extends Error {
  code: string
  status: number
  fields?: Array<{ field: string; code: string }>
  constructor(code: string, status: number, fields?: Array<{ field: string; code: string }>) {
    super(code)
    this.code = code
    this.status = status
    this.fields = fields
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) throw new ApiError('not_configured', 0)
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError('network', 0)
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    throw new ApiError(
      typeof body.error === 'string' ? body.error : 'generic',
      res.status,
      body.fields as ApiError['fields'],
    )
  }
  return body as T
}

export interface ReportList {
  reports: Report[]
  serverTime: string
  windowHours: number
}

export const listReports = (signal?: AbortSignal) => request<ReportList>('/reports', { signal })

export const createReport = (input: ReportInput) =>
  request<{ report: Report }>('/reports', { method: 'POST', body: JSON.stringify(input) })

export const sendSignal = (id: string, type: SignalType) =>
  request<{ report: Report }>(`/reports/${encodeURIComponent(id)}/signals`, {
    method: 'POST',
    body: JSON.stringify({ type }),
  })

/** What to read aloud. The server writes the sentence; we only say which item. */
export type SpeechTarget = { kind: 'report'; id: string } | { kind: 'heat'; point: string; feelsLike: number }

/** Read-aloud via Amazon Polly: base64 MP3 plus the text that was spoken. */
export const speakAloud = (target: SpeechTarget, lang: 'hi' | 'en') =>
  request<{ audio: string; text: string }>('/speech', { method: 'POST', body: JSON.stringify({ ...target, lang }) })
