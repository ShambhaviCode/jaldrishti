import { communityStatusOf, freshnessOf, type Report } from '../../shared/reports.ts'
import { useLang } from '../i18n/LangContext.tsx'

export function FreshnessBadge({ report, now }: { report: Report; now: number }) {
  const { t } = useLang()
  const f = freshnessOf(report.category, report.lastConfirmedAt, now)
  return <span className={`badge badge--${f}`}>{t.freshness[f]}</span>
}

export function CommunityBadge({ report }: { report: Report }) {
  const { t } = useLang()
  const s = communityStatusOf(report)
  return <span className={`badge badge--${s}`}>{t.status[s]}</span>
}
