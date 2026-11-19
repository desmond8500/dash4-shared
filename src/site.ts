import type { Equipment, Site } from './types.js'

/**
 * Suivi de chantier : arbre des équipements (principaux puis secondaires), emplacement lisible
 * (« Bâtiment A › RDC › Local technique ») et totaux par type.
 */

export interface EquipmentNode {
  item: Equipment
  children: Equipment[]
}

/** Équipements principaux avec leurs sous-équipements ; un parent introuvable rend l'équipement principal. */
export function equipmentTree(items: Equipment[]): EquipmentNode[] {
  const ids = new Set(items.map((e) => e.id))
  const byPosition = (a: Equipment, b: Equipment) => a.position - b.position || a.id - b.id
  return items
    .filter((e) => e.parent_id === null || !ids.has(e.parent_id))
    .sort(byPosition)
    .map((item) => ({ item, children: items.filter((c) => c.parent_id === item.id).sort(byPosition) }))
}

/** « Bâtiment A › RDC › Local technique » pour un niveau et / ou une pièce. */
export function placeLabel(site: Pick<Site, 'buildings'>, levelId: number | null, roomId: number | null): string | null {
  for (const b of site.buildings) {
    for (const l of b.levels) {
      const room = roomId ? l.rooms.find((r) => r.id === roomId) : undefined
      if (room) return `${b.name} › ${l.name} › ${room.name}`
      if (!roomId && levelId === l.id) return `${b.name} › ${l.name}`
    }
  }
  return null
}

/** Nombre d'équipements par type (ou par nom sans type), quantités comprises, du plus fréquent au moins fréquent. */
export function equipmentTotals(items: Equipment[]): Array<{ label: string; quantity: number }> {
  const totals = new Map<string, number>()
  for (const e of items) {
    const label = (e.type || e.name).trim()
    totals.set(label, (totals.get(label) ?? 0) + e.quantity)
  }
  return [...totals.entries()].map(([label, quantity]) => ({ label, quantity })).sort((a, b) => b.quantity - a.quantity || a.label.localeCompare(b.label, 'fr'))
}

/** Position relative (0 à 1) d'un clic dans un élément, arrondie à 6 décimales. */
export function relativePosition(clientX: number, clientY: number, rect: { left: number; top: number; width: number; height: number }): { x: number; y: number } {
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const round = (v: number) => Math.round(v * 1e6) / 1e6
  return {
    x: round(clamp((clientX - rect.left) / (rect.width || 1))),
    y: round(clamp((clientY - rect.top) / (rect.height || 1))),
  }
}

/** Total par article ou désignation d'un quantitatif (lignes de plusieurs pièces additionnées). */
export function quantityTotals(rows: Array<{ article_id: number | null; designation: string; unit: string | null; quantity: number }>): Array<{ designation: string; unit: string | null; quantity: number }> {
  const totals = new Map<string, { designation: string; unit: string | null; quantity: number }>()
  for (const r of rows) {
    const key = r.article_id ? `a${r.article_id}` : `d${r.designation.trim().toLowerCase()}`
    const t = totals.get(key) ?? { designation: r.designation, unit: r.unit, quantity: 0 }
    t.quantity = Math.round((t.quantity + Number(r.quantity || 0)) * 100) / 100
    totals.set(key, t)
  }
  return [...totals.values()]
}
