import type {
  Client,
  ClientFilters,
  ClientPayload,
  Contact,
  ContactFilters,
  ContactPayload,
  CurrentUser,
  LoginPayload,
  LoginResponse,
  Paginated,
  Role,
  SyncFilters,
  SyncPaginated,
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
    // Envoi de fichier : le navigateur fixe lui-même le Content-Type multipart
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    let response: Response
    try {
      response = await doFetch(`${baseUrl}/v1/${path.replace(/^\/+/, '')}${toQueryString(query)}`, {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
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

    clients: {
      list(filters: ClientFilters = {}): Promise<SyncPaginated<Client>> {
        return request('GET', 'clients', undefined, { ...filters })
      },
      /** Fiche complète : contacts, téléphones et e-mails. */
      async get(id: number): Promise<Client> {
        return (await request<Wrapped<Client>>('GET', `clients/${id}`)).data
      },
      async create(payload: ClientPayload): Promise<Client> {
        return (await request<Wrapped<Client>>('POST', 'clients', payload)).data
      },
      async update(id: number, payload: Partial<Omit<ClientPayload, 'client_uuid'>>): Promise<Client> {
        return (await request<Wrapped<Client>>('PATCH', `clients/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `clients/${id}`)
      },
      /** Logo : JPEG, PNG ou WebP de 2 Mo au plus. Renvoie la fiche avec `logo_url`. */
      async uploadLogo(id: number, file: Blob, filename = 'logo'): Promise<Client> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<Client>>('POST', `clients/${id}/logo`, form)).data
      },
      async removeLogo(id: number): Promise<Client> {
        return (await request<Wrapped<Client>>('DELETE', `clients/${id}/logo`)).data
      },
    },

    contacts: {
      list(filters: ContactFilters = {}): Promise<SyncPaginated<Contact>> {
        return request('GET', 'contacts', undefined, { ...filters })
      },
      async get(id: number): Promise<Contact> {
        return (await request<Wrapped<Contact>>('GET', `contacts/${id}`)).data
      },
      async create(payload: ContactPayload): Promise<Contact> {
        return (await request<Wrapped<Contact>>('POST', 'contacts', payload)).data
      },
      async update(id: number, payload: Partial<Omit<ContactPayload, 'client_uuid'>>): Promise<Contact> {
        return (await request<Wrapped<Contact>>('PATCH', `contacts/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `contacts/${id}`)
      },
    },

    /**
     * Récupère toutes les pages d'une liste depuis `updated_since` (synchro du mobile).
     * Renvoie les fiches (suppressions comprises) et le `server_time` à garder pour la fois suivante.
     */
    async syncAll<T>(
      list: (filters: SyncFilters) => Promise<SyncPaginated<T>>,
      updatedSince?: string | null,
    ): Promise<{ items: T[]; serverTime: string }> {
      const items: T[] = []
      let page = 1
      let serverTime = ''
      for (;;) {
        const response = await list({ updated_since: updatedSince ?? undefined, page, per_page: 500 })
        items.push(...response.data)
        if (page === 1) serverTime = response.meta.server_time
        if (page >= (response.meta.last_page ?? 1)) break
        page++
      }
      return { items, serverTime }
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
