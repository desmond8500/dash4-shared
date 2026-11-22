import { describe, expect, it } from 'vitest'
import { groupLinesByCategory, quoteSiteCount, quoteSitePayload, quoteSitePlan, sortLinesByCategory } from '../src/quoteSite'
import type { Quote, QuoteLine, Site } from '../src/types'

const labels = { central: 'Centrale', device: 'Organe', cable: 'Câble', accessory: 'Accessoires', service: "Main-d'œuvre / forfait", other: 'Autre' } as const
const line = (id: number, category: keyof typeof labels, quantity = 1, position = id): QuoteLine =>
  ({ id, position, designation: `L${id}`, category: { value: category, label: labels[category] }, quantity }) as unknown as QuoteLine

const quote = {
  sections: [
    { id: 1, title: 'Vidéosurveillance', lines: [line(1, 'service'), line(2, 'cable', 50), line(3, 'device', 3), line(4, 'central')] },
    { id: 2, title: 'Détection incendie', lines: [line(5, 'device', 2.5)] },
    { id: 3, title: 'Prestations', lines: [line(6, 'service')] },
  ],
} as unknown as Quote

const site = {
  systems: [{ id: 10, name: 'VIDEOSURVEILLANCE', equipment: [{ quote_line_id: 3, quantity: 1 }, { quote_line_id: 4, quantity: 1 }] }],
} as unknown as Site

describe('lignes du devis par catégorie', () => {
  it('trie et regroupe : centrales, organes, accessoires, câbles, autres, main-d’œuvre', () => {
    const lines = [line(1, 'service'), line(2, 'cable'), line(3, 'device'), line(4, 'central'), line(5, 'device')]
    expect(sortLinesByCategory(lines).map((l) => l.id)).toEqual([4, 3, 5, 2, 1])
    expect(groupLinesByCategory(lines).map((g) => [g.label, g.lines.length])).toEqual([['Centrale', 1], ['Organe', 2], ['Câble', 1], ["Main-d'œuvre / forfait", 1]])
  })
})

describe('appareils du chantier depuis le devis', () => {
  it('propose le système du même nom et le reste à créer', () => {
    const plan = quoteSitePlan(quote, site)
    expect(plan.map((s) => [s.title, s.installedSystemId, s.systemName])).toEqual([
      ['Vidéosurveillance', 10, 'VIDEOSURVEILLANCE'],
      ['Détection incendie', null, 'Détection incendie'],
    ])
    expect(plan[0]!.lines.map((l) => [l.line.id, l.remaining, l.selected])).toEqual([
      [4, 0, false],
      [3, 2, true],
      [2, 50, false],
    ])
    expect(plan[1]!.lines[0]).toMatchObject({ remaining: 3, selected: true })
  })

  it('prépare l’envoi et compte les appareils', () => {
    const plan = quoteSitePlan(quote, site)
    expect(quoteSitePayload(plan, true)).toEqual({
      split: true,
      groups: [
        { installed_system_id: 10, system_name: null, line_ids: [3] },
        { installed_system_id: null, system_name: 'Détection incendie', line_ids: [5] },
      ],
    })
    expect(quoteSiteCount(plan, true)).toBe(5)
    expect(quoteSiteCount(plan, false)).toBe(2)
    // Deux sections vers le même nouveau système : un seul groupe
    plan[0]!.installedSystemId = null
    plan[0]!.systemName = 'détection incendie'
    expect(quoteSitePayload(plan, false).groups).toEqual([{ installed_system_id: null, system_name: 'détection incendie', line_ids: [3, 5] }])
  })
})
