/** Smooth scroll unless the person asked the OS for reduced motion. */
export function scrollToId(id: string, focus = false) {
  const el = document.getElementById(id)
  if (!el) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  if (focus) el.focus({ preventScroll: true })
}
