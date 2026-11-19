/**
 * Mentions @nom dans un commentaire : recherche de la personne pendant la saisie,
 * insertion du nom, et liste des personnes encore citées dans le texte au moment de l'envoi.
 */

export interface MentionPerson {
  id: number
  full_name: string
}

const plainText = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Mot en cours après un « @ » juste avant le curseur, ou null. */
export function mentionQuery(text: string, cursor: number): { start: number; query: string } | null {
  const before = text.slice(0, cursor)
  const match = /(^|\s)@([\p{L}\p{N}' -]{0,30})$/u.exec(before)
  if (!match) return null
  const query = match[2] ?? ''
  // Au-delà de deux mots, ce n'est plus une mention en cours
  if (query.split(' ').length > 3) return null
  return { start: before.length - query.length - 1, query }
}

/** Personnes dont le nom (prénom ou nom) commence par ce qui est tapé, sans tenir compte des accents. */
export function filterMentionable<T extends MentionPerson>(people: T[], query: string, limit = 6): T[] {
  const q = plainText(query.trim())
  return people
    .filter((p) => {
      const name = plainText(p.full_name)
      return !q || name.startsWith(q) || name.split(' ').some((part) => part.startsWith(q))
    })
    .slice(0, limit)
}

/** Remplace « @mot » par « @Prénom Nom » ; renvoie le texte et la position du curseur après le nom. */
export function insertMention(text: string, start: number, cursor: number, person: MentionPerson): { text: string; cursor: number } {
  const inserted = `@${person.full_name} `
  return { text: text.slice(0, start) + inserted + text.slice(cursor), cursor: start + inserted.length }
}

/** Ids des personnes choisies dont « @Prénom Nom » est encore dans le texte. */
export function mentionedIds(text: string, people: MentionPerson[]): number[] {
  return [...new Set(people.filter((p) => text.includes(`@${p.full_name}`)).map((p) => p.id))]
}

/** Découpe le texte pour l'affichage : morceaux simples et mentions (à mettre en valeur). */
export function splitMentions(text: string, people: MentionPerson[]): Array<{ text: string; mention?: number }> {
  const names = [...people].sort((a, b) => b.full_name.length - a.full_name.length)
  const parts: Array<{ text: string; mention?: number }> = []
  let rest = text
  while (rest) {
    let best: { index: number; person: MentionPerson } | null = null
    for (const p of names) {
      const index = rest.indexOf(`@${p.full_name}`)
      if (index >= 0 && (!best || index < best.index)) best = { index, person: p }
    }
    if (!best) {
      parts.push({ text: rest })
      break
    }
    if (best.index > 0) parts.push({ text: rest.slice(0, best.index) })
    parts.push({ text: `@${best.person.full_name}`, mention: best.person.id })
    rest = rest.slice(best.index + best.person.full_name.length + 1)
  }
  return parts
}
