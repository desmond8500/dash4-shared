import { describe, expect, it } from 'vitest'
import { filterMentionable, insertMention, mentionedIds, mentionQuery, splitMentions } from '../src'

const people = [
  { id: 1, full_name: 'Awa Ndiaye' },
  { id: 2, full_name: 'Élodie Sarr' },
  { id: 3, full_name: 'Moussa Diop' },
]

describe('mentions @nom', () => {
  it('repère la mention en cours de saisie', () => {
    expect(mentionQuery('Bonjour @aw', 11)).toEqual({ start: 8, query: 'aw' })
    expect(mentionQuery('@', 1)).toEqual({ start: 0, query: '' })
    expect(mentionQuery('mail@exemple', 12)).toBeNull()
    expect(mentionQuery('Bonjour', 7)).toBeNull()
  })

  it('trouve les personnes par prénom ou nom, sans accents', () => {
    expect(filterMentionable(people, 'elo').map((p) => p.id)).toEqual([2])
    expect(filterMentionable(people, 'diop').map((p) => p.id)).toEqual([3])
    expect(filterMentionable(people, '')).toHaveLength(3)
  })

  it('insère le nom et retrouve les personnes encore citées', () => {
    const { text, cursor } = insertMention('Vu avec @aw', 8, 11, people[0]!)
    expect(text).toBe('Vu avec @Awa Ndiaye ')
    expect(cursor).toBe(text.length)
    expect(mentionedIds(`${text}et @Moussa Diop`, people)).toEqual([1, 3])
    expect(mentionedIds('Plus de mention', people)).toEqual([])
  })

  it('découpe le texte pour mettre les mentions en valeur', () => {
    expect(splitMentions('@Awa Ndiaye voir avec @Moussa Diop.', people)).toEqual([
      { text: '@Awa Ndiaye', mention: 1 },
      { text: ' voir avec ' },
      { text: '@Moussa Diop', mention: 3 },
      { text: '.' },
    ])
  })
})
