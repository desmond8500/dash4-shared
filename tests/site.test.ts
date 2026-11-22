import { describe, expect, it } from 'vitest'
import { equipmentTotals, equipmentTree, placeLabel, quantityTotals, relativePosition } from '../src'
import type { Equipment } from '../src'

const eq = (id: number, parent_id: number | null, patch: Partial<Equipment> = {}) =>
  ({ id, parent_id, position: id, name: `E${id}`, type: null, quantity: 1, ...patch }) as Equipment

describe('suivi de chantier', () => {
  it('range les sous-équipements sous leur équipement principal', () => {
    const tree = equipmentTree([eq(3, 1), eq(1, null), eq(2, null), eq(4, 99)])
    expect(tree.map((n) => n.item.id)).toEqual([1, 2, 4])
    expect(tree[0]!.children.map((c) => c.id)).toEqual([3])
  })

  it('écrit l\'emplacement d\'un équipement', () => {
    const site = { buildings: [{ id: 1, name: 'Bâtiment A', description: null, position: 0, levels: [{ id: 5, name: 'RDC', description: null, position: 0, rooms: [{ id: 9, name: 'Local technique', description: null, position: 0 }] }] }] }
    expect(placeLabel(site, 5, 9)).toBe('Bâtiment A › RDC › Local technique')
    expect(placeLabel(site, 5, null)).toBe('Bâtiment A › RDC')
    expect(placeLabel(site, null, null)).toBeNull()
  })

  it('compte les équipements par type', () => {
    expect(equipmentTotals([eq(1, null, { type: 'Caméra', quantity: 8 }), eq(2, null, { type: 'Caméra', quantity: 4 }), eq(3, null, { name: 'NVR' })]))
      .toEqual([{ label: 'Caméra', quantity: 12 }, { label: 'NVR', quantity: 1 }])
  })
})

describe('plans et quantitatifs', () => {
  it('calcule la position relative d\'un marqueur', () => {
    expect(relativePosition(150, 75, { left: 100, top: 50, width: 200, height: 100 })).toEqual({ x: 0.25, y: 0.25 })
    expect(relativePosition(500, 0, { left: 100, top: 50, width: 200, height: 100 })).toEqual({ x: 1, y: 0 })
  })
  it('additionne les lignes d\'un même article', () => {
    expect(quantityTotals([
      { article_id: 1, designation: 'Détecteur', unit: null, quantity: 4 },
      { article_id: 1, designation: 'Détecteur', unit: null, quantity: 2 },
      { article_id: null, designation: 'Câble', unit: 'm', quantity: 12.5 },
    ])).toEqual([{ designation: 'Détecteur', unit: null, quantity: 6 }, { designation: 'Câble', unit: 'm', quantity: 12.5 }])
  })
})

describe('éclater un groupe d’équipements', () => {
  it('garde les informations, retire le n° de série des copies et les place après l’original', async () => {
    const { splitEquipmentLocally } = await import('../src/site')
    const base = { name: 'Caméra', serial_number: 'SN', characteristics: [{ label: 'IP', value: '1' }], parent_id: null }
    const site = { systems: [{ id: 1, equipment: [{ ...base, id: 1, quantity: 3 }, { ...base, id: 2, name: 'NVR', quantity: 1 }] }] } as never
    const out = splitEquipmentLocally(site, 1, (i) => -i) as unknown as { systems: Array<{ equipment: Array<{ id: number; quantity: number; serial_number: string | null; name: string }> }> }
    expect(out.systems[0]!.equipment.map((e) => [e.id, e.name, e.quantity, e.serial_number])).toEqual([
      [1, 'Caméra', 1, 'SN'],
      [-1, 'Caméra', 1, null],
      [-2, 'Caméra', 1, null],
      [2, 'NVR', 1, 'SN'],
    ])
    expect(splitEquipmentLocally(out as never, 1, (i) => -10 - i)).toEqual(out)
  })
})
