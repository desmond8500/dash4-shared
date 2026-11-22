import type { Quote, QuoteLine, QuoteLineCategory, Site } from './types.js'

/** Catégories transformées par défaut en appareils du chantier. */
export const QUOTE_SITE_DEFAULT_CATEGORIES: QuoteLineCategory[] = ['central', 'device']

/** Ordre des catégories pour trier les lignes d'un devis : matériel d'abord, main-d'œuvre à la fin. */
export const QUOTE_LINE_CATEGORY_ORDER: QuoteLineCategory[] = ['central', 'device', 'accessory', 'cable', 'other', 'service']

/** Lignes triées par catégorie, puis dans l'ordre du devis. */
export function sortLinesByCategory<T extends Pick<QuoteLine, 'category' | 'position'>>(lines: T[]): T[] {
  const rank = (c: QuoteLineCategory) => {
    const i = QUOTE_LINE_CATEGORY_ORDER.indexOf(c)
    return i < 0 ? QUOTE_LINE_CATEGORY_ORDER.length : i
  }
  return lines
    .map((line, index) => ({ line, index }))
    .sort((a, b) => rank(a.line.category.value) - rank(b.line.category.value) || a.line.position - b.line.position || a.index - b.index)
    .map((x) => x.line)
}

/** Lignes regroupées par catégorie, dans l'ordre des catégories (groupes vides omis). */
export function groupLinesByCategory<T extends Pick<QuoteLine, 'category' | 'position'>>(lines: T[]): Array<{ category: QuoteLineCategory; label: string; lines: T[] }> {
  const groups: Array<{ category: QuoteLineCategory; label: string; lines: T[] }> = []
  for (const line of sortLinesByCategory(lines)) {
    const last = groups[groups.length - 1]
    if (last && last.category === line.category.value) last.lines.push(line)
    else groups.push({ category: line.category.value, label: line.category.label, lines: [line] })
  }
  return groups
}

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Quantités déjà créées sur le chantier, par ligne du devis. */
export function createdFromQuoteLines(site: Pick<Site, 'systems'> | null): Map<number, number> {
  const done = new Map<number, number>()
  for (const s of site?.systems ?? []) {
    for (const e of s.equipment ?? []) {
      if (e.quote_line_id) done.set(e.quote_line_id, (done.get(e.quote_line_id) ?? 0) + e.quantity)
    }
  }
  return done
}

export interface QuoteSiteLine {
  line: QuoteLine
  /** Unités restant à créer (quantité du devis arrondie au-dessus, moins le déjà créé). */
  remaining: number
  selected: boolean
}

export interface QuoteSiteSection {
  sectionId: number
  title: string
  /** Système existant du chantier, sinon `null` : un système est créé avec `systemName`. */
  installedSystemId: number | null
  systemName: string
  lines: QuoteSiteLine[]
}

/**
 * Proposition de conversion : une entrée par section ayant du matériel, avec le système du chantier
 * dont le nom correspond au titre de la section (sinon un nouveau système à ce nom).
 * Les centrales et organes restant à créer sont cochés ; câbles, accessoires et autres peuvent l'être ;
 * la main-d'œuvre n'est pas proposée.
 */
export function quoteSitePlan(quote: Pick<Quote, 'sections'>, site: Pick<Site, 'systems'> | null): QuoteSiteSection[] {
  const done = createdFromQuoteLines(site)
  const systems = site?.systems ?? []
  return (quote.sections ?? [])
    .map((section) => {
      const title = section.title?.trim() || 'Système'
      const key = norm(title)
      const match = systems.find((s) => norm(s.name) === key) ?? systems.find((s) => key && (norm(s.name).includes(key) || key.includes(norm(s.name))))
      const lines = sortLinesByCategory(section.lines.filter((l) => l.category.value !== 'service')).map((line) => {
        const remaining = Math.max(0, Math.ceil(line.quantity) - (done.get(line.id) ?? 0))
        return { line, remaining, selected: remaining > 0 && QUOTE_SITE_DEFAULT_CATEGORIES.includes(line.category.value) }
      })
      return { sectionId: section.id, title, installedSystemId: match?.id ?? null, systemName: match?.name ?? title, lines }
    })
    .filter((s) => s.lines.length)
}

export interface QuoteSitePayload {
  split: boolean
  groups: Array<{ installed_system_id: number | null; system_name: string | null; line_ids: number[] }>
}

/** Envoi : les lignes cochées qui restent à créer, regroupées par système cible. */
export function quoteSitePayload(plan: QuoteSiteSection[], split: boolean): QuoteSitePayload {
  const groups: QuoteSitePayload['groups'] = []
  for (const section of plan) {
    const ids = section.lines.filter((l) => l.selected && l.remaining > 0).map((l) => l.line.id)
    if (!ids.length) continue
    const name = section.systemName.trim() || section.title
    const same = groups.find((g) => (section.installedSystemId ? g.installed_system_id === section.installedSystemId : !g.installed_system_id && norm(g.system_name ?? '') === norm(name)))
    if (same) same.line_ids.push(...ids)
    else groups.push({ installed_system_id: section.installedSystemId, system_name: section.installedSystemId ? null : name, line_ids: ids })
  }
  return { split, groups }
}

/** Nombre d'appareils qui seront créés. */
export function quoteSiteCount(plan: QuoteSiteSection[], split: boolean): number {
  return plan.flatMap((s) => s.lines).filter((l) => l.selected && l.remaining > 0).reduce((n, l) => n + (split ? l.remaining : 1), 0)
}
