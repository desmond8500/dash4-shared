import type { ForeignCurrency, ImportCostParameters } from './types.js'

/** Parité fixe : 1 € = 655,957 F CFA. */
export const EUR_XOF_RATE = 655.957

/**
 * Coût d'achat en F CFA d'un article acheté à l'étranger, comme le calcule l'API :
 * prix × taux, plus la taxe (%), plus les frais de port, arrondi au franc.
 */
export function importCostCfa(price: number, currency: ForeignCurrency, params: ImportCostParameters): number {
  const rate = currency === 'EUR' ? EUR_XOF_RATE : params.rates[currency]
  return Math.round(price * rate * (1 + params.tax_rate / 100) + params.shipping)
}
