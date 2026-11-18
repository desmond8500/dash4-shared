import type {
  EmailSignature,
  EmailSignatureList,
  DeliveryNotePayload,
  QuoteDepositPayload,
  QuoteEmailDraft,
  Invoice,
  InvoiceCreatePayload,
  InvoiceFilters,
  InvoiceLinePayload,
  InvoicePayload,
  InvoicePaymentPayload,
  InvoiceSummary,
  QuoteEmailPayload,
  QuoteExpensePayload,
  QuoteSystem,
  QuoteTemplate,
  QuoteTemplatePayload,
  QuoteTemplateSummary,
  Quote,
  QuoteFilters,
  QuoteLinePayload,
  QuotePayload,
  QuoteStatus,
  AppSettings,
  AttachableType,
  BankAccount,
  BankAccountPayload,
  Company,
  CompanyPayload,
  DocumentType,
  SettingsPayload,
  Assignee,
  Document,
  Link,
  LinkPayload,
  Note,
  NotePayload,
  Project,
  ProjectFilters,
  ProjectPayload,
  AppNotification,
  Client,
  ClientRequest,
  ClientRequestFilters,
  ClientRequestPayload,
  ClientRequestSummary,
  ClientFilters,
  ClientPayload,
  Contact,
  ContactFilters,
  ContactPayload,
  CurrentUser,
  LoginPayload,
  LoginResponse,
  NotificationPage,
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

/** Données + fichier facultatif en multipart (booléens envoyés en 1 / 0). */
function toForm(payload: object, file?: Blob, filename?: string): FormData {
  const form = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined) continue
    form.append(key, value === null ? '' : typeof value === 'boolean' ? (value ? '1' : '0') : String(value))
  }
  if (file) form.append('file', file, filename ?? 'justificatif')
  return form
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, '')
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis)

  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const response = await send(method, path, body, query)
    const text = await response.text()
    return (text ? safeJson(text) : null) as T
  }

  /** Téléchargement d'un fichier privé (document) avec le jeton de connexion. */
  async function requestBlob(path: string): Promise<Blob> {
    const response = await send('GET', path)
    return response.blob()
  }

  async function send(method: string, path: string, body?: unknown, query?: Query): Promise<Response> {
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

    if (!response.ok) {
      const text = await response.text()
      const data = text ? safeJson(text) : null
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

    return response
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

    clientRequests: {
      list(filters: ClientRequestFilters = {}): Promise<SyncPaginated<ClientRequest>> {
        return request('GET', 'client-requests', undefined, { ...filters })
      },
      /** Compteurs : à traiter, nouvelles, en retard, confiées à moi, rappels arrivés. */
      async summary(): Promise<ClientRequestSummary> {
        return (await request<Wrapped<ClientRequestSummary>>('GET', 'client-requests/summary')).data
      },
      async get(id: number): Promise<ClientRequest> {
        return (await request<Wrapped<ClientRequest>>('GET', `client-requests/${id}`)).data
      },
      /** Saisie express : seul `body` est obligatoire. */
      async create(payload: ClientRequestPayload): Promise<ClientRequest> {
        return (await request<Wrapped<ClientRequest>>('POST', 'client-requests', payload)).data
      },
      async update(id: number, payload: Partial<Omit<ClientRequestPayload, 'client_uuid'>>): Promise<ClientRequest> {
        return (await request<Wrapped<ClientRequest>>('PATCH', `client-requests/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `client-requests/${id}`)
      },
      /**
       * Transforme la demande en projet ou en devis ; elle passe à « Traitée ».
       * `client_id` exigé si la demande n'a pas de client.
       */
      async convert(
        id: number,
        payload: { type: 'project' | 'quote'; name?: string; client_id?: number; manager_id?: number | null },
      ): Promise<{ request: ClientRequest; project?: Project; quote?: Quote }> {
        return (
          await request<Wrapped<{ request: ClientRequest; project?: Project; quote?: Quote }>>(
            'POST',
            `client-requests/${id}/convert`,
            payload,
          )
        ).data
      },
    },

    projects: {
      list(filters: ProjectFilters = {}): Promise<SyncPaginated<Project>> {
        return request('GET', 'projects', undefined, { ...filters })
      },
      /** Fiche complète : notes, liens et documents. */
      async get(id: number): Promise<Project> {
        return (await request<Wrapped<Project>>('GET', `projects/${id}`)).data
      },
      async create(payload: ProjectPayload): Promise<Project> {
        return (await request<Wrapped<Project>>('POST', 'projects', payload)).data
      },
      async update(id: number, payload: Partial<Omit<ProjectPayload, 'client_uuid'>>): Promise<Project> {
        return (await request<Wrapped<Project>>('PATCH', `projects/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `projects/${id}`)
      },
      async uploadLogo(id: number, file: Blob, filename = 'logo'): Promise<Project> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<Project>>('POST', `projects/${id}/logo`, form)).data
      },
      async removeLogo(id: number): Promise<Project> {
        return (await request<Wrapped<Project>>('DELETE', `projects/${id}/logo`)).data
      },
    },

    /** Notes de toute fiche (`clients`, `projects`). */
    notes: {
      async list(type: AttachableType, id: number): Promise<Note[]> {
        return (await request<Wrapped<Note[]>>('GET', `${type}/${id}/notes`)).data
      },
      async create(type: AttachableType, id: number, payload: NotePayload): Promise<Note> {
        return (await request<Wrapped<Note>>('POST', `${type}/${id}/notes`, payload)).data
      },
      async update(noteId: number, payload: Partial<Omit<NotePayload, 'client_uuid'>>): Promise<Note> {
        return (await request<Wrapped<Note>>('PATCH', `notes/${noteId}`, payload)).data
      },
      async remove(noteId: number): Promise<void> {
        await request('DELETE', `notes/${noteId}`)
      },
    },

    links: {
      async list(type: AttachableType, id: number): Promise<Link[]> {
        return (await request<Wrapped<Link[]>>('GET', `${type}/${id}/links`)).data
      },
      async create(type: AttachableType, id: number, payload: LinkPayload): Promise<Link> {
        return (await request<Wrapped<Link>>('POST', `${type}/${id}/links`, payload)).data
      },
      async update(linkId: number, payload: Partial<Omit<LinkPayload, 'client_uuid'>>): Promise<Link> {
        return (await request<Wrapped<Link>>('PATCH', `links/${linkId}`, payload)).data
      },
      async remove(linkId: number): Promise<void> {
        await request('DELETE', `links/${linkId}`)
      },
    },

    documents: {
      async list(type: AttachableType, id: number): Promise<Document[]> {
        return (await request<Wrapped<Document[]>>('GET', `${type}/${id}/documents`)).data
      },
      /** 20 Mo au plus ; pas d'exécutable, de HTML ni de SVG. */
      async upload(type: AttachableType, id: number, file: Blob, filename: string, name?: string): Promise<Document> {
        const form = new FormData()
        form.append('file', file, filename)
        if (name) form.append('name', name)
        return (await request<Wrapped<Document>>('POST', `${type}/${id}/documents`, form)).data
      },
      /** Contenu du fichier (privé), à ouvrir ou enregistrer côté appli. */
      download(document: Pick<Document, 'download_path'>): Promise<Blob> {
        return requestBlob(document.download_path)
      },
      async remove(documentId: number): Promise<void> {
        await request('DELETE', `documents/${documentId}`)
      },
    },

    quotes: {
      list(filters: QuoteFilters = {}): Promise<SyncPaginated<Quote>> {
        return request('GET', 'quotes', undefined, { ...filters })
      },
      /** Devis complet : sections et lignes, totaux. */
      async get(id: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('GET', `quotes/${id}`)).data
      },
      async create(payload: QuotePayload): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', 'quotes', payload)).data
      },
      async update(id: number, payload: Partial<Omit<QuotePayload, 'client_uuid'>>): Promise<Quote> {
        return (await request<Wrapped<Quote>>('PATCH', `quotes/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `quotes/${id}`)
      },
      async setStatus(id: number, status: QuoteStatus): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/status`, { status })).data
      },
      async duplicate(id: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/duplicate`)).data
      },
      /** PDF du devis (logo, banque, signature et cachet). */
      pdf(id: number): Promise<Blob> {
        return requestBlob(`quotes/${id}/pdf`)
      },
      /** Copie signée par le client : le devis passe à « Accepté ». */
      async uploadSignedCopy(id: number, file: Blob, filename: string): Promise<Quote> {
        const form = new FormData()
        form.append('file', file, filename)
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/signed-copy`, form)).data
      },
      async addSection(id: number, payload: { title: string; is_visible?: boolean }): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/sections`, payload)).data
      },
      async updateSection(sectionId: number, payload: { title?: string; is_visible?: boolean }): Promise<Quote> {
        return (await request<Wrapped<Quote>>('PATCH', `quote-sections/${sectionId}`, payload)).data
      },
      async removeSection(sectionId: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('DELETE', `quote-sections/${sectionId}`)).data
      },
      async orderSections(id: number, ids: number[]): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/sections/order`, { ids })).data
      },
      async addLine(sectionId: number, payload: QuoteLinePayload): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quote-sections/${sectionId}/lines`, payload)).data
      },
      async updateLine(lineId: number, payload: Partial<QuoteLinePayload>): Promise<Quote> {
        return (await request<Wrapped<Quote>>('PATCH', `quote-lines/${lineId}`, payload)).data
      },
      async removeLine(lineId: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('DELETE', `quote-lines/${lineId}`)).data
      },
      async orderLines(sectionId: number, ids: number[]): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quote-sections/${sectionId}/lines/order`, { ids })).data
      },
      /** Texte de proposition technique d'une section (modifiable même sur un devis accepté). */
      async setSectionProposal(sectionId: number, proposal: string | null): Promise<Quote> {
        return (await request<Wrapped<Quote>>('PATCH', `quote-sections/${sectionId}`, { proposal })).data
      },
      /** PDF de la proposition technique. */
      proposalPdf(id: number): Promise<Blob> {
        return requestBlob(`quotes/${id}/proposal-pdf`)
      },
      /** Insère un modèle : dans une section existante, ou dans une nouvelle section à son nom. */
      async insertTemplate(id: number, templateId: number, sectionId?: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/insert-template`, { template_id: templateId, quote_section_id: sectionId })).data
      },
      async addDeposit(id: number, payload: QuoteDepositPayload): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/deposits`, payload)).data
      },
      async updateDeposit(depositId: number, payload: QuoteDepositPayload): Promise<Quote> {
        return (await request<Wrapped<Quote>>('PATCH', `quote-deposits/${depositId}`, payload)).data
      },
      async removeDeposit(depositId: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('DELETE', `quote-deposits/${depositId}`)).data
      },
      /** Dépense réelle (`costs.view`), avec justificatif facultatif. */
      async addExpense(id: number, payload: QuoteExpensePayload, file?: Blob, filename?: string): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/expenses`, toForm(payload, file, filename))).data
      },
      async updateExpense(expenseId: number, payload: Partial<QuoteExpensePayload>, file?: Blob, filename?: string): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quote-expenses/${expenseId}`, toForm(payload, file, filename))).data
      },
      async removeExpense(expenseId: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('DELETE', `quote-expenses/${expenseId}`)).data
      },
      async addDeliveryNote(id: number, payload: DeliveryNotePayload = {}): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/delivery-notes`, payload)).data
      },
      async updateDeliveryNote(noteId: number, payload: DeliveryNotePayload): Promise<Quote> {
        return (await request<Wrapped<Quote>>('PATCH', `delivery-notes/${noteId}`, payload)).data
      },
      async removeDeliveryNote(noteId: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('DELETE', `delivery-notes/${noteId}`)).data
      },
      deliveryNotePdf(noteId: number): Promise<Blob> {
        return requestBlob(`delivery-notes/${noteId}/pdf`)
      },
      /** Destinataires proposés (client et contacts), objet et message. */
      async emailDraft(id: number): Promise<QuoteEmailDraft> {
        return (await request<Wrapped<QuoteEmailDraft>>('GET', `quotes/${id}/email-draft`)).data
      },
      /** Envoie le devis par e-mail avec son PDF ; un brouillon passe à « Envoyé ». */
      async send(id: number, payload: QuoteEmailPayload): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/send`, payload)).data
      },
    },

    /** Factures et paiements : `invoices.*` ; émission et annulation : `invoices.issue`. */
    invoices: {
      list(filters: InvoiceFilters = {}): Promise<SyncPaginated<Invoice>> {
        const { unpaid, overdue, ...rest } = filters
        return request('GET', 'invoices', undefined, { ...rest, ...(unpaid ? { unpaid: 1 } : {}), ...(overdue ? { overdue: 1 } : {}) })
      },
      async summary(): Promise<InvoiceSummary> {
        return (await request<Wrapped<InvoiceSummary>>('GET', 'invoices/summary')).data
      },
      async get(id: number): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('GET', `invoices/${id}`)).data
      },
      /** Crée un brouillon (sans numéro). */
      async create(payload: InvoiceCreatePayload): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('POST', 'invoices', payload)).data
      },
      /** Brouillon : tout ; facture émise : `notes` seulement. */
      async update(id: number, payload: InvoicePayload): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('PATCH', `invoices/${id}`, payload)).data
      },
      /** Brouillon seulement. */
      async remove(id: number): Promise<void> {
        await request('DELETE', `invoices/${id}`)
      },
      async addLine(id: number, payload: InvoiceLinePayload): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('POST', `invoices/${id}/lines`, payload)).data
      },
      async updateLine(lineId: number, payload: Partial<InvoiceLinePayload>): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('PATCH', `invoice-lines/${lineId}`, payload)).data
      },
      async removeLine(lineId: number): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('DELETE', `invoice-lines/${lineId}`)).data
      },
      /** Attribue le numéro FAC et verrouille la facture ; échéance à 30 jours par défaut. */
      async issue(id: number, payload: { issued_at?: string; due_at?: string | null } = {}): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('POST', `invoices/${id}/issue`, payload)).data
      },
      async cancel(id: number): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('POST', `invoices/${id}/cancel`)).data
      },
      async addPayment(id: number, payload: InvoicePaymentPayload): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('POST', `invoices/${id}/payments`, payload)).data
      },
      async removePayment(paymentId: number): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('DELETE', `invoice-payments/${paymentId}`)).data
      },
      pdf(id: number): Promise<Blob> {
        return requestBlob(`invoices/${id}/pdf`)
      },
      async emailDraft(id: number): Promise<QuoteEmailDraft> {
        return (await request<Wrapped<QuoteEmailDraft>>('GET', `invoices/${id}/email-draft`)).data
      },
      async send(id: number, payload: Omit<QuoteEmailPayload, 'attach_proposal'>): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('POST', `invoices/${id}/send`, payload)).data
      },
    },

    /** Systèmes et modèles de devis. Gestion : `quotes.update` + `costs.view`. */
    quoteTemplates: {
      async catalog(): Promise<{ systems: QuoteSystem[]; templates_without_system: QuoteTemplateSummary[] }> {
        return (await request<Wrapped<{ systems: QuoteSystem[]; templates_without_system: QuoteTemplateSummary[] }>>('GET', 'quote-systems')).data
      },
      async get(id: number): Promise<QuoteTemplate> {
        return (await request<Wrapped<QuoteTemplate>>('GET', `quote-templates/${id}`)).data
      },
      async create(payload: QuoteTemplatePayload): Promise<QuoteTemplate> {
        return (await request<Wrapped<QuoteTemplate>>('POST', 'quote-templates', payload)).data
      },
      /** `lines` envoyées : elles remplacent celles du modèle. */
      async update(id: number, payload: Partial<QuoteTemplatePayload>): Promise<QuoteTemplate> {
        return (await request<Wrapped<QuoteTemplate>>('PATCH', `quote-templates/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `quote-templates/${id}`)
      },
      async fromSection(sectionId: number, payload: { name: string; description?: string | null; quote_system_id?: number | null }): Promise<QuoteTemplate> {
        return (await request<Wrapped<QuoteTemplate>>('POST', `quote-sections/${sectionId}/save-as-template`, payload)).data
      },
      async createSystem(payload: { name: string; description?: string | null; icon?: string | null }): Promise<Omit<QuoteSystem, 'templates'>> {
        return (await request<Wrapped<Omit<QuoteSystem, 'templates'>>>('POST', 'quote-systems', payload)).data
      },
      async updateSystem(id: number, payload: { name?: string; description?: string | null; icon?: string | null }): Promise<Omit<QuoteSystem, 'templates'>> {
        return (await request<Wrapped<Omit<QuoteSystem, 'templates'>>>('PATCH', `quote-systems/${id}`, payload)).data
      },
      /** Ses modèles sont gardés, « sans système ». */
      async removeSystem(id: number): Promise<void> {
        await request('DELETE', `quote-systems/${id}`)
      },
    },

    company: {
      async get(): Promise<Company> {
        return (await request<Wrapped<Company>>('GET', 'company')).data
      },
      async update(payload: CompanyPayload): Promise<Company> {
        return (await request<Wrapped<Company>>('PATCH', 'company', payload)).data
      },
      async uploadLogo(file: Blob, filename = 'logo'): Promise<Company> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<Company>>('POST', 'company/logo', form)).data
      },
      async removeLogo(): Promise<Company> {
        return (await request<Wrapped<Company>>('DELETE', 'company/logo')).data
      },
      /** Signature ou cachet (PNG privé, `signature.manage`). */
      image(kind: 'signature' | 'stamp'): Promise<Blob> {
        return requestBlob(`company/${kind}`)
      },
      async uploadImage(kind: 'signature' | 'stamp', file: Blob, filename = `${kind}.png`): Promise<Company> {
        const form = new FormData()
        form.append('image', file, filename)
        return (await request<Wrapped<Company>>('POST', `company/${kind}`, form)).data
      },
      async removeImage(kind: 'signature' | 'stamp'): Promise<Company> {
        return (await request<Wrapped<Company>>('DELETE', `company/${kind}`)).data
      },
    },

    bankAccounts: {
      async list(): Promise<BankAccount[]> {
        return (await request<Wrapped<BankAccount[]>>('GET', 'bank-accounts')).data
      },
      async create(payload: BankAccountPayload): Promise<BankAccount> {
        return (await request<Wrapped<BankAccount>>('POST', 'bank-accounts', payload)).data
      },
      async update(id: number, payload: Partial<BankAccountPayload>): Promise<BankAccount> {
        return (await request<Wrapped<BankAccount>>('PATCH', `bank-accounts/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `bank-accounts/${id}`)
      },
    },

    settings: {
      async get(): Promise<AppSettings> {
        return (await request<Wrapped<AppSettings>>('GET', 'settings')).data
      },
      async update(payload: SettingsPayload): Promise<AppSettings> {
        return (await request<Wrapped<AppSettings>>('PATCH', 'settings', payload)).data
      },
      async numberingPreview(type: DocumentType, format?: string): Promise<string> {
        return (await request<Wrapped<{ next: string }>>('GET', 'settings/numbering-preview', undefined, { type, format })).data.next
      },
    },

    /** Signatures d'e-mail : les siennes, et celles de l'entreprise. */
    emailSignatures: {
      list(): Promise<EmailSignatureList> {
        return request('GET', 'email-signatures')
      },
      /** `shared: true` : signature commune à l'entreprise (`company.update`). */
      async create(payload: { name: string; body: string; is_default?: boolean; image_width?: number; shared?: boolean }): Promise<EmailSignature> {
        return (await request<Wrapped<EmailSignature>>('POST', 'email-signatures', payload)).data
      },
      async update(id: number, payload: { name?: string; body?: string; is_default?: boolean; image_width?: number }): Promise<EmailSignature> {
        return (await request<Wrapped<EmailSignature>>('PATCH', `email-signatures/${id}`, payload)).data
      },
      /** Photo ou logo : JPEG ou PNG, 1 Mo. */
      async uploadImage(id: number, file: Blob, filename = 'signature.png'): Promise<EmailSignature> {
        const form = new FormData()
        form.append('image', file, filename)
        return (await request<Wrapped<EmailSignature>>('POST', `email-signatures/${id}/image`, form)).data
      },
      async removeImage(id: number): Promise<EmailSignature> {
        return (await request<Wrapped<EmailSignature>>('DELETE', `email-signatures/${id}/image`)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `email-signatures/${id}`)
      },
    },

    assignees: {
      /** Personnes actives à qui confier une demande ou une tâche. */
      async list(): Promise<Assignee[]> {
        return (await request<Wrapped<Assignee[]>>('GET', 'assignees')).data
      },
    },

    notifications: {
      list(options: { unread?: boolean; page?: number; per_page?: number } = {}): Promise<NotificationPage> {
        return request('GET', 'notifications', undefined, { ...options })
      },
      async read(id: AppNotification['id']): Promise<void> {
        await request('POST', `notifications/${id}/read`)
      },
      async readAll(): Promise<void> {
        await request('POST', 'notifications/read-all')
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
