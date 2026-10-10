import type { ReportCategory } from '../../shared/reports.ts'

/** Map layers the filter bar controls. Tankers group both tanker categories. */
export type LayerId = 'heat' | 'waterlogging' | 'leak' | 'tanker' | 'other_water' | 'groundwater'

export const LAYERS: Array<{ id: LayerId; available: boolean }> = [
  { id: 'heat', available: true },
  { id: 'waterlogging', available: true },
  { id: 'leak', available: true },
  { id: 'tanker', available: true },
  { id: 'other_water', available: true },
  { id: 'groundwater', available: false },
]

export function layerOf(c: ReportCategory): LayerId {
  return c === 'tanker_need' || c === 'tanker_available' ? 'tanker' : c
}

export type GlyphKind = ReportCategory | 'heat' | 'groundwater'

/** CSS custom property holding each kind's colour (defined in tokens.css). */
export const KIND_COLOR: Record<GlyphKind, string> = {
  heat: 'var(--c-heat)',
  waterlogging: 'var(--c-waterlogging)',
  leak: 'var(--c-leak)',
  tanker_need: 'var(--c-tanker-need)',
  tanker_available: 'var(--c-tanker-available)',
  other_water: 'var(--c-other)',
  groundwater: 'var(--c-groundwater)',
}
