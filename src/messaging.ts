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

/** Rythme de relève : rapide juste après un échange, puis de plus en plus lent si rien n'arrive. */
export const POLL_STEPS = [5_000, 15_000, 30_000, 60_000]

/** Délai avant la prochaine relève, selon le nombre de relèves sans nouveauté d'affilée. */
export function pollDelay(quietPolls: number, steps: number[] = POLL_STEPS): number {
  return steps[Math.min(Math.max(quietPolls, 0), steps.length - 1)] ?? 60_000
}

export interface Poller {
  /** Démarre (relève immédiate) ; sans effet si déjà en route. */
  start(): void
  /** Arrête toute relève (écran quitté, onglet caché, application en arrière-plan). */
  stop(): void
  /** Il vient de se passer quelque chose (message envoyé…) : on repart au rythme rapide. */
  poke(): void
  readonly running: boolean
}

/**
 * Relève régulière qui ralentit d'elle-même : `run` renvoie true s'il y avait du nouveau.
 * Une seule relève à la fois, jamais en parallèle ; rien ne tourne après `stop()`.
 */
export function createPoller(run: () => Promise<boolean>, steps: number[] = POLL_STEPS): Poller {
  let timer: ReturnType<typeof setTimeout> | null = null
  let running = false
  let busy = false
  let quiet = 0

  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  const schedule = (delay: number) => {
    clear()
    if (running) timer = setTimeout(() => void tick(), delay)
  }
  async function tick(): Promise<void> {
    if (!running || busy) return
    busy = true
    let active = false
    try {
      active = await run()
    } catch {
      active = false
    } finally {
      busy = false
    }
    quiet = active ? 0 : quiet + 1
    schedule(pollDelay(quiet, steps))
  }

  return {
    start() {
      if (running) return
      running = true
      quiet = 0
      void tick()
    },
    stop() {
      running = false
      clear()
    },
    poke() {
      quiet = 0
      if (running && !busy) schedule(steps[0] ?? 5_000)
    },
    get running() {
      return running
    },
  }
}
