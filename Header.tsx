import { useLang } from '../i18n/LangContext.tsx'

export function Header({ onReport }: { onReport: () => void }) {
  const { lang, t, setLang } = useLang()
  return (
    <header className="site-header">
      <a className="skip-link" href="#map">
        {t.skipToMap}
      </a>
      <div className="site-header__inner">
        <a className="wordmark" href="#top" aria-label="जलदृष्टि JalDrishti">
          <svg className="wordmark__mark" viewBox="0 0 28 28" aria-hidden="true">
            {/* an eye whose pupil is a water drop */}
            <path d="M2 14c3.4-5.3 7.4-8 12-8s8.6 2.7 12 8c-3.4 5.3-7.4 8-12 8S5.4 19.3 2 14Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M14 9.5c-2.2 2.9-3.3 4.7-3.3 6.1a3.3 3.3 0 0 0 6.6 0c0-1.4-1.1-3.2-3.3-6.1Z" fill="currentColor" />
          </svg>
          <span className="wordmark__hi">जलदृष्टि</span>
          <span className="wordmark__en">JalDrishti</span>
        </a>
        <span className="site-header__team">{t.brandTeam}</span>
        <div className="site-header__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setLang(lang === 'hi' ? 'en' : 'hi')}
            aria-label={t.langToggleLabel}
            lang={lang === 'hi' ? 'en' : 'hi'}
          >
            {t.langToggle}
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={onReport}>
            {t.ctaReport}
          </button>
        </div>
      </div>
    </header>
  )
}
