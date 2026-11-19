import type { BadgePayload } from './types.js'

/**
 * Import d'une liste de badges collée depuis un tableur (CSV, séparateur ; , ou tabulation).
 * La première ligne donne les colonnes : prénom, nom, fonction, service, direction, matricule,
 * adresse, validité (en français ou en anglais, accents et majuscules ignorés).
 */
const COLUMNS: Record<string, keyof BadgePayload> = {
  prenom: 'firstname', prenoms: 'firstname', firstname: 'firstname',
  nom: 'lastname', lastname: 'lastname',
  fonction: 'job_title', poste: 'job_title', job_title: 'job_title',
  service: 'department', department: 'department',
  direction: 'division', division: 'division',
  matricule: 'employee_number', employee_number: 'employee_number',
  adresse: 'address', address: 'address',
  validite: 'valid_until', valable: 'valid_until', valid_until: 'valid_until',
}

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, '_')

function splitLine(line: string, sep: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"'
        i++
      } else quoted = !quoted
    } else if (ch === sep && !quoted) {
      cells.push(cell)
      cell = ''
    } else cell += ch
  }
  cells.push(cell)
  return cells.map((c) => c.trim())
}

/** « 31/12/2027 » ou « 2027-12-31 » → « 2027-12-31 » ; sinon null. */
function isoDate(v: string): string | null {
  const fr = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v)
  if (fr) return `${fr[3]}-${fr[2]!.padStart(2, '0')}-${fr[1]!.padStart(2, '0')}`
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

export function parseBadgeList(text: string): { badges: BadgePayload[]; unknownColumns: string[] } {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim())
  if (!lines.length) return { badges: [], unknownColumns: [] }
  const header = lines[0]!
  const sep = header.includes('\t') ? '\t' : header.includes(';') ? ';' : ','
  const heads = splitLine(header, sep).map(plain)
  const keys = heads.map((h) => COLUMNS[h] ?? null)
  const unknownColumns = heads.filter((h, i) => h && !keys[i])
  const badges = lines.slice(1).map((line) => {
    const cells = splitLine(line, sep)
    const badge: BadgePayload = {}
    keys.forEach((key, i) => {
      const value = cells[i]?.trim()
      if (!key || !value) return
      if (key === 'valid_until') badge.valid_until = isoDate(value)
      else (badge as Record<string, string | null>)[key] = value
    })
    return badge
  }).filter((b) => b.firstname || b.lastname)
  return { badges, unknownColumns }
}
