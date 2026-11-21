import type { PlanIcon, PlanMarker } from './types.js'

/**
 * Éditeur de plans : symboles intégrés, calques par système, légende et géométrie des repères.
 * Les symboles sont dessinés dans un carré de 24 × 24 (remplissage pair-impair), pour le SVG comme pour le canvas.
 */
export interface PlanSymbol {
  key: string
  label: string
  path: string
}

export const PLAN_SYMBOLS: PlanSymbol[] = [
  { key: 'dot', label: 'Rond', path: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z' },
  { key: 'square', label: 'Carré', path: 'M3 3h18v18H3z' },
  { key: 'triangle', label: 'Triangle', path: 'M12 2l10 19H2z' },
  { key: 'diamond', label: 'Losange', path: 'M12 1l11 11-11 11L1 12z' },
  { key: 'star', label: 'Étoile', path: 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z' },
  { key: 'arrow', label: 'Flèche', path: 'M12 2l8 8h-5v12H9V10H4z' },
  { key: 'camera', label: 'Caméra', path: 'M2 7h13l5-3v11l-5-3H2z M5 13h3v4h3v2H5z' },
  { key: 'dome', label: 'Caméra dôme', path: 'M3 9h18v2H3z M5 11h14a7 7 0 0 1-14 0z M12 13a2 2 0 1 0 0 4a2 2 0 1 0 0-4z' },
  { key: 'smoke', label: 'Détecteur de fumée', path: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M12 5a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z' },
  { key: 'heat', label: 'Détecteur de chaleur', path: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M12 5a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M11 7h2v10h-2z M7 11h10v2H7z' },
  { key: 'motion', label: 'Détecteur de mouvement', path: 'M12 22L2 6a15 15 0 0 1 20 0z M12 16L6.5 7.5a9 9 0 0 1 11 0z' },
  { key: 'contact', label: "Contact d'ouverture", path: 'M2 7h8v10H2z M14 7h8v10h-8z' },
  { key: 'siren', label: 'Sirène', path: 'M6 21h12l-1.5-9a4.5 4.5 0 0 0-9 0z M11 1h2v4h-2z M3.3 4.7l1.4-1.4 2.8 2.8-1.4 1.4z M16.5 6.1l2.8-2.8 1.4 1.4-2.8 2.8z' },
  { key: 'keypad', label: 'Clavier', path: 'M5 2h14v20H5z M8 5h2v2H8z M11 5h2v2h-2z M14 5h2v2h-2z M8 9h2v2H8z M11 9h2v2h-2z M14 9h2v2h-2z M8 13h2v2H8z M11 13h2v2h-2z M14 13h2v2h-2z M8 17h8v2H8z' },
  { key: 'call_point', label: 'Déclencheur manuel', path: 'M3 3h18v18H3z M12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10z' },
  { key: 'reader', label: 'Lecteur de badge', path: 'M7 2h10v20H7z M10 6h4v2h-4z M10 10h4v2h-4z M11 16h2v2h-2z' },
  { key: 'door', label: 'Porte', path: 'M5 2h14v20H5z M14 11h2v2h-2z' },
  { key: 'speaker', label: 'Haut-parleur', path: 'M2 9h5l6-5v16l-6-5H2z M16 7.5a6 6 0 0 1 0 9l-1.4-1.4a4 4 0 0 0 0-6.2z' },
  { key: 'wifi', label: "Point d'accès Wi-Fi", path: 'M12 17a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z M3 10.5a13 13 0 0 1 18 0l-1.8 1.8a10.5 10.5 0 0 0-14.4 0z M6.6 14.1a8 8 0 0 1 10.8 0l-1.8 1.8a5.5 5.5 0 0 0-7.2 0z' },
  { key: 'panel', label: 'Centrale, coffret', path: 'M4 2h16v20H4z M7 5h10v3H7z M7 10h10v2H7z M7 14h10v2H7z M7 18h4v2H7z' },
  { key: 'light', label: 'Éclairage', path: 'M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2z M9 19.5h6V22H9z' },
  { key: 'socket', label: 'Prise', path: 'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z M8 10h2v4H8z M14 10h2v4h-2z' },
  { key: 'extinguisher', label: 'Extincteur', path: 'M8 7h8v15H8z M11 2h2v5h-2z M13 3h6v2h-6z' },
  { key: 'sprinkler', label: 'Sprinkler', path: 'M11 2h2v6h-2z M6 8h12v3H6z M12 13l3 9H9z M3 14l3-1 1 2-3 1z M21 14l-3-1-1 2 3 1z' },
]

const BY_KEY = new Map(PLAN_SYMBOLS.map((s) => [s.key, s]))

/** Symbole par sa clé, ou le rond par défaut. */
export function planSymbol(key: string | null | undefined): PlanSymbol {
  return (key && BY_KEY.get(key)) || PLAN_SYMBOLS[0]!
}

/** Couleur d'un repère : la sienne, sinon celle de l'icône, sinon le rouge par défaut. */
export function markerColor(marker: Pick<PlanMarker, 'color'>, icon?: Pick<PlanIcon, 'color'> | null): string {
  return marker.color || icon?.color || '#e11d48'
}

/** Clé de calque d'un repère : identifiant du système en texte, ou `none`. */
export function layerKey(marker: Pick<PlanMarker, 'layer_id'>): string {
  return marker.layer_id === null || marker.layer_id === undefined ? 'none' : String(marker.layer_id)
}

export interface PlanLayer {
  key: string
  name: string
  count: number
  hidden: boolean
}

/** Calques d'un plan : un par système présent (dans l'ordre des systèmes), puis « Sans système ». */
export function planLayers(markers: Pick<PlanMarker, 'layer_id'>[], systems: Array<{ id: number; name: string }>, hidden: string[] = []): PlanLayer[] {
  const counts = new Map<string, number>()
  for (const m of markers) counts.set(layerKey(m), (counts.get(layerKey(m)) ?? 0) + 1)
  const layers: PlanLayer[] = systems
    .filter((s) => counts.has(String(s.id)))
    .map((s) => ({ key: String(s.id), name: s.name, count: counts.get(String(s.id))!, hidden: hidden.includes(String(s.id)) }))
  for (const [key, count] of counts) {
    if (key !== 'none' && !systems.some((s) => String(s.id) === key)) layers.push({ key, name: 'Système retiré', count, hidden: hidden.includes(key) })
  }
  if (counts.has('none')) layers.push({ key: 'none', name: 'Sans système', count: counts.get('none')!, hidden: hidden.includes('none') })
  return layers
}

/** Repères affichés : ceux des calques visibles. */
export function visibleMarkers<T extends Pick<PlanMarker, 'layer_id'>>(markers: T[], hidden: string[]): T[] {
  return hidden.length ? markers.filter((m) => !hidden.includes(layerKey(m))) : markers
}

export interface LegendEntry {
  /** Clé de regroupement : icône (`i12`) ou symbole par défaut avec couleur. */
  key: string
  icon: PlanIcon | null
  color: string
  name: string
  count: number
}

/**
 * Légende des repères visibles : une ligne par icône (et couleur), avec le nombre de repères.
 * Le nom est celui de l'icône, sinon celui de l'équipement (ou « Repère »).
 */
export function planLegend(
  markers: Array<Pick<PlanMarker, 'icon_id' | 'color' | 'label' | 'equipment_id'>>,
  icons: PlanIcon[],
  equipmentName: (id: number | null) => string | null = () => null,
): LegendEntry[] {
  const byId = new Map(icons.map((i) => [i.id, i]))
  const entries = new Map<string, LegendEntry>()
  for (const m of markers) {
    const icon = (m.icon_id !== null && byId.get(m.icon_id)) || null
    const color = markerColor(m, icon)
    const key = icon ? `i${icon.id}|${icon.file_path ? '' : color}` : `c${color}|${equipmentName(m.equipment_id) ?? m.label ?? ''}`
    const entry = entries.get(key)
    if (entry) entry.count++
    else entries.set(key, { key, icon, color, name: icon?.name ?? equipmentName(m.equipment_id) ?? m.label ?? 'Repère', count: 1 })
  }
  return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

/** Angle ramené entre 0 et 359. */
export function normalizeAngle(deg: number): number {
  return ((Math.round(deg) % 360) + 360) % 360
}

/** Angle (degrés, 0 = vers le haut) du point (px, py) vu depuis le centre (cx, cy), arrondi à `snap` degrés. */
export function angleFrom(cx: number, cy: number, px: number, py: number, snap = 1): number {
  const deg = (Math.atan2(px - cx, -(py - cy)) * 180) / Math.PI
  return normalizeAngle(Math.round(deg / snap) * snap)
}

/** Taille bornée d'un repère (part de la largeur du plan). */
export function clampSize(size: number): number {
  return Math.min(0.3, Math.max(0.005, Math.round(size * 10000) / 10000))
}

/** Position bornée dans le plan (0 à 1). */
export function clampPosition(v: number): number {
  return Math.min(1, Math.max(0, Math.round(v * 1_000_000) / 1_000_000))
}
