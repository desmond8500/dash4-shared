import type {
  CurrentUser,
  LoginPayload,
  LoginResponse,
  Paginated,
  Role,
  User,
  UserFilters,
  UserPayload,
  Wrapped,
} from './types.js'

/** Où stocker le jeton : localStorage sur le web, stockage sécurisé sur mobile. */
export interface TokenStorage {
  get(): string | null | Promise<string | null>
  set(token: string | null): void | Promise<void>
}

export interface ApiClientOptions {
  /** URL de l'API sans /v1, ex. `https://api.dash4.yonkou.info/api` */
  baseUrl: string
  storage: TokenStorage
  /** Appelé sur une réponse 401 (jeton expiré ou supprimé) ou 403 « compte désactivé ». */
  onUnauthorized?: () => void
  fetch?: typeof fetch
}

/** Erreur renvoyée par l'API. `errors` contient les erreurs de validation (422) par champ. */
export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** Premier message d'erreur d'un champ, pour l'afficher sous le champ du formulaire. */
  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

function toQueryString(query?: Query): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, '')
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis)

  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const token = await options.storage.get()
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    let response: Response
    try {
      response = await doFetch(`${baseUrl}/v1/${path.replace(/^\/+/, '')}${toQueryString(query)}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(0, 'Impossible de joindre le serveur. Vérifiez votre connexion.')
    }

    const text = await response.text()
    const data = text ? safeJson(text) : null

    if (!response.ok) {
      const message =
        (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
          ? data.message
          : null) ?? defaultMessage(response.status)
      const errors =
        data && typeof data === 'object' && 'errors' in data ? (data.errors as Record<string, string[]>) : {}

      if (response.status === 401 || (response.status === 403 && /désactivé/i.test(message))) {
        await options.storage.set(null)
        options.onUnauthorized?.()
      }

      throw new ApiError(response.status, message, errors)
    }

    return data as T
  }

  return {
    request,

    auth: {
      async login(payload: LoginPayload): Promise<LoginResponse> {
        const response = await request<LoginResponse>('POST', 'auth/login', payload)
        await options.storage.set(response.token)
        return response
      },
      async me(): Promise<CurrentUser> {
        return (await request<Wrapped<CurrentUser>>('GET', 'auth/me')).data
      },
      async logout(): Promise<void> {
        try {
          await request('POST', 'auth/logout')
        } finally {
          await options.storage.set(null)
        }
      },
    },

    users: {
      list(filters: UserFilters = {}): Promise<Paginated<User>> {
        return request('GET', 'users', undefined, { ...filters })
      },
      async get(id: number): Promise<User> {
        return (await request<Wrapped<User>>('GET', `users/${id}`)).data
      },
      async create(payload: UserPayload): Promise<User> {
        return (await request<Wrapped<User>>('POST', 'users', payload)).data
      },
      async update(id: number, payload: Partial<UserPayload>): Promise<User> {
        return (await request<Wrapped<User>>('PATCH', `users/${id}`, payload)).data
      },
    },

    roles: {
      async list(): Promise<Role[]> {
        return (await request<Wrapped<Role[]>>('GET', 'roles')).data
      },
    },
  }
}

export type ApiClient = ReturnType<typeof createApiClient>

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function defaultMessage(status: number): string {
  switch (status) {
    case 401:
      return 'Votre session a expiré. Reconnectez-vous.'
    case 403:
      return "Vous n'avez pas le droit de faire cette action."
    case 404:
      return 'Élément introuvable.'
    case 422:
      return 'Certains champs sont invalides.'
    case 429:
      return 'Trop de tentatives. Réessayez dans une minute.'
    default:
      return status >= 500 ? 'Erreur du serveur. Réessayez plus tard.' : 'Une erreur est survenue.'
  }
}
