import { describe, expect, it } from 'vitest'
import { angleFrom, clampSize, codeFontSize, groupLegend, layerKey, markerColor, normalizeAngle, planLayers, planLegend, planSymbol, visibleMarkers, PLAN_SYMBOLS } from '../src/planEditor.js'
import type { PlanIcon } from '../src/types.js'

const icon = (id: number, name: string, extra: Partial<PlanIcon> = {}): PlanIcon => ({ id, name, category: null, symbol: 'dot', color: null, file_path: null, mime: null, articles_count: null, updated_at: null, ...extra })

describe('éditeur de plans', () => {
  it('a des symboles uniques et un symbole par défaut', () => {
    expect(new Set(PLAN_SYMBOLS.map((s) => s.key)).size).toBe(PLAN_SYMBOLS.length)
    expect(planSymbol('inconnu').key).toBe('dot')
    expect(planSymbol('dome').label).toBe('Caméra dôme')
  })

  it('range les repères en calques par système et masque les calques choisis', () => {
    const markers = [{ layer_id: 2 }, { layer_id: 1 }, { layer_id: 2 }, { layer_id: null }, { layer_id: 9 }]
    const layers = planLayers(markers, [{ id: 1, name: 'Vidéo' }, { id: 2, name: 'Incendie' }, { id: 3, name: 'Vide' }], ['2'])
    expect(layers).toEqual([
      { key: '1', name: 'Vidéo', count: 1, hidden: false },
      { key: '2', name: 'Incendie', count: 2, hidden: true },
      { key: '9', name: 'Système retiré', count: 1, hidden: false },
      { key: 'none', name: 'Sans système', count: 1, hidden: false },
    ])
    expect(visibleMarkers(markers, ['2', 'none']).map(layerKey)).toEqual(['1', '9'])
  })

  it('fait la légende : une ligne par icône avec le nombre de repères', () => {
    const icons = [icon(1, 'Caméra dôme', { color: '#2563eb' }), icon(2, 'Sirène')]
    const legend = planLegend(
      [
        { icon_id: 1, color: null, label: null, equipment_id: 10 },
        { icon_id: 1, color: null, label: 'Hall', equipment_id: 11 },
        { icon_id: 2, color: '#16a34a', label: null, equipment_id: null },
        { icon_id: null, color: null, label: 'Regard', equipment_id: null },
      ],
      icons,
    )
    expect(legend.map((e) => [e.name, e.count, e.color])).toEqual([
      ['Caméra dôme', 2, '#2563eb'],
      ['Regard', 1, '#e11d48'],
      ['Sirène', 1, '#16a34a'],
    ])
    expect(markerColor({ color: null }, null)).toBe('#e11d48')
  })

  it('calcule les angles et borne les tailles', () => {
    expect(angleFrom(0, 0, 0, -10)).toBe(0)
    expect(angleFrom(0, 0, 10, 0)).toBe(90)
    expect(angleFrom(0, 0, -10, 0)).toBe(270)
    expect(angleFrom(0, 0, 10, 9, 15)).toBe(135)
    expect(normalizeAngle(-90)).toBe(270)
    expect(clampSize(1)).toBe(0.3)
    expect(clampSize(0)).toBe(0.005)
  })
})

describe('icônes à code et légende par catégorie', () => {
  it('écrit le code plus petit quand il est long, plus grand dans un rectangle', () => {
    expect(codeFontSize(null, 'dot')).toBe(0)
    expect(codeFontSize('DT', 'dot')).toBe(10)
    expect(codeFontSize('DOF', 'dot')).toBe(8.8)
    expect(codeFontSize('BAES', 'rect')).toBeGreaterThan(codeFontSize('BAES', 'dot'))
  })

  it('range la légende dans l\'ordre des catégories de la bibliothèque', () => {
    const icons = [icon(1, 'Caméra dôme', { category: 'Vidéosurveillance' }), icon(2, 'Détecteur optique de fumée', { category: 'Détection incendie' })]
    const groups = groupLegend(
      planLegend(
        [
          { icon_id: 1, color: null, label: null, equipment_id: null },
          { icon_id: 2, color: null, label: null, equipment_id: null },
          { icon_id: 2, color: null, label: null, equipment_id: null },
          { icon_id: null, color: null, label: 'Regard', equipment_id: null },
        ],
        icons,
      ),
    )
    expect(groups.map((g) => [g.category, g.count])).toEqual([
      ['Détection incendie', 2],
      ['Vidéosurveillance', 1],
      ['Autres repères', 1],
    ])
  })
})
