import { describe, expect, it } from 'vitest'
import { EUR_XOF_RATE, importCostCfa } from '../src'

const params = { rates: { EUR: EUR_XOF_RATE, USD: 600 }, tax_rate: 20, shipping: 10000 }

describe('coût des articles achetés à l\'étranger', () => {
  it('convertit l\'euro à parité fixe, ajoute 20 % et 10 000 F de port', () => {
    // 100 × 655,957 × 1,2 + 10 000 = 88 714,84 → 88 715 (même résultat que l'API)
    expect(importCostCfa(100, 'EUR', params)).toBe(88715)
  })

  it('utilise le taux du dollar réglé dans les paramètres', () => {
    expect(importCostCfa(100, 'USD', params)).toBe(82000)
    expect(importCostCfa(50, 'USD', { ...params, rates: { ...params.rates, USD: 590 }, shipping: 15000 })).toBe(50400)
  })
})
