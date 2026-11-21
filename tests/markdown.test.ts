import { describe, expect, it } from 'vitest'
import { applyMarkdown, markdownToText, renderMarkdown } from '../src/markdown.js'

describe('renderMarkdown', () => {
  it('rend la mise en forme courante', () => {
    expect(renderMarkdown('## Travaux\n**Pose** de *2* caméras ~~dôme~~')).toBe('<h2>Travaux</h2><p><strong>Pose</strong> de <em>2</em> caméras <del>dôme</del></p>')
    expect(renderMarkdown('- câble\n- coffret\n\n1. tirer\n2. raccorder')).toBe('<ul><li>câble</li><li>coffret</li></ul><ol><li>tirer</li><li>raccorder</li></ol>')
    expect(renderMarkdown('ligne 1\nligne 2\n\nparagraphe')).toBe('<p>ligne 1<br>ligne 2</p><p>paragraphe</p>')
    expect(renderMarkdown('> à vérifier\n---\n- [x] fait\n- [ ] à faire')).toContain('<blockquote>à vérifier</blockquote><hr><ul><li class="md-task"><input type="checkbox" disabled checked> fait</li>')
    expect(renderMarkdown('code `**pas gras**`')).toBe('<p>code <code>**pas gras**</code></p>')
  })

  it('n\'exécute jamais le HTML saisi et refuse les liens dangereux', () => {
    expect(renderMarkdown('<script>alert(1)</script><img src=x onerror=alert(1)>')).not.toMatch(/<script|<img/)
    expect(renderMarkdown('[clic](javascript:alert(1))')).not.toContain('href="javascript')
    expect(renderMarkdown('[site](https://dash4.sn/a?b=1&c=2)')).toContain('href="https://dash4.sn/a?b=1&amp;c=2"')
    expect(renderMarkdown('"><b>x</b>')).toBe('<p>&quot;&gt;&lt;b&gt;x&lt;/b&gt;</p>')
  })

  it('relie les adresses web et e-mail nues, sans casser les noms_avec_tirets', () => {
    expect(renderMarkdown('voir https://exemple.sn/page.')).toBe('<p>voir <a href="https://exemple.sn/page" target="_blank" rel="noopener noreferrer">https://exemple.sn/page</a>.</p>')
    expect(renderMarkdown('écrire à compta@client.sn')).toContain('href="mailto:compta@client.sn"')
    expect(renderMarkdown('fichier plan_rdc_v2.pdf')).toBe('<p>fichier plan_rdc_v2.pdf</p>')
    expect(renderMarkdown('  ')).toBe('')
  })
})

describe('markdownToText', () => {
  it('retire la syntaxe', () => {
    expect(markdownToText('## Titre\n**gras** et [lien](https://x.sn)\n- un')).toBe('Titre\ngras et lien\n• un')
  })
})

describe('applyMarkdown', () => {
  it('met en gras la sélection, ou insère un exemple', () => {
    expect(applyMarkdown('poser câble', 6, 11, 'bold')).toEqual({ text: 'poser **câble**', start: 8, end: 13 })
    expect(applyMarkdown('', 0, 0, 'italic').text).toBe('*texte en italique*')
  })
  it('transforme des lignes en liste et revient en arrière', () => {
    const list = applyMarkdown('câble\ncoffret', 0, 13, 'ul')
    expect(list.text).toBe('- câble\n- coffret')
    expect(applyMarkdown(list.text, 0, list.text.length, 'ul').text).toBe('câble\ncoffret')
    expect(applyMarkdown('a\nb', 0, 3, 'ol').text).toBe('1. a\n2. b')
  })
})

describe('renderMarkdown avec mentions', () => {
  it('met en valeur les personnes citées', () => {
    expect(renderMarkdown('Merci @Awa Diop et **@Awa**', { mentions: ['Awa Diop', 'Awa'] })).toBe(
      '<p>Merci <span class="mention">@Awa Diop</span> et <strong><span class="mention">@Awa</span></strong></p>',
    )
  })
})
