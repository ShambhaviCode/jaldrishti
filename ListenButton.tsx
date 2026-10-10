import { useEffect, useRef, useState } from 'react'
import { useLang } from '../i18n/LangContext.tsx'
import { ApiError, speakAloud, type SpeechTarget } from '../lib/api.ts'

/** Reads an item aloud (Amazon Polly) for people who find reading hard, e.g. elderly residents. */
export function ListenButton({ target }: { target: SpeechTarget }) {
  const { lang, t } = useLang()
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const [error, setError] = useState<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)
  // Stop speaking when the panel closes.
  useEffect(() => () => audio.current?.pause(), [])

  async function toggle() {
    if (state === 'playing') {
      audio.current?.pause()
      setState('idle')
      return
    }
    setError(null)
    setState('loading')
    try {
      const res = await speakAloud(target, lang)
      const a = new Audio(`data:audio/mpeg;base64,${res.audio}`)
      a.onended = () => setState('idle')
      audio.current = a
      await a.play()
      setState('playing')
    } catch (e) {
      const errs = t.listenErrors as Record<string, string>
      setError(errs[e instanceof ApiError ? e.code : 'generic'] ?? errs.generic)
      setState('idle')
    }
  }

  return (
    <div className="listen">
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={toggle}
        disabled={state === 'loading'}
        aria-pressed={state === 'playing'}
      >
        {state === 'loading' ? (
          <span className="spinner spinner--sm" aria-hidden="true" />
        ) : (
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8v4h3l4 3V5L6 8H3Z" />
            <path d="M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10" />
          </svg>
        )}
        {state === 'playing' ? t.listenStop : state === 'loading' ? t.listenLoading : t.listen}
      </button>
      {error && (
        <p className="field__error" role="status">
          {error}
        </p>
      )}
    </div>
  )
}
