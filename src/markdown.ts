/**
 * Markdown simple et sûr pour les zones de texte de Dash4 : tout le HTML saisi est échappé, puis seule
 * une petite syntaxe est reconnue — titres (#, ##, ###), **gras**, *italique*, ~~barré~~, `code`,
 * listes (- ou 1.), cases [ ] / [x], citations (>), séparateur (---), liens [texte](https://…)
 * et adresses web ou e-mail nues. Les retours à la ligne simples sont gardés.
 */

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

/** Seuls http(s) et mailto sont acceptés dans un lien. */
function safeUrl(url: string): string | null {
  const u = url.trim()
  return /^(https?:\/\/|mailto:)/i.test(u) ? u : null
}

function inline(text: string, mentions: string[] = []): string {
  // Code en premier : son contenu n'est plus interprété
  const codes: string[] = []
  let s = escapeHtml(text).replace(/`([^`]+)`/g, (_, c: string) => {
    codes.push(`<code>${c}</code>`)
    return `\u0000${codes.length - 1}\u0000`
  })
  const links: string[] = []
  const keep = (html: string) => {
    links.push(html)
    return `\u0001${links.length - 1}\u0001`
  }
  // Mentions « @Prénom Nom » (les noms les plus longs d'abord)
  for (const name of [...mentions].sort((a, b) => b.length - a.length)) {
    const tag = `@${escapeHtml(name)}`
    s = s.split(tag).join(keep(`<span class="mention">${tag}</span>`))
  }
  // [texte](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
    const href = safeUrl(url.replace(/&amp;/g, '&'))
    return href ? keep(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a>`) : m
  })
  // Adresses nues
  s = s.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => keep(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`))
  s = s.replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, (mail) => keep(`<a href="mailto:${mail}">${mail}</a>`))
  s = s
    .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
    .replace(/__(?=\S)([\s\S]*?\S)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_\w])_(?=\S)([^_]*?\S)_(?![_\w])/g, '$1<em>$2</em>')
    .replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>')
  return s.replace(/\u0001(\d+)\u0001/g, (_, i: string) => links[Number(i)]!).replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)]!)
}

type Block = { kind: 'p' | 'h1' | 'h2' | 'h3' | 'quote' | 'ul' | 'ol' | 'hr'; lines: string[] }

/** Texte Markdown → HTML sûr (à afficher avec v-html). Texte vide → ''. */
export interface MarkdownOptions {
  /** Noms complets cités (« @Prénom Nom ») à mettre en valeur. */
  mentions?: string[]
}

export function renderMarkdown(text: string | null | undefined, options: MarkdownOptions = {}): string {
  const mentions = options.mentions ?? []
  const inl = (t: string) => inline(t, mentions)
  if (!text || !text.trim()) return ''
  const blocks: Block[] = []
  const state: { current: Block | null } = { current: null }
  const push = (kind: Block['kind'], line: string) => {
    const cur = state.current
    if (cur && cur.kind === kind && kind !== 'hr' && !kind.startsWith('h')) {
      cur.lines.push(line)
    } else {
      state.current = { kind, lines: [line] }
      blocks.push(state.current)
    }
  }
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/\s+$/, '')
    let m: RegExpMatchArray | null
    const current = state.current
    if (!line.trim()) {
      state.current = null
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      push('hr', '')
      state.current = null
    } else if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      push(`h${m[1]!.length}` as Block['kind'], m[2]!)
      state.current = null
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      push('quote', m[1]!)
    } else if ((m = line.match(/^\s*[-*+]\s+(.*)$/))) {
      push('ul', m[1]!)
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      push('ol', m[1]!)
    } else if (current && (current.kind === 'ul' || current.kind === 'ol') && /^\s{2,}\S/.test(raw)) {
      // Suite d'un élément de liste
      current.lines[current.lines.length - 1] += `\n${line.trim()}`
    } else {
      push('p', line)
    }
  }
  const item = (l: string) => {
    const box = l.match(/^\[( |x|X)\]\s+(.*)$/s)
    const body = inl(box ? box[2]! : l).replace(/\n/g, '<br>')
    return box ? `<li class="md-task"><input type="checkbox" disabled${box[1] !== ' ' ? ' checked' : ''}> ${body}</li>` : `<li>${body}</li>`
  }
  return blocks
    .map((b) => {
      switch (b.kind) {
        case 'hr':
          return '<hr>'
        case 'h1':
        case 'h2':
        case 'h3':
          return `<${b.kind}>${inl(b.lines[0]!)}</${b.kind}>`
        case 'quote':
          return `<blockquote>${b.lines.map(inl).join('<br>')}</blockquote>`
        case 'ul':
          return `<ul>${b.lines.map(item).join('')}</ul>`
        case 'ol':
          return `<ol>${b.lines.map(item).join('')}</ol>`
        default:
          return `<p>${b.lines.map(inl).join('<br>')}</p>`
      }
    })
    .join('')
}

/** Texte sans la syntaxe Markdown (extraits, notifications, listes). */
export function markdownToText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+(\[[ xX]\]\s+)?/gm, '• ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/(^|\s)[*_](\S[^*_]*\S|\S)[*_](?=\s|$|[.,;:!?])/g, '$1$2')
    .trim()
}

/** Mise en forme proposée par la barre d'outils de l'éditeur. */
export type MarkdownAction = 'bold' | 'italic' | 'heading' | 'ul' | 'ol' | 'task' | 'quote' | 'link'

/**
 * Applique une mise en forme à la sélection (`start`…`end`) d'un texte ; renvoie le nouveau texte et
 * la sélection à rétablir. Sans sélection, un exemple est inséré et sélectionné.
 */
export function applyMarkdown(text: string, start: number, end: number, action: MarkdownAction): { text: string; start: number; end: number } {
  const before = text.slice(0, start)
  const selected = text.slice(start, end)
  const after = text.slice(end)
  const wrap = (mark: string, sample: string) => {
    const body = selected || sample
    return { text: `${before}${mark}${body}${mark}${after}`, start: start + mark.length, end: start + mark.length + body.length }
  }
  if (action === 'bold') return wrap('**', 'texte en gras')
  if (action === 'italic') return wrap('*', 'texte en italique')
  if (action === 'link') {
    const label = selected || 'texte du lien'
    const insert = `[${label}](https://)`
    const urlStart = start + label.length + 3
    return { text: `${before}${insert}${after}`, start: urlStart, end: urlStart + 8 }
  }
  // Actions de ligne : on travaille sur les lignes entières de la sélection
  const lineStart = before.lastIndexOf('\n') + 1
  const nextBreak = text.indexOf('\n', end)
  const lineEnd = nextBreak === -1 ? text.length : nextBreak
  const lines = text.slice(lineStart, lineEnd).split('\n')
  const prefix = (i: number) => ({ heading: '## ', ul: '- ', ol: `${i + 1}. `, task: '- [ ] ', quote: '> ' })[action as 'heading']
  const strip = (l: string) => l.replace(/^(#{1,3}\s+|>\s?|\s*[-*+]\s+(\[[ xX]\]\s+)?|\s*\d+[.)]\s+)/, '')
  const already = lines.every((l, i) => l.startsWith(prefix(i)!.replace(/\d+/, (n) => n)))
  const changed = lines.map((l, i) => (already ? strip(l) : prefix(i) + strip(l))).join('\n')
  const result = text.slice(0, lineStart) + changed + text.slice(lineEnd)
  return { text: result, start: lineStart, end: lineStart + changed.length }
}
