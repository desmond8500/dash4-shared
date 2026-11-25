/**
 * Outils pratiques : calculs et conversions faits dans le web et le mobile (hors ligne compris).
 * Un nouvel outil s'ajoute ici et dans `config/dash4.php` (practical_tools) de l'API, avec le même code.
 */

export interface PracticalToolDefinition {
  /** Code de l'outil, le même que dans l'API. */
  slug: string
  name: string
  description: string
  /** Nom d'icône PrimeIcons (web) ; le mobile choisit la sienne. */
  icon: string
}

export const PRACTICAL_TOOLS: PracticalToolDefinition[] = [
  {
    slug: 'galaxy-dimension-text',
    name: 'Texte pour centrale Galaxy Dimension',
    description: 'Convertit un texte (nom de zone, de groupe, message) en codes à saisir au clavier de la centrale.',
    icon: 'pi pi-language',
  },
]

export const practicalTool = (slug: string) => PRACTICAL_TOOLS.find((t) => t.slug === slug)

/* ---- Galaxy Dimension : texte → codes du clavier ---- */

/** Table de la centrale : lettre (en minuscule) → code à deux chiffres. */
export const GALAXY_DIMENSION_CODES: Record<string, string> = {
  a: '13', à: '13', b: '15', c: '16', d: '17', e: '18', é: '18', è: '18', f: '19', g: '20', h: '22', i: '23', j: '24',
  k: '25', l: '26', m: '27', n: '28', o: '31', p: '33', q: '34', r: '35', s: '36', t: '37', u: '38', v: '40', w: '41',
  x: '42', y: '44', z: '45', ' ': '10',
  '0': '00', '1': '01', '2': '02', '3': '03', '4': '04', '5': '05', '6': '06', '7': '07', '8': '08', '9': '09',
}

/** Longueur au-delà de laquelle la centrale coupe le texte (nom de zone ou de groupe). */
export const GALAXY_DIMENSION_MAX_LENGTH = 16

export interface GalaxyChar {
  char: string
  /** Code à saisir, ou null si le caractère n'existe pas sur la centrale. */
  code: string | null
  /** Lettre accentuée absente de la table, remplacée par la lettre sans accent (ê → e). */
  approximated: boolean
}

export interface GalaxyResult {
  chars: GalaxyChar[]
  /** Codes dans l'ordre, sans les caractères inconnus. */
  codes: string[]
  /** Caractères sans code (ignorés dans `codes`), sans doublon. */
  unknown: string[]
  /** Plus long que ce que la centrale garde. */
  tooLong: boolean
}

/** Convertit un texte en codes du clavier Galaxy Dimension (même table que l'outil d'origine). */
export function galaxyDimensionText(text: string): GalaxyResult {
  const chars: GalaxyChar[] = Array.from(text.toLowerCase()).map((char) => {
    const direct = GALAXY_DIMENSION_CODES[char]
    if (direct) return { char, code: direct, approximated: false }
    const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const fallback = base !== char ? GALAXY_DIMENSION_CODES[base] : undefined
    return fallback ? { char, code: fallback, approximated: true } : { char, code: null, approximated: false }
  })
  return {
    chars,
    codes: chars.flatMap((c) => (c.code ? [c.code] : [])),
    unknown: [...new Set(chars.filter((c) => !c.code).map((c) => c.char))],
    tooLong: Array.from(text).length > GALAXY_DIMENSION_MAX_LENGTH,
  }
}
