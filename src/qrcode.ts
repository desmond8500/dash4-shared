/**
 * QR codes (ISO/IEC 18004) sans dépendance : texte encodé en octets UTF-8, version choisie au plus petit,
 * masque choisi selon les pénalités de la norme. D'après l'algorithme de référence de Project Nayuki (MIT).
 * Sert aux étiquettes de l'outillage (imprimées depuis le web, lues par l'application mobile).
 */

/** Niveau de correction d'erreurs : L 7 %, M 15 %, Q 25 %, H 30 % du code peut être abîmé. */
export type QrErrorLevel = 'L' | 'M' | 'Q' | 'H'

export interface QrCode {
  /** Version 1 à 40 (taille = version × 4 + 17 modules). */
  version: number
  size: number
  errorLevel: QrErrorLevel
  mask: number
  /** `modules[y][x]` : true = module noir. */
  modules: boolean[][]
}

const ECL_ORDINAL: Record<QrErrorLevel, number> = { L: 0, M: 1, Q: 2, H: 3 }
const ECL_FORMAT_BITS: Record<QrErrorLevel, number> = { L: 1, M: 0, Q: 3, H: 2 }

// prettier-ignore
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
]

// prettier-ignore
const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
]

const PENALTY_N1 = 3
const PENALTY_N2 = 3
const PENALTY_N3 = 40
const PENALTY_N4 = 10

function rawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    if (ver >= 7) result -= 36
  }
  return result
}

function dataCodewords(ver: number, ecl: QrErrorLevel): number {
  const e = ECL_ORDINAL[ecl]
  return Math.floor(rawDataModules(ver) / 8) - ECC_CODEWORDS_PER_BLOCK[e]![ver]! * NUM_ERROR_CORRECTION_BLOCKS[e]![ver]!
}

function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text))
}

// --- Reed-Solomon sur GF(2^8), polynôme 0x11D ------------------------------------------------

function gfMultiply(x: number, y: number): number {
  let z = 0
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d)
    z ^= ((y >>> i) & 1) * x
  }
  return z & 0xff
}

function rsDivisor(degree: number): number[] {
  const result: number[] = new Array(degree).fill(0)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMultiply(result[j]!, root)
      if (j + 1 < result.length) result[j] = result[j]! ^ result[j + 1]!
    }
    root = gfMultiply(root, 0x02)
  }
  return result
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result: number[] = divisor.map(() => 0)
  for (const b of data) {
    const factor = b ^ result.shift()!
    result.push(0)
    divisor.forEach((coef, i) => (result[i] = result[i]! ^ gfMultiply(coef, factor)))
  }
  return result
}

function addEccAndInterleave(data: number[], ver: number, ecl: QrErrorLevel): number[] {
  const e = ECL_ORDINAL[ecl]
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[e]![ver]!
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[e]![ver]!
  const rawCodewords = Math.floor(rawDataModules(ver) / 8)
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks)
  const shortBlockLen = Math.floor(rawCodewords / numBlocks)

  const blocks: number[][] = []
  const divisor = rsDivisor(blockEccLen)
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1))
    k += dat.length
    const ecc = rsRemainder(dat, divisor)
    if (i < numShortBlocks) dat.push(0)
    blocks.push(dat.concat(ecc))
  }

  const result: number[] = []
  for (let i = 0; i < blocks[0]!.length; i++) {
    blocks.forEach((block, j) => {
      // Les blocs courts n'ont pas d'octet de données à la place du bourrage ajouté
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]!)
    })
  }
  return result
}

// --- Construction de la matrice ---------------------------------------------------------------

class Matrix {
  readonly modules: boolean[][]
  readonly isFunction: boolean[][]

  constructor(readonly size: number) {
    this.modules = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
    this.isFunction = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  }

  setFunction(x: number, y: number, dark: boolean): void {
    this.modules[y]![x] = dark
    this.isFunction[y]![x] = true
  }
}

function alignmentPositions(ver: number): number[] {
  if (ver === 1) return []
  const numAlign = Math.floor(ver / 7) + 2
  const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2
  const result = [6]
  for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos)
  return result
}

