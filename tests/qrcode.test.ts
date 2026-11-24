import { describe, expect, it } from 'vitest'
import { encodeQr, qrSvg, toolIdFromQr, toolQrContent } from '../src/qrcode.js'

// Le décodage des QR codes produits a été vérifié avec OpenCV (versions 1 à 36, niveaux L à H).
describe('QR codes', () => {
  it('choisit la plus petite version et relève la correction quand elle tient', () => {
    const qr = encodeQr('DASH4-OUTIL-1')
    expect(qr.version).toBe(1)
    expect(qr.size).toBe(21)
    expect(qr.errorLevel).toBe('M')
    const url = encodeQr('https://dash4.yonkou.info/stock/outillage/123456')
    expect(url.version).toBe(4)
    expect(url.modules).toHaveLength(33)
  })

  it('dessine les trois repères de position', () => {
    const { modules: m, size } = encodeQr('test')
    for (const [x, y] of [[0, 0], [size - 7, 0], [0, size - 7]] as const) {
      expect(m[y]![x]).toBe(true)
      expect(m[y + 1]![x + 1]).toBe(false)
      expect(m[y + 3]![x + 3]).toBe(true)
    }
    // Module noir fixe à côté du repère du bas
    expect(m[size - 8]![8]).toBe(true)
  })

  it('refuse un texte trop long', () => {
    expect(() => encodeQr('x'.repeat(3000), 'L')).toThrow('trop long')
  })

  it('produit un SVG autonome', () => {
    const svg = qrSvg('OUT-1', { title: 'Perceuse <OUT-1>' })
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 29"')).toBe(true)
    expect(svg).toContain('<title>Perceuse &#60;OUT-1&#62;</title>')
  })

  it('lit le numéro d’un outil dans son QR code', () => {
    expect(toolQrContent(12, 'https://dash4.yonkou.info/')).toBe('https://dash4.yonkou.info/stock/outillage/12')
    expect(toolQrContent(12)).toBe('DASH4-OUTIL-12')
    expect(toolIdFromQr('https://dash4.yonkou.info/stock/outillage/12')).toBe(12)
    expect(toolIdFromQr('https://dash4web.netlify.app/stock/outillage/7?onglet=prets')).toBe(7)
    expect(toolIdFromQr('dash4-outil-3')).toBe(3)
    expect(toolIdFromQr('https://exemple.com/stock/outillage/12abc')).toBeNull()
    expect(toolIdFromQr('3017620422003')).toBeNull()
  })
})
