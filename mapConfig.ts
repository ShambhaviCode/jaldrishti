export const DELHI_CENTER = { lat: 28.6139, lng: 77.209 }

/**
 * OpenStreetMap's standard tiles: no key, no billing. The tile usage policy
 * (https://operations.osmfoundation.org/policies/tiles/) requires the visible
 * attribution below and a Referer header (our Referrer-Policy sends the origin),
 * and suits light traffic. For heavy use, point this at a commercial or
 * self-hosted tile server.
 */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export type Selection = { kind: 'report'; id: string } | { kind: 'heat'; id: string } | null
