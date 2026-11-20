import { describe, expect, it } from 'vitest'
import { cleanCvSections, cvDateRange, cvSectionHasLevel, emptyCvItem, moveCvEntry } from '../src/cv.js'

describe('CV', () => {
  it('formate les dates', () => {
    expect(cvDateRange({ start_date: '2020', end_date: null, current: true })).toBe('2020 – aujourd’hui')
    expect(cvDateRange({ start_date: '2018', end_date: '2020', current: false })).toBe('2018 – 2020')
    expect(cvDateRange({ start_date: '2019', end_date: '', current: false })).toBe('2019')
    expect(cvDateRange({ start_date: null, end_date: null, current: false })).toBe('')
  })

  it('déplace sans sortir de la liste', () => {
    expect(moveCvEntry(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c'])
    expect(moveCvEntry(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(moveCvEntry(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })

  it('nettoie avant envoi', () => {
    const cleaned = cleanCvSections([
      { name: 'Expériences', type: 'experience', items: [{ ...emptyCvItem(), title: 'Chef', level: 3 }, emptyCvItem()] },
      { name: 'Langues', type: 'languages', items: [{ ...emptyCvItem(), title: 'Anglais', level: 4 }] },
      { name: ' ', type: 'free', items: [] },
    ])
    expect(cleaned).toHaveLength(2)
    expect(cleaned[0]!.items).toHaveLength(1)
    expect(cleaned[0]!.items[0]!.level).toBeNull()
    expect(cleaned[1]!.items[0]!.level).toBe(4)
    expect(cvSectionHasLevel('skills')).toBe(true)
  })
})

describe('préférences', () => {
  it('applique le thème sombre selon le choix ou l’appareil', async () => {
    const { isDarkTheme } = await import('../src/types.js')
    expect(isDarkTheme('dark', false)).toBe(true)
    expect(isDarkTheme('light', true)).toBe(false)
    expect(isDarkTheme('system', true)).toBe(true)
    expect(isDarkTheme(undefined, false)).toBe(false)
  })
})
