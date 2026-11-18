import { describe, expect, it } from 'vitest'
import { computeTotals, formatDocumentNumber, formatMoney } from '../src/money'

const rates = { vat_rate: 18, brs_rate: 5 }

describe('totaux', () => {
  it('ajoute la TVA au hors taxes', () => {
    expect(computeTotals(1_000_000, 'vat', rates)).toEqual({ subtotal: 1_000_000, taxMode: 'vat', rate: 18, tax: 180_000, total: 1_180_000 })
  })

  it('déduit la BRS du total (entreprise individuelle)', () => {
    expect(computeTotals(1_000_000, 'brs', rates)).toMatchObject({ tax: 50_000, total: 950_000 })
  })

  it('ne touche à rien sans taxe, et arrondit au franc', () => {
    expect(computeTotals(1_000_000, 'none', rates).total).toBe(1_000_000)
    expect(computeTotals(333_333, 'vat', rates).tax).toBe(60_000)
  })
})

describe('affichage', () => {
  it('affiche les francs CFA sans décimales', () => {
    expect(formatMoney(1_250_000)).toBe('1 250 000 F CFA')
    expect(formatMoney(0)).toBe('0 F CFA')
    expect(formatMoney(1234.5, 'EUR')).toBe('1 234,50 €')
  })

  it('numérote comme l\'API', () => {
    const d = new Date(2026, 2, 5)
    expect(formatDocumentNumber('DEV-{YYYY}-{####}', 1, d)).toBe('DEV-2026-0001')
    expect(formatDocumentNumber('D{YY}{MM}-{###}', 7, d)).toBe('D2603-007')
  })
})
