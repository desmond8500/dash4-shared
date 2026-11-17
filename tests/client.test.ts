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
})
