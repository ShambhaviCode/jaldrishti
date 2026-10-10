/**
 * A report can be opened from a link: <site>#r=<report id>. A hash needs no
 * server routing on Amplify, and the id is the report's public UUID.
 */
const REPORT_HASH = /^#r=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/

export function reportIdFromHash(hash: string): string | null {
  return REPORT_HASH.exec(hash)?.[1] ?? null
}

export function reportLink(id: string, loc: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  return `${loc.origin}${loc.pathname}#r=${id}`
}

export function whatsappLink(text: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
}