function drawFormatBits(m: Matrix, ecl: QrErrorLevel, mask: number): void {
  const data = (ECL_FORMAT_BITS[ecl] << 3) | mask
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  const bits = ((data << 10) | rem) ^ 0x5412
  const bit = (i: number) => ((bits >>> i) & 1) !== 0

  for (let i = 0; i <= 5; i++) m.setFunction(8, i, bit(i))
  m.setFunction(8, 7, bit(6))
  m.setFunction(8, 8, bit(7))
  m.setFunction(7, 8, bit(8))
  for (let i = 9; i < 15; i++) m.setFunction(14 - i, 8, bit(i))

  for (let i = 0; i < 8; i++) m.setFunction(m.size - 1 - i, 8, bit(i))
  for (let i = 8; i < 15; i++) m.setFunction(8, m.size - 15 + i, bit(i))
  m.setFunction(8, m.size - 8, true)
}

function drawVersion(m: Matrix, ver: number): void {
  if (ver < 7) return
  let rem = ver
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25)
  const bits = (ver << 12) | rem
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) !== 0
    const a = m.size - 11 + (i % 3)
    const b = Math.floor(i / 3)
    m.setFunction(a, b, dark)
    m.setFunction(b, a, dark)
  }
}

function drawFunctionPatterns(m: Matrix, ver: number, ecl: QrErrorLevel): void {
  for (let i = 0; i < m.size; i++) {
    m.setFunction(6, i, i % 2 === 0)
    m.setFunction(i, 6, i % 2 === 0)
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        const x = cx + dx
        const y = cy + dy
        if (x >= 0 && x < m.size && y >= 0 && y < m.size) m.setFunction(x, y, dist !== 2 && dist !== 4)
      }
    }
  }
  finder(3, 3)
  finder(m.size - 4, 3)
  finder(3, m.size - 4)

  const positions = alignmentPositions(ver)
  const n = positions.length
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) m.setFunction(positions[i]! + dx, positions[j]! + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
      }
    }
  }

  drawFormatBits(m, ecl, 0) // réserve les emplacements ; réécrit avec le bon masque à la fin
  drawVersion(m, ver)
}

function drawCodewords(m: Matrix, data: number[]): void {
  let i = 0
  for (let right = m.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < m.size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? m.size - 1 - vert : vert
        if (!m.isFunction[y]![x] && i < data.length * 8) {
          m.modules[y]![x] = ((data[i >>> 3]! >>> (7 - (i & 7))) & 1) !== 0
          i++
        }
      }
    }
  }
}

function applyMask(m: Matrix, mask: number): void {
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      let invert: boolean
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break
        case 1: invert = y % 2 === 0; break
        case 2: invert = x % 3 === 0; break
        case 3: invert = (x + y) % 3 === 0; break
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break
        case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break
        case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break
        default: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
      }
      if (!m.isFunction[y]![x] && invert) m.modules[y]![x] = !m.modules[y]![x]
    }
  }
}

function finderPenaltyCountPatterns(history: number[]): number {
  const n = history[1]!
  const core = n > 0 && history[2] === n && history[3] === n * 3 && history[4] === n && history[5] === n
  return (core && history[0]! >= n * 4 && history[6]! >= n ? 1 : 0) + (core && history[6]! >= n * 4 && history[0]! >= n ? 1 : 0)
}

function finderPenaltyAddHistory(run: number, history: number[], size: number): void {
  if (history[0] === 0) run += size
  history.pop()
  history.unshift(run)
}

function finderPenaltyTerminate(color: boolean, run: number, history: number[], size: number): number {
  if (color) {
    finderPenaltyAddHistory(run, history, size)
    run = 0
  }
  run += size
  finderPenaltyAddHistory(run, history, size)
  return finderPenaltyCountPatterns(history)
}

function penaltyScore(m: Matrix): number {
  const size = m.size
  const mod = m.modules
  let result = 0
  for (const horizontal of [true, false]) {
    for (let a = 0; a < size; a++) {
      let color = false
      let run = 0
      const history = [0, 0, 0, 0, 0, 0, 0]
      for (let b = 0; b < size; b++) {
        const cell = horizontal ? mod[a]![b]! : mod[b]![a]!
        if (cell === color) {
          run++
          if (run === 5) result += PENALTY_N1
          else if (run > 5) result++
        } else {
          finderPenaltyAddHistory(run, history, size)
          if (!color) result += finderPenaltyCountPatterns(history) * PENALTY_N3
          color = cell
          run = 1
        }
      }
      result += finderPenaltyTerminate(color, run, history, size) * PENALTY_N3
    }
  }
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = mod[y]![x]
      if (c === mod[y]![x + 1] && c === mod[y + 1]![x] && c === mod[y + 1]![x + 1]) result += PENALTY_N2
    }
  }
  let dark = 0
  for (const row of mod) for (const c of row) if (c) dark++
  const total = size * size
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1
  return result + k * PENALTY_N4
}

