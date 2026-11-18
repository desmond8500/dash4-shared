import type { Currency, TaxMode } from './types.js'

export interface Totals {
  subtotal: number
  taxMode: TaxMode
  rate: number
  tax: number
  total: number
}

/**
 * Totaux d'un document (même règle que l'API et que Dash3) :
 * TVA ajoutée au hors taxes, BRS déduite, ou sans taxe. Arrondi à l'unité (franc CFA).
 */
export function computeTotals(
  subtotal: number,
  taxMode: TaxMode,
  rates: { vat_rate: number; brs_rate: number },
): Totals {
  const base = Math.round(subtotal)
  const rate = taxMode === 'vat' ? rates.vat_rate : taxMode === 'brs' ? rates.brs_rate : 0
  const tax = Math.round((base * rate) / 100)
  return { subtotal: base, taxMode, rate, tax, total: taxMode === 'brs' ? base - tax : base + tax }
}

const SYMBOLS: Record<Currency, string> = { XOF: 'F CFA', EUR: '€', USD: '$' }

/** « 1 250 000 F CFA » (sans décimales pour le franc CFA). */
export function formatMoney(amount: number, currency: Currency = 'XOF'): string {
  const decimals = currency === 'XOF' ? 0 : 2
  const value = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(amount)
    // Espaces insécables fines → espaces simples, plus lisibles dans les PDF et les copier-coller
    .replace(/[  ]/g, ' ')
  return `${value} ${SYMBOLS[currency]}`
}

/** Aperçu d'un format de numérotation, comme l'API : DEV-{YYYY}-{####} → DEV-2026-0001. */
export function formatDocumentNumber(format: string, number: number, date: Date = new Date()): string {
  const yyyy = String(date.getFullYear())
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return format
    .replace(/\{(#+)\}/g, (_, hashes: string) => String(number).padStart(hashes.length, '0'))
    .replace(/\{YYYY\}/g, yyyy)
    .replace(/\{YY\}/g, yyyy.slice(2))
    .replace(/\{MM\}/g, mm)
}
