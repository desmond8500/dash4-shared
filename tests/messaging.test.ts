import { describe, expect, it } from 'vitest'
import type { Conversation, Message } from '../src/types.js'
import { filterConversations, lastMessageId, mergeMessages, messageTime, readBy, sameGroup } from '../src/messaging.js'

const msg = (id: number, extra: Partial<Message> = {}): Message => ({
  id, client_uuid: null, conversation_id: 1, user_id: 1, body: `m${id}`, files: [], edited_at: null, can: { update: true },
  created_at: '2026-11-19T10:00:00Z', updated_at: null, deleted_at: null, ...extra,
})

describe('messagerie', () => {
  it('fusionne sans doublon et trie', () => {
    const merged = mergeMessages([msg(1), msg(3)], [msg(2), msg(3, { body: 'modifié' })])
    expect(merged.map((m) => m.id)).toEqual([1, 2, 3])
    expect(merged[2]!.body).toBe('modifié')
    expect(lastMessageId(merged)).toBe(3)
    expect(lastMessageId([])).toBe(0)
  })

  it('indique qui a lu', () => {
    const members = [
      { id: 1, full_name: 'Awa', last_read_message_id: 5 },
      { id: 2, full_name: 'Moussa', last_read_message_id: 5 },
      { id: 3, full_name: 'Fatou', last_read_message_id: 2 },
    ]
    expect(readBy(msg(4), members)).toEqual(['Moussa'])
  })

  it('filtre et trie les conversations', () => {
    const conv = (id: number, title: string, at: string): Conversation => ({
      id, type: 'group', title, project: null, task: null, members: [{ id: 9, full_name: 'Ibrahima Fall', job_title: null, avatar_url: null, last_read_message_id: null }],
      last_message: null, unread_count: 0, last_message_at: at, can: { manage: false }, created_at: at, updated_at: at,
    })
    const list = [conv(1, 'Chantier A', '2026-11-18T10:00:00Z'), conv(2, 'Bureau', '2026-11-19T10:00:00Z')]
    expect(filterConversations(list).map((c) => c.id)).toEqual([2, 1])
    expect(filterConversations(list, 'chantier').map((c) => c.id)).toEqual([1])
    expect(filterConversations(list, 'fall')).toHaveLength(2)
  })

  it('affiche l’heure et regroupe', () => {
    const now = new Date('2026-11-19T15:00:00')
    expect(messageTime(new Date('2026-11-18T09:00:00').toISOString(), now)).toBe('hier')
    expect(messageTime(null, now)).toBe('')
    expect(sameGroup(msg(1), msg(2, { created_at: '2026-11-19T10:03:00Z' }))).toBe(true)
    expect(sameGroup(msg(1), msg(2, { created_at: '2026-11-19T10:09:00Z' }))).toBe(false)
    expect(sameGroup(msg(1), msg(2, { user_id: 2 }))).toBe(false)
  })
})