/**
 * Encode un texte en QR code. La plus petite version qui convient est choisie ; le niveau de correction
 * est relevé s'il tient dans la même version. Erreur si le texte est trop long (plus de 2 953 octets en L).
 */
export function encodeQr(text: string, errorLevel: QrErrorLevel = 'M'): QrCode {
  const bytes = utf8(text)
  let ver = 1
  let bitsNeeded = 0
  for (; ; ver++) {
    if (ver > 40) throw new Error('Texte trop long pour un QR code.')
    bitsNeeded = 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8
    if (bitsNeeded <= dataCodewords(ver, errorLevel) * 8) break
  }
  let ecl = errorLevel
  for (const better of ['M', 'Q', 'H'] as const) {
    if (ECL_ORDINAL[better] > ECL_ORDINAL[ecl] && bitsNeeded <= dataCodewords(ver, better) * 8) ecl = better
  }

  // Flux de bits : mode octet (0100), longueur, données, fin, bourrage
  const bits: number[] = []
  const append = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }
  append(0b0100, 4)
  append(bytes.length, ver <= 9 ? 8 : 16)
  bytes.forEach((b) => append(b, 8))
  const capacity = dataCodewords(ver, ecl) * 8
  append(0, Math.min(4, capacity - bits.length))
  append(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < capacity; pad ^= 0xec ^ 0x11) append(pad, 8)
  const data: number[] = []
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((acc, b) => (acc << 1) | b, 0))

  const size = ver * 4 + 17
  const m = new Matrix(size)
  drawFunctionPatterns(m, ver, ecl)
  drawCodewords(m, addEccAndInterleave(data, ver, ecl))

  let bestMask = 0
  let minPenalty = Infinity
  for (let mask = 0; mask < 8; mask++) {
    applyMask(m, mask)
    drawFormatBits(m, ecl, mask)
    const penalty = penaltyScore(m)
    if (penalty < minPenalty) {
      bestMask = mask
      minPenalty = penalty
    }
    applyMask(m, mask) // le masque s'annule en le réappliquant
  }
  applyMask(m, bestMask)
  drawFormatBits(m, ecl, bestMask)

  return { version: ver, size, errorLevel: ecl, mask: bestMask, modules: m.modules.map((row) => [...row]) }
}

/**
 * QR code en SVG (un seul tracé, net à toutes les tailles et à l'impression), avec une marge blanche
 * de `margin` modules (4 recommandés par la norme).
 */
export function qrSvg(text: string, options: { errorLevel?: QrErrorLevel; margin?: number; color?: string; title?: string } = {}): string {
  const qr = encodeQr(text, options.errorLevel ?? 'M')
  const margin = options.margin ?? 4
  const dim = qr.size + margin * 2
  let path = ''
  qr.modules.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (dark) path += `M${x + margin},${y + margin}h1v1h-1z`
    })
  })
  const title = options.title ? `<title>${options.title.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)}</title>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">${title}` +
    `<rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="${options.color ?? '#000'}"/></svg>`
  )
}

// --- Codes de l'outillage ----------------------------------------------------------------------

/**
 * Contenu du QR code d'un outil : l'adresse de sa fiche sur le web (`…/stock/outillage/12`), pour qu'un
 * téléphone sans l'application ouvre aussi la bonne page. Sans adresse du site : `DASH4-OUTIL-12`.
 */
export function toolQrContent(toolId: number, webOrigin?: string | null): string {
  return webOrigin ? `${webOrigin.replace(/\/+$/, '')}/stock/outillage/${toolId}` : `DASH4-OUTIL-${toolId}`
}

/** Identifiant de l'outil lu dans un QR code (adresse de sa fiche ou `DASH4-OUTIL-12`), sinon null. */
export function toolIdFromQr(content: string): number | null {
  const match = /\/stock\/outillage\/(\d+)(?:[/?#]|$)/.exec(content.trim()) ?? /^DASH4-OUTIL-(\d+)$/i.exec(content.trim())
  const id = match ? Number(match[1]) : NaN
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
