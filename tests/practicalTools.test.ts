import { describe, expect, it, vi } from 'vitest'
import { GALAXY_DIMENSION_MAX_LENGTH, PRACTICAL_TOOLS, createApiClient, galaxyDimensionText, practicalTool } from '../src'

describe('outils pratiques', () => {
  it('connaît le convertisseur Galaxy Dimension', () => {
    expect(PRACTICAL_TOOLS.map((t) => t.slug)).toContain('galaxy-dimension-text')
    expect(practicalTool('galaxy-dimension-text')?.name).toBe('Texte pour centrale Galaxy Dimension')
    expect(practicalTool('inconnu')).toBeUndefined()
  })

  it('convertit un texte en codes du clavier (table de l\'outil d\'origine)', () => {
    const r = galaxyDimensionText('Zone 1')
    expect(r.codes).toEqual(['45', '31', '28', '18', '10', '01'])
    expect(r.unknown).toEqual([])
    expect(r.tooLong).toBe(false)
    expect(galaxyDimensionText('Entrée à 0h').codes).toEqual(['18', '28', '37', '35', '18', '18', '10', '13', '10', '00', '22'])
  })

  it('remplace les accents absents de la table et signale les caractères inconnus', () => {
    const r = galaxyDimensionText('Fenêtre-Ç!')
    expect(r.chars.find((c) => c.char === 'ê')).toEqual({ char: 'ê', code: '18', approximated: true })
    expect(r.chars.find((c) => c.char === 'ç')?.code).toBe('16')
    expect(r.unknown).toEqual(['-', '!'])
    expect(r.codes).toHaveLength(8)
  })

  it('prévient au-delà de la longueur gardée par la centrale', () => {
    expect(galaxyDimensionText('x'.repeat(GALAXY_DIMENSION_MAX_LENGTH)).tooLong).toBe(false)
    expect(galaxyDimensionText('x'.repeat(GALAXY_DIMENSION_MAX_LENGTH + 1)).tooLong).toBe(true)
  })

  it('lie les outils aux marques, fournisseurs et articles par l\'API', async () => {
    const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    let token: string | null = 't'
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: { get: () => token, set: (t: string | null) => void (token = t) }, fetch })

    await api.practicalTools.list()
    await api.practicalTools.forRecord('articles', 5)
    await api.practicalTools.link('galaxy-dimension-text', 'brands', 3)
    await api.practicalTools.unlink(9)

    expect(fetch.mock.calls.map((c) => `${c[1]?.method} ${c[0]}`)).toEqual([
      'GET https://api.test/api/v1/practical-tools',
      'GET https://api.test/api/v1/practical-tools/for/articles/5',
      'POST https://api.test/api/v1/practical-tools/galaxy-dimension-text/links',
      'DELETE https://api.test/api/v1/practical-tool-links/9',
    ])
  })
})
