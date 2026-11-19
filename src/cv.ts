import type { CvItem, CvSection, CvSectionType } from './types.js'

/** Élément vide d'une section. */
export function emptyCvItem(): CvItem {
  return { title: '', subtitle: null, place: null, start_date: null, end_date: null, current: false, description: null, level: null }
}

/** Les compétences et langues se notent de 1 à 5. */
export function cvSectionHasLevel(type: CvSectionType): boolean {
  return type === 'skills' || type === 'languages'
}

/** « 2020 – aujourd'hui », « 2018 – 2020 », « 2019 » ou ''. */
export function cvDateRange(item: Pick<CvItem, 'start_date' | 'end_date' | 'current'>): string {
  const start = item.start_date?.trim() || ''
  const end = item.current ? 'aujourd’hui' : item.end_date?.trim() || ''
  return start && end ? `${start} – ${end}` : start || end
}

/** Déplace une section ou un élément d'un cran (sans sortir de la liste). */
export function moveCvEntry<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list
  const next = [...list]
  const [entry] = next.splice(index, 1) as [T]
  next.splice(target, 0, entry)
  return next
}

/** Éléments sans intitulé retirés avant l'envoi (l'API exige un intitulé). */
export function cleanCvSections(sections: CvSection[]): CvSection[] {
  return sections
    .filter((s) => s.name.trim() !== '')
    .map((s) => ({ ...s, items: s.items.filter((i) => i.title.trim() !== '').map((i) => ({ ...i, level: cvSectionHasLevel(s.type) ? i.level : null })) }))
}
