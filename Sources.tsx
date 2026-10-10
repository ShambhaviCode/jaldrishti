import { FRESHNESS_RULES, REPORT_CATEGORIES } from '../../shared/reports.ts'
import { useLang } from '../i18n/LangContext.tsx'
import { CATEGORY_LABELS } from '../i18n/strings.ts'

const H = 3_600_000

export function Sources() {
  const { lang, t } = useLang()
  return (
    <section className="sources" aria-labelledby="sources-title">
      <div className="sources__col">
        <h2 id="sources-title" className="section-title">
          {t.sourcesTitle}
        </h2>
        <p className="section-lede">{t.sourcesLede}</p>
        <ul className="source-list">
          {t.srcRows.map((row) => (
            <li key={row.name} className={`source source--${row.state}`}>
              <span className="source__state">{row.state === 'available' ? (lang === 'hi' ? 'जुड़ा है' : 'Connected') : t.railUnavailable}</span>
              <h3 className="source__name">{row.name}</h3>
              <p className="source__text">{row.text}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="sources__col">
        <h2 className="section-title">{t.rulesTitle}</h2>
        <p className="section-lede">{t.rulesLede}</p>
        <table className="rules">
          <thead>
            <tr>
              <th scope="col">{lang === 'hi' ? 'श्रेणी' : 'Category'}</th>
              <th scope="col">{t.rulesFresh}</th>
              <th scope="col">{t.rulesStale}</th>
            </tr>
          </thead>
          <tbody>
            {REPORT_CATEGORIES.map((c) => (
              <tr key={c}>
                <th scope="row">{CATEGORY_LABELS[lang][c].name}</th>
                <td className="num">{t.hours(FRESHNESS_RULES[c].freshMs / H)}</td>
                <td className="num">{t.hours(FRESHNESS_RULES[c].staleMs / H)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="rules__note">
          {lang === 'hi'
            ? 'दो और लोग "अभी भी है" कहें तो रिपोर्ट "दूसरे लोगों ने पुष्टि की" बन जाती है। हर पुष्टि रिपोर्ट को फिर से ताज़ा कर देती है। एक व्यक्ति एक रिपोर्ट पर एक बार ही जवाब दे सकता है।'
            : 'When two other people say "still there", a report becomes "confirmed by others". Each confirmation makes it fresh again. One person can respond to a report once.'}
        </p>
      </div>
    </section>
  )
}
