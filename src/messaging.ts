import type { Conversation, ConversationMember, Message } from './types.js'

/** Fusionne des messages reçus (nouveaux ou modifiés) dans une liste triée, sans doublon. */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map((m) => [m.id, m]))
  for (const m of incoming) byId.set(m.id, m)
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

/** Plus grand identifiant connu (pour relever les nouveaux avec `after_id`). */
export function lastMessageId(messages: Pick<Message, 'id'>[]): number {
  return messages.reduce((max, m) => (m.id > max ? m.id : max), 0)
}

/** Membres (autres que l'auteur) qui ont lu ce message. */
export function readBy(message: Pick<Message, 'id' | 'user_id'>, members: Pick<ConversationMember, 'id' | 'full_name' | 'last_read_message_id'>[]): string[] {
  return members.filter((m) => m.id !== message.user_id && (m.last_read_message_id ?? 0) >= message.id).map((m) => m.full_name)
}

/** Conversations triées par activité ; filtre sur le titre, le projet ou le nom d'un membre. */
export function filterConversations(list: Conversation[], search = ''): Conversation[] {
  const q = search.trim().toLowerCase()
  const at = (c: Conversation) => c.last_message_at ?? c.created_at ?? ''
  return list
    .filter((c) => !q || [c.title, c.project?.name, c.task?.title, ...c.members.map((m) => m.full_name)].some((v) => v?.toLowerCase().includes(q)))
    .sort((a, b) => at(b).localeCompare(at(a)))
}

/** « 14:05 » aujourd'hui, « hier », sinon la date courte. */
export function messageTime(iso: string | null, now: Date = new Date()): string {
  if (!iso) return ''
  const d = new Date(iso)
  const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`
  if (day(d) === day(now)) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (day(d) === day(yesterday)) return 'hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

/** Deux messages se suivent du même auteur à moins de 5 minutes : on n'affiche pas l'auteur une deuxième fois. */
export function sameGroup(previous: Pick<Message, 'user_id' | 'created_at'> | undefined, message: Pick<Message, 'user_id' | 'created_at'>): boolean {
  if (!previous || previous.user_id !== message.user_id || !previous.created_at || !message.created_at) return false
  return Math.abs(new Date(message.created_at).getTime() - new Date(previous.created_at).getTime()) < 5 * 60_000
}
