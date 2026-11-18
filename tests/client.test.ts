import { describe, expect, it, vi } from 'vitest'
import { ApiError, createApiClient } from '../src'

function memoryStorage(initial: string | null = null) {
  let token = initial
  return { get: () => token, set: (t: string | null) => void (token = t) }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('client API', () => {
  it('enregistre le jeton à la connexion et l\'envoie ensuite', async () => {
    const storage = memoryStorage()
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { token: 'abc', token_type: 'Bearer', expires_at: '', user: {} }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { id: 1 } }))

    const api = createApiClient({ baseUrl: 'https://api.test/api/', storage, fetch })
    await api.auth.login({ email: 'a@b.c', password: 'x' })
    await api.auth.me()

    expect(storage.get()).toBe('abc')
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/auth/login')
    expect(fetch.mock.calls[1]?.[1]?.headers.Authorization).toBe('Bearer abc')
  })

  it('transforme les erreurs de validation en ApiError', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(422, { message: 'Certains champs sont invalides.', errors: { email: ['E-mail déjà utilisé.'] } }),
    )
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const error = await api.users.create({} as never).catch((e) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.fieldError('email')).toBe('E-mail déjà utilisé.')
  })

  it('efface le jeton et prévient l\'application sur une réponse 401', async () => {
    const storage = memoryStorage('expiré')
    const onUnauthorized = vi.fn()
    const fetch = vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated.' }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage, fetch, onUnauthorized })

    await expect(api.auth.me()).rejects.toBeInstanceOf(ApiError)
    expect(storage.get()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('ajoute les filtres à l\'URL', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(200, { data: [], meta: {} }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.users.list({ search: 'awa', is_active: true, role: undefined, page: 2 })

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/users?search=awa&is_active=1&page=2')
  })

  it('signale un serveur injoignable', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage(), fetch })

    await expect(api.auth.me()).rejects.toMatchObject({ status: 0 })
  })

  it('envoie les créations de clients avec leur client_uuid et renvoie la fiche', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(201, { data: { id: 7, name: 'Sonatel' } }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const client = await api.clients.create({ client_uuid: 'u-1', name: 'Sonatel', phones: [{ number: '77' }] })

    expect(client.id).toBe(7)
    const [url, init] = fetch.mock.calls[0] ?? []
    expect(url).toBe('https://api.test/api/v1/clients')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ client_uuid: 'u-1', name: 'Sonatel', phones: [{ number: '77' }] })
  })

  it('filtre les contacts par client et supprime une fiche', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { data: [], meta: { server_time: 'x' } }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.contacts.list({ client_id: 3, search: 'diop' })
    await api.contacts.remove(9)

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/contacts?client_id=3&search=diop')
    expect(fetch.mock.calls[1]?.[0]).toBe('https://api.test/api/v1/contacts/9')
    expect(fetch.mock.calls[1]?.[1]?.method).toBe('DELETE')
  })

  it('récupère toutes les pages d\'une synchro et garde l\'heure serveur de la première page', async () => {
    const page = (n: number, last: number, time: string) =>
      jsonResponse(200, { data: [{ id: n }], meta: { current_page: n, last_page: last, server_time: time } })
    const fetch = vi.fn().mockResolvedValueOnce(page(1, 2, 'T1')).mockResolvedValueOnce(page(2, 2, 'T2'))
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    const result = await api.syncAll((f) => api.clients.list(f), '2026-11-01T00:00:00+00:00')

    expect(result).toEqual({ items: [{ id: 1 }, { id: 2 }], serverTime: 'T1' })
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://api.test/api/v1/clients?updated_since=2026-11-01T00%3A00%3A00%2B00%3A00&page=1&per_page=500',
    )
    expect(fetch.mock.calls[1]?.[0]).toContain('page=2')
  })

  it('fait une synchro complète sans date de dernière synchro', async () => {
    const fetch = vi.fn().mockResolvedValue(
      jsonResponse(200, { data: [], meta: { current_page: 1, last_page: 1, server_time: 'T' } }),
    )
    const api = createApiClient({ baseUrl: 'https://api.test/api', storage: memoryStorage('t'), fetch })

    await api.syncAll((f) => api.contacts.list(f), null)

    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.test/api/v1/contacts?page=1&per_page=500')
  })
})
