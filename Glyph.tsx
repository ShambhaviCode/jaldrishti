import type { GlyphKind } from '../lib/layers.ts'

/** 20×20 line icons. Distinct silhouettes so categories never rely on colour alone. */
const PATHS: Record<GlyphKind, string> = {
  // sun with rays
  heat: 'M10 6.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7ZM10 1.5v2M10 16.5v2M1.5 10h2M16.5 10h2M4 4l1.4 1.4M14.6 14.6L16 16M4 16l1.4-1.4M14.6 5.4L16 4',
  // three waves
  waterlogging: 'M2 7c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1 4-.6M2 11c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1 4-.6M2 15c2-1.6 4-1.6 6 0s4 1.6 6 0 3-1 4-.6',
  // pipe with falling drop
  leak: 'M2 5h11v4H2M13 5h2.5a2 2 0 0 1 2 2v0M7.5 9v2M7.5 13.2c-1 1.3-1.5 2.1-1.5 2.8a1.5 1.5 0 0 0 3 0c0-.7-.5-1.5-1.5-2.8Z',
  // container with a question-free downward arrow (water wanted)
  tanker_need: 'M5 6h10l-1 11H6L5 6ZM8 3h4M10 3v3M10 9v5M7.8 11.8L10 14l2.2-2.2',
  // tanker truck
  tanker_available: 'M1.5 6.5h10v7h-10zM11.5 9h3.5l2.5 2.5v2h-6M4.5 15.5a1.5 1.5 0 1 0 0-.01M14.5 15.5a1.5 1.5 0 1 0 0-.01',
  // circle with dot (generic)
  other_water: 'M10 3.5a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13ZM10 9v.01M10 9v4',
  // borehole: ground line and shaft
  groundwater: 'M2 6h16M10 6v10M7.5 13.5L10 16l2.5-2.5M4 9h2M14 9h2',
}

export function Glyph({ kind, size = 18, title }: { kind: GlyphKind; size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d={PATHS[kind]} />
    </svg>
  )
}
