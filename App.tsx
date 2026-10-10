import { useState } from 'react'
import { FreshnessRail } from './components/FreshnessRail.tsx'
import { Header } from './components/Header.tsx'
import { MapSection } from './components/MapSection.tsx'
import { Sources } from './components/Sources.tsx'
import { WeatherPanel } from './components/WeatherPanel.tsx'
import { useLang } from './i18n/LangContext.tsx'
import { useNow, useReports, useWeather } from './lib/hooks.ts'
import { scrollToId } from './lib/scroll.ts'

export default function App() {
  const { t } = useLang()
  const now = useNow()
  const { weather, retry } = useWeather()
  const { reports, upsert } = useReports()
  const [formOpen, setFormOpen] = useState(false)

  const goToMap = () => scrollToId('map', true)
  const openReport = () => {
    setFormOpen(true)
    scrollToId('map')
  }

  return (
    <>
      <Header onReport={openReport} />
      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__copy">
            <h1 id="hero-title" className="hero__title">
              {t.heroTitle}
            </h1>
            <p className="hero__lede">{t.heroLede}</p>
            <div className="hero__ctas">
              <button type="button" className="btn btn--primary btn--lg" onClick={goToMap}>
                {t.ctaMap}
              </button>
              <button type="button" className="btn btn--ghost btn--lg" onClick={openReport}>
                {t.ctaReport}
              </button>
            </div>
            <p className="hero__area">{t.heroAreaNote}</p>
            <FreshnessRail weather={weather} reports={reports} now={now} />
          </div>
          <WeatherPanel weather={weather} now={now} onRetry={retry} />
        </section>

        <MapSection
          weather={weather}
          reports={reports}
          now={now}
          formOpen={formOpen}
          setFormOpen={setFormOpen}
          onReportChanged={upsert}
        />

        <Sources />
      </main>
      <footer className="site-footer">
        <p className="site-footer__emergency">{t.footerEmergency}</p>
        <p>{t.footerBuilt}</p>
        <p>{t.footerAws}</p>
      </footer>
    </>
  )
}
