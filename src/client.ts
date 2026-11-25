import type { QuoteSitePayload } from './quoteSite.js'
import type {
  PlanIcon,
  PlanIconPayload,
  PlanSettings,
  Tool,
  ToolFilters,
  ToolLendPayload,
  ToolLoan,
  ToolLoanFilters,
  ToolOptions,
  ToolPayload,
  ToolReturnPayload,
  Vehicle,
  VehicleFilters,
  VehiclePayload,
  VehiclePaperPayload,
  VehicleMileagePayload,
  VehicleMaintenancePayload,
  VehicleOptions,
  EmailSignature,
  EmailSignatureList,
  DeliveryNotePayload,
  QuoteDepositPayload,
  QuoteEmailDraft,
  Journal,
  JournalFilters,
  TechShare,
  Site,
  SiteSystem,
  PlacePayload,
  InstalledSystemPayload,
  EquipmentPayload,
  ReceptionReport,
  Badge,
  DashboardData,
  DashboardLayout,
  BadgePayload,
  BadgeTemplate,
  BadgeTemplatePayload,
  Contract,
  ContractFilters,
  ContractPayload,
  FlatRate,
  Plan,
  PlanMarkerPayload,
  Quantity,
  QuantityPayload,
  Sheet,
  SheetPayload,
  ReceptionReportPayload,
  ReceptionParty,
  Comment,
  CommentPayload,
  CommentableType,
  Mentionable,
  TechShareFilters,
  TechSharePayload,
  TechAccessRequest,
  TechAccessRequestFilters,
  TechAccessRequestPayload,
  AccessRequestDecision,
  JournalPayload,
  ClientRequestLinkType,
  Priority,
  InboundEmail,
  InboundEmailMeta,
  StorageLocation,
  Task,
  TaskFilters,
  TaskPayload,
  TaskSummary,
  AccountingFilters,
  AccountingSummary,
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  ExpensePayload,
  ExpenseSpace,
  ExpenseSummary,
  LedgerEntry,
  Transaction,
  TransactionPayload,
  Article,
  ArticleFilters,
  ArticlePayload,
  Brand,
  Provider,
  ProviderPayload,
  Purchase,
  PurchaseFilters,
  PurchaseLinePayload,
  PurchasePayload,
  PurchaseReceivePayload,
  StockMovement,
  StockMovementPayload,
  StockSummary,
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
  ContactableType,
  PracticalToolInfo,
  PracticalToolLink,
  PracticalToolLinkType,
  RecordPracticalTool,
  QuoteEmailDocument,
  RecordContact,
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
  Backup,
  ScheduleItem,
  Cv,
  CvPayload,
  Conversation,
  ConversationPayload,
  Message,
  MessagePage,
  MessagingUser,
  ProfilePayload,
  PasswordPayload,
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

/**
 * Nom de fichier d'un en-tête Content-Disposition : `filename*=UTF-8''…` (accents) en priorité, sinon `filename="…"`.
 */
export function fileNameFromDisposition(header: string | null | undefined): string | null {
  if (!header) return null
  const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header)
  if (star?.[2]) {
    try {
      return decodeURIComponent(star[2].trim().replace(/^"|"$/g, ''))
    } catch {
      // encodage invalide : on prend le nom simple
    }
  }
  const plain = /filename\s*=\s*("((?:[^"\\]|\\.)*)"|[^;]+)/i.exec(header)
  if (!plain) return null
  const value = (plain[2] ?? plain[1] ?? '').replace(/\\(.)/g, '$1').trim()
  return value || null
}

/** Nom d'un fichier téléchargé (`File` rendu par le client), sinon le nom de secours. */
export function downloadedFileName(blob: Blob, fallback: string): string {
  return typeof File !== 'undefined' && blob instanceof File && blob.name ? blob.name : fallback
}

export function createApiClient(options: ApiClientOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, '')
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis)

  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const response = await send(method, path, body, query)
    const text = await response.text()
    return (text ? safeJson(text) : null) as T
  }

  /**
   * Téléchargement d'un fichier privé (document, PDF) avec le jeton de connexion. Le résultat est un `File`
   * qui porte le nom donné par le serveur (« Client - Objet - Référence.pdf »), quand il est connu.
   */
  async function requestBlob(path: string): Promise<Blob> {
    const response = await send('GET', path)
    const blob = await response.blob()
    const name = fileNameFromDisposition(response.headers.get('Content-Disposition'))
    return name && typeof File !== 'undefined' ? new File([blob], name, { type: blob.type }) : blob
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
      /** Envoie le lien « mot de passe oublié » (même réponse que l'adresse soit connue ou non). */
      async forgotPassword(email: string): Promise<string> {
        return (await request<{ message: string }>('POST', 'auth/forgot-password', { email })).message
      },
      async resetPassword(payload: { token: string; email: string; password: string; password_confirmation: string }): Promise<string> {
        return (await request<{ message: string }>('POST', 'auth/reset-password', payload)).message
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
        payload: { type: 'project' | 'quote' | 'task'; name?: string; client_id?: number; manager_id?: number | null },
      ): Promise<{ request: ClientRequest; project?: Project; quote?: Quote; task?: Task }> {
        return (
          await request<Wrapped<{ request: ClientRequest; project?: Project; quote?: Quote; task?: Task }>>(
            'POST',
            `client-requests/${id}/convert`,
            payload,
          )
        ).data
      },
    },

    /** Journaux d'intervention. */
    journals: {
      list(filters: JournalFilters = {}): Promise<SyncPaginated<Journal>> {
        const { mine, ...rest } = filters
        return request('GET', 'journals', undefined, { ...rest, ...(mine ? { mine: 1 } : {}) })
      },
      async get(id: number): Promise<Journal> {
        return (await request<Wrapped<Journal>>('GET', `journals/${id}`)).data
      },
      async create(payload: JournalPayload & { title: string; date: string }): Promise<Journal> {
        return (await request<Wrapped<Journal>>('POST', 'journals', payload)).data
      },
      async update(id: number, payload: Omit<JournalPayload, 'client_uuid'>): Promise<Journal> {
        return (await request<Wrapped<Journal>>('PATCH', `journals/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `journals/${id}`)
      },
      /** Rapport d'intervention avec les photos. */
      pdf(id: number): Promise<Blob> {
        return requestBlob(`journals/${id}/pdf`)
      },
      /** Destinataires proposés (client et contacts), objet et message. */
      async emailDraft(id: number): Promise<QuoteEmailDraft> {
        return (await request<Wrapped<QuoteEmailDraft>>('GET', `journals/${id}/email-draft`)).data
      },
      /** Envoie le rapport par e-mail avec son PDF. */
      async send(id: number, payload: QuoteEmailPayload): Promise<Journal> {
        return (await request<Wrapped<Journal>>('POST', `journals/${id}/send`, payload)).data
      },
    },

    /** Suivi de chantier d'un projet (`sites.*`) ; chaque modification renvoie le chantier complet. */
    /** Bibliothèque d'icônes des plans. */
    planIcons: {
      async list(): Promise<PlanIcon[]> {
        return (await request<Wrapped<PlanIcon[]>>('GET', 'plan-icons')).data
      },
      async create(payload: PlanIconPayload & { name: string }, image?: Blob, filename?: string): Promise<PlanIcon> {
        return (await request<Wrapped<PlanIcon>>('POST', 'plan-icons', image ? toForm(payload, image, filename ?? 'icone.png') : payload)).data
      },
      async update(id: number, payload: PlanIconPayload, image?: Blob, filename?: string): Promise<PlanIcon> {
        return image
          ? (await request<Wrapped<PlanIcon>>('POST', `plan-icons/${id}`, toForm(payload, image, filename ?? 'icone.png'))).data
          : (await request<Wrapped<PlanIcon>>('PATCH', `plan-icons/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `plan-icons/${id}`)
      },
      /** Ajoute la bibliothèque standard (légende de l'entreprise) ; `reset` remet les icônes standard à neuf. */
      async install(reset = false): Promise<{ created: number; updated: number; unchanged: number; message: string }> {
        const r = await request<{ data: { created: number; updated: number; unchanged: number }; message: string }>('POST', 'plan-icons/install', { reset })
        return { ...r.data, message: r.message }
      },
      file(icon: Pick<PlanIcon, 'file_path'>): Promise<Blob> {
        return requestBlob(icon.file_path!)
      },
    },

    sites: {
      async get(projectId: number): Promise<Site> {
        return (await request<Wrapped<Site>>('GET', `projects/${projectId}/site`)).data
      },
      async addBuilding(projectId: number, payload: PlacePayload & { name: string }): Promise<Site> {
        return (await request<Wrapped<Site>>('POST', `projects/${projectId}/buildings`, payload)).data
      },
      async updateBuilding(id: number, payload: PlacePayload): Promise<Site> {
        return (await request<Wrapped<Site>>('PATCH', `buildings/${id}`, payload)).data
      },
      async removeBuilding(id: number): Promise<Site> {
        return (await request<Wrapped<Site>>('DELETE', `buildings/${id}`)).data
      },
      async addLevel(buildingId: number, payload: PlacePayload & { name: string }): Promise<Site> {
        return (await request<Wrapped<Site>>('POST', `buildings/${buildingId}/levels`, payload)).data
      },
      async updateLevel(id: number, payload: PlacePayload): Promise<Site> {
        return (await request<Wrapped<Site>>('PATCH', `levels/${id}`, payload)).data
      },
      async removeLevel(id: number): Promise<Site> {
        return (await request<Wrapped<Site>>('DELETE', `levels/${id}`)).data
      },
      async addRoom(levelId: number, payload: PlacePayload & { name: string }): Promise<Site> {
        return (await request<Wrapped<Site>>('POST', `levels/${levelId}/rooms`, payload)).data
      },
      async updateRoom(id: number, payload: PlacePayload): Promise<Site> {
        return (await request<Wrapped<Site>>('PATCH', `rooms/${id}`, payload)).data
      },
      async removeRoom(id: number): Promise<Site> {
        return (await request<Wrapped<Site>>('DELETE', `rooms/${id}`)).data
      },
      async addSystem(projectId: number, payload: InstalledSystemPayload): Promise<Site> {
        return (await request<Wrapped<Site>>('POST', `projects/${projectId}/installed-systems`, payload)).data
      },
      async updateSystem(id: number, payload: InstalledSystemPayload): Promise<Site> {
        return (await request<Wrapped<Site>>('PATCH', `installed-systems/${id}`, payload)).data
      },
      async removeSystem(id: number): Promise<Site> {
        return (await request<Wrapped<Site>>('DELETE', `installed-systems/${id}`)).data
      },
      /** Relevé d'avancement : le système prend le pourcentage du relevé le plus récent. */
      async addProgress(systemId: number, payload: { percent: number; date?: string; note?: string | null; client_uuid?: string }): Promise<Site> {
        return (await request<Wrapped<Site>>('POST', `installed-systems/${systemId}/progress`, payload)).data
      },
      async removeProgress(id: number): Promise<Site> {
        return (await request<Wrapped<Site>>('DELETE', `system-progress/${id}`)).data
      },
      async addEquipment(systemId: number, payload: EquipmentPayload): Promise<Site> {
        return (await request<Wrapped<Site>>('POST', `installed-systems/${systemId}/equipment`, payload)).data
      },
      async updateEquipment(id: number, payload: EquipmentPayload): Promise<Site> {
        return (await request<Wrapped<Site>>('PATCH', `equipment/${id}`, payload)).data
      },
      /** Éclate un groupe (quantité N) en N appareils de quantité 1, avec les mêmes informations. */
      async splitEquipment(id: number): Promise<Site> {
        return (await request<Wrapped<Site>>('POST', `equipment/${id}/split`)).data
      },
      async removeEquipment(id: number): Promise<Site> {
        return (await request<Wrapped<Site>>('DELETE', `equipment/${id}`)).data
      },
      /** Catalogue des systèmes (vidéosurveillance, alarme…). */
      async catalog(): Promise<SiteSystem[]> {
        return (await request<Wrapped<SiteSystem[]>>('GET', 'systems')).data
      },
      async addCatalogSystem(payload: { name: string; icon?: string | null; description?: string | null }): Promise<SiteSystem> {
        return (await request<Wrapped<SiteSystem>>('POST', 'systems', payload)).data
      },
      async updateCatalogSystem(id: number, payload: { name?: string; icon?: string | null; description?: string | null }): Promise<SiteSystem> {
        return (await request<Wrapped<SiteSystem>>('PATCH', `systems/${id}`, payload)).data
      },
      async removeCatalogSystem(id: number): Promise<void> {
        await request('DELETE', `systems/${id}`)
      },
    },

    /** Plans d'un chantier (image ou PDF) et marqueurs d'équipements. */
    plans: {
      /** Tous les plans des chantiers visibles, avec leur projet (consultation sur le mobile). */
      async all(search?: string): Promise<Plan[]> {
        return (await request<Wrapped<Plan[]>>('GET', 'plans', undefined, search ? { search } : {})).data
      },
      async list(projectId: number): Promise<Plan[]> {
        return (await request<Wrapped<Plan[]>>('GET', `projects/${projectId}/plans`)).data
      },
      /** PDF ou image (30 Mo) ; un DWG est refusé : l'exporter en PDF avant. */
      async upload(projectId: number, file: Blob, filename: string, extra: { name?: string; building_id?: number | null; level_id?: number | null } = {}): Promise<Plan> {
        const form = new FormData()
        form.append('file', file, filename)
        if (extra.name) form.append('name', extra.name)
        if (extra.building_id) form.append('building_id', String(extra.building_id))
        if (extra.level_id) form.append('level_id', String(extra.level_id))
        return (await request<Wrapped<Plan>>('POST', `projects/${projectId}/plans`, form)).data
      },
      async update(id: number, payload: { name?: string; building_id?: number | null; level_id?: number | null; position?: number; settings?: Partial<PlanSettings> }): Promise<Plan> {
        return (await request<Wrapped<Plan>>('PATCH', `plans/${id}`, payload)).data
      },
      /** Aperçu d'une page (plan, repères visibles, légende) : c'est lui qui va dans les PDF. */
      async uploadRender(id: number, page: number, image: Blob, size: { width: number; height: number }): Promise<Plan> {
        const form = new FormData()
        form.append('file', image, `plan-${id}-${page}.${image.type === 'image/png' ? 'png' : 'jpg'}`)
        form.append('page', String(page))
        form.append('width', String(size.width))
        form.append('height', String(size.height))
        return (await request<Wrapped<Plan>>('POST', `plans/${id}/render`, form)).data
      },
      /** PDF du plan : pages avec repères et légende, puis la liste des repères. */
      pdf(id: number): Promise<Blob> {
        return requestBlob(`plans/${id}/pdf`)
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `plans/${id}`)
      },
      file(plan: Pick<Plan, 'download_path'>): Promise<Blob> {
        return requestBlob(plan.download_path)
      },
      async addMarker(planId: number, payload: PlanMarkerPayload & { x: number; y: number }): Promise<Plan> {
        return (await request<Wrapped<Plan>>('POST', `plans/${planId}/markers`, payload)).data
      },
      async updateMarker(id: number, payload: PlanMarkerPayload): Promise<Plan> {
        return (await request<Wrapped<Plan>>('PATCH', `plan-markers/${id}`, payload)).data
      },
      async removeMarker(id: number): Promise<Plan> {
        return (await request<Wrapped<Plan>>('DELETE', `plan-markers/${id}`)).data
      },
    },

    /** Quantitatifs d'un chantier ; `toQuote` en fait un devis brouillon. */
    quantities: {
      async list(projectId: number): Promise<Quantity[]> {
        return (await request<Wrapped<Quantity[]>>('GET', `projects/${projectId}/quantities`)).data
      },
      async create(projectId: number, payload: QuantityPayload & { name: string }): Promise<Quantity> {
        return (await request<Wrapped<Quantity>>('POST', `projects/${projectId}/quantities`, payload)).data
      },
      async update(id: number, payload: QuantityPayload): Promise<Quantity> {
        return (await request<Wrapped<Quantity>>('PATCH', `quantities/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `quantities/${id}`)
      },
      async toQuote(id: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quantities/${id}/quote`)).data
      },
    },

    /** Fiches techniques (zones) d'un chantier. */
    sheets: {
      async list(projectId: number): Promise<Sheet[]> {
        return (await request<Wrapped<Sheet[]>>('GET', `projects/${projectId}/sheets`)).data
      },
      async create(projectId: number, payload: SheetPayload & { title: string }): Promise<Sheet> {
        return (await request<Wrapped<Sheet>>('POST', `projects/${projectId}/sheets`, payload)).data
      },
      async update(id: number, payload: SheetPayload): Promise<Sheet> {
        return (await request<Wrapped<Sheet>>('PATCH', `sheets/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `sheets/${id}`)
      },
      pdf(id: number): Promise<Blob> {
        return requestBlob(`sheets/${id}/pdf`)
      },
    },

    /** Dossier des ouvrages exécutés du projet, en PDF. */
    doe(projectId: number): Promise<Blob> {
      return requestBlob(`projects/${projectId}/doe`)
    },

    /** Tableau de bord selon les droits ; l'ordre et le masquage sont propres à l'utilisateur. */
    dashboard: {
      async get(): Promise<DashboardData> {
        return (await request<Wrapped<DashboardData>>('GET', 'dashboard')).data
      },
      async saveLayout(layout: DashboardLayout): Promise<DashboardData> {
        return (await request<Wrapped<DashboardData>>('PUT', 'dashboard/layout', layout)).data
      },
    },

    /**
     * Messagerie interne (tous profils) : on ne voit que ses conversations. Pas de temps réel côté serveur :
     * relever régulièrement `messages(id, { after_id })` et `unread()`.
     */
    messaging: {
      async users(): Promise<MessagingUser[]> {
        return (await request<Wrapped<MessagingUser[]>>('GET', 'messaging/users')).data
      },
      async conversations(filters: { project_id?: number; task_id?: number; updated_since?: string } = {}): Promise<{ data: Conversation[]; meta: { server_time: string; unread_total: number } }> {
        return request('GET', 'conversations', undefined, filters)
      },
      async unread(): Promise<number> {
        return (await request<Wrapped<{ count: number }>>('GET', 'conversations/unread')).data.count
      },
      /** Conversation privée : reprise si elle existe déjà. */
      async create(payload: ConversationPayload): Promise<Conversation> {
        return (await request<Wrapped<Conversation>>('POST', 'conversations', payload)).data
      },
      async get(id: number | string): Promise<Conversation> {
        return (await request<Wrapped<Conversation>>('GET', `conversations/${id}`)).data
      },
      async rename(id: number, title: string): Promise<Conversation> {
        return (await request<Wrapped<Conversation>>('PATCH', `conversations/${id}`, { title })).data
      },
      async addMembers(id: number, userIds: number[]): Promise<Conversation> {
        return (await request<Wrapped<Conversation>>('POST', `conversations/${id}/members`, { user_ids: userIds })).data
      },
      /** Retirer quelqu'un (créateur du groupe) ou quitter (soi-même). */
      async removeMember(id: number, userId: number): Promise<void> {
        await request('DELETE', `conversations/${id}/members/${userId}`)
      },
      /** Sans option : les 50 derniers. `after_id` : les nouveaux ; `before_id` : les plus anciens. */
      async messages(id: number | string, options: { after_id?: number; before_id?: number; updated_since?: string } = {}): Promise<MessagePage> {
        return request('GET', `conversations/${id}/messages`, undefined, options)
      },
      async send(id: number | string, payload: { body?: string | null; with_files?: boolean; client_uuid?: string }): Promise<Message> {
        return (await request<Wrapped<Message>>('POST', `conversations/${id}/messages`, payload)).data
      },
      /** Marque tout comme lu ; renvoie le nouveau total de non lus. */
      async read(id: number | string, messageId?: number): Promise<number> {
        return (await request<Wrapped<{ count: number }>>('POST', `conversations/${id}/read`, messageId ? { message_id: messageId } : {})).data.count
      },
      async edit(messageId: number, body: string): Promise<Message> {
        return (await request<Wrapped<Message>>('PATCH', `messages/${messageId}`, { body })).data
      },
      async remove(messageId: number): Promise<void> {
        await request('DELETE', `messages/${messageId}`)
      },
    },

    /** Exports comptables (exports.run et prices.view) : CSV pour un tableur, journal FEC. */
    exports: {
      async types(): Promise<{ value: string; label: string }[]> {
        return (await request<Wrapped<{ value: string; label: string }[]>>('GET', 'exports')).data
      },
      /** `from` et `to` au format AAAA-MM-JJ. */
      download(type: string, from: string, to: string): Promise<Blob> {
        return requestBlob(`exports/${type}?${new URLSearchParams({ from, to }).toString()}`)
      },
    },

    /** Sauvegardes (backups.manage, administrateurs). */
    backups: {
      async list(): Promise<{ data: Backup[]; meta: { keep_days: number } }> {
        return request('GET', 'backups')
      },
      /** Sauvegarde immédiate de la base (et des fichiers avec `files`). */
      async run(files = false): Promise<{ database: string; files: string | null }> {
        return (await request<Wrapped<{ database: string; files: string | null }>>('POST', 'backups', { files })).data
      },
      download(name: string): Promise<Blob> {
        return requestBlob(`backups/${encodeURIComponent(name)}`)
      },
      async remove(name: string): Promise<void> {
        await request('DELETE', `backups/${encodeURIComponent(name)}`)
      },
    },

    /** Espace personnel : son profil, sa photo, son mot de passe (aucune permission requise). */
    profile: {
      async update(payload: ProfilePayload): Promise<CurrentUser> {
        return (await request<Wrapped<CurrentUser>>('PATCH', 'me', payload)).data
      },
      async uploadAvatar(file: Blob, filename = 'photo'): Promise<CurrentUser> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<CurrentUser>>('POST', 'me/avatar', form)).data
      },
      /** Ferme aussi les sessions des autres appareils. */
      async changePassword(payload: PasswordPayload): Promise<string> {
        return (await request<{ message: string }>('PUT', 'me/password', payload)).message
      },
    },

    /** CV de l'utilisateur connecté ; les administrateurs voient ceux qui leur sont partagés. */
    cvs: {
      async mine(): Promise<Cv[]> {
        return (await request<Wrapped<Cv[]>>('GET', 'me/cvs')).data
      },
      async ofUser(userId: number): Promise<Cv[]> {
        return (await request<Wrapped<Cv[]>>('GET', `users/${userId}/cvs`)).data
      },
      async get(id: number): Promise<Cv> {
        return (await request<Wrapped<Cv>>('GET', `cvs/${id}`)).data
      },
      /** Prérempli avec le profil et les sections habituelles. */
      async create(payload: CvPayload & { name: string }): Promise<Cv> {
        return (await request<Wrapped<Cv>>('POST', 'me/cvs', payload)).data
      },
      async update(id: number, payload: CvPayload): Promise<Cv> {
        return (await request<Wrapped<Cv>>('PATCH', `cvs/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `cvs/${id}`)
      },
      async duplicate(id: number): Promise<Cv> {
        return (await request<Wrapped<Cv>>('POST', `cvs/${id}/duplicate`)).data
      },
      async uploadPhoto(id: number, file: Blob, filename = 'photo'): Promise<Cv> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<Cv>>('POST', `cvs/${id}/photo`, form)).data
      },
      /** Ajoute les projets Dash4 de l'auteur à la section « Projets réalisés ». */
      async importProjects(id: number): Promise<Cv> {
        return (await request<Wrapped<Cv>>('POST', `cvs/${id}/projects`)).data
      },
      pdf(id: number): Promise<Blob> {
        return requestBlob(`cvs/${id}/pdf`)
      },
    },

    /** Badges (`badges.*`) : modèles, badges d'un projet, impression PDF. */
    badges: {
      async templates(clientId?: number): Promise<BadgeTemplate[]> {
        return (await request<Wrapped<BadgeTemplate[]>>('GET', 'badge-templates', undefined, clientId ? { client_id: clientId } : {})).data
      },
      async createTemplate(payload: BadgeTemplatePayload & { name: string }): Promise<BadgeTemplate> {
        return (await request<Wrapped<BadgeTemplate>>('POST', 'badge-templates', payload)).data
      },
      async updateTemplate(id: number, payload: BadgeTemplatePayload): Promise<BadgeTemplate> {
        return (await request<Wrapped<BadgeTemplate>>('PATCH', `badge-templates/${id}`, payload)).data
      },
      async removeTemplate(id: number): Promise<void> {
        await request('DELETE', `badge-templates/${id}`)
      },
      /** Logo ou image de fond du modèle (JPEG, PNG, WebP, 2 Mo). */
      async uploadTemplateImage(id: number, kind: 'logo' | 'background', file: Blob, filename: string): Promise<BadgeTemplate> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<BadgeTemplate>>('POST', `badge-templates/${id}/images/${kind}`, form)).data
      },
      async removeTemplateImage(id: number, kind: 'logo' | 'background'): Promise<BadgeTemplate> {
        return (await request<Wrapped<BadgeTemplate>>('DELETE', `badge-templates/${id}/images/${kind}`)).data
      },
      async list(projectId: number): Promise<Badge[]> {
        return (await request<Wrapped<Badge[]>>('GET', `projects/${projectId}/badges`)).data
      },
      async create(projectId: number, payload: BadgePayload): Promise<Badge> {
        return (await request<Wrapped<Badge>>('POST', `projects/${projectId}/badges`, payload)).data
      },
      /** Import d'une liste (500 personnes au plus) ; renvoie tous les badges du projet. */
      async import(projectId: number, badges: BadgePayload[], templateId: number | null): Promise<Badge[]> {
        return (await request<Wrapped<Badge[]>>('POST', `projects/${projectId}/badges`, { badges, badge_template_id: templateId })).data
      },
      async update(id: number, payload: BadgePayload): Promise<Badge> {
        return (await request<Wrapped<Badge>>('PATCH', `badges/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `badges/${id}`)
      },
      async uploadPhoto(id: number, file: Blob, filename: string): Promise<Badge> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<Badge>>('POST', `badges/${id}/photo`, form)).data
      },
      /** `cards` : une carte par page ; `sheet` : planche A4 de 10. */
      pdf(projectId: number, layout: 'cards' | 'sheet' = 'cards', ids: number[] = []): Promise<Blob> {
        const query = new URLSearchParams({ layout, ...(ids.length ? { ids: ids.join(',') } : {}) })
        return requestBlob(`projects/${projectId}/badges/pdf?${query.toString()}`)
      },
    },

    /** Contrats de maintenance (`contracts.*`) et forfaits. */
    /** Photo principale d'un véhicule ou d'un outil (les autres photos sont des documents image de la fiche). */
    photos: {
      async upload<T extends 'vehicles' | 'tools'>(type: T, id: number, file: Blob, filename: string): Promise<T extends 'vehicles' ? Vehicle : Tool> {
        const form = new FormData()
        form.append('photo', file, filename)
        return (await request<Wrapped<T extends 'vehicles' ? Vehicle : Tool>>('POST', `${type}/${id}/photo`, form)).data
      },
      async remove<T extends 'vehicles' | 'tools'>(type: T, id: number): Promise<T extends 'vehicles' ? Vehicle : Tool> {
        return (await request<Wrapped<T extends 'vehicles' ? Vehicle : Tool>>('DELETE', `${type}/${id}/photo`)).data
      },
    },

    /** Outillage (`tools.*`) : outils liés aux articles, prêts, retours et rappels. */
    tools: {
      async list(filters: ToolFilters = {}): Promise<Tool[]> {
        const { mine, ...rest } = filters
        return (await request<Wrapped<Tool[]>>('GET', 'tools', undefined, { ...rest, ...(mine ? { mine: 1 } : {}) })).data
      },
      async options(): Promise<ToolOptions> {
        return (await request<Wrapped<ToolOptions>>('GET', 'tools/options')).data
      },
      async get(id: number): Promise<Tool> {
        return (await request<Wrapped<Tool>>('GET', `tools/${id}`)).data
      },
      async create(payload: ToolPayload): Promise<Tool> {
        return (await request<Wrapped<Tool>>('POST', 'tools', payload)).data
      },
      /** Plusieurs exemplaires d'un coup (2 à 50) : numéros suffixés -01, -02… */
      async createMany(payload: ToolPayload, count: number): Promise<Tool[]> {
        return (await request<Wrapped<Tool[]>>('POST', 'tools', { ...payload, count })).data
      },
      async update(id: number, payload: ToolPayload): Promise<Tool> {
        return (await request<Wrapped<Tool>>('PATCH', `tools/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `tools/${id}`)
      },
      /** Prêts : `open` en cours, `late` en retard. */
      async loans(filters: ToolLoanFilters = {}): Promise<ToolLoan[]> {
        const { open, late, ...rest } = filters
        return (await request<Wrapped<ToolLoan[]>>('GET', 'tool-loans', undefined, { ...rest, ...(open ? { open: 1 } : {}), ...(late ? { late: 1 } : {}) })).data
      },
      async lend(id: number, payload: ToolLendPayload): Promise<Tool> {
        return (await request<Wrapped<Tool>>('POST', `tools/${id}/loans`, payload)).data
      },
      async updateLoan(id: number, loanId: number, payload: Pick<ToolLendPayload, 'due_on' | 'project_id' | 'borrower_phone' | 'notes'>): Promise<Tool> {
        return (await request<Wrapped<Tool>>('PATCH', `tools/${id}/loans/${loanId}`, payload)).data
      },
      async returnTool(id: number, loanId: number, payload: ToolReturnPayload = {}): Promise<Tool> {
        return (await request<Wrapped<Tool>>('POST', `tools/${id}/loans/${loanId}/return`, payload)).data
      },
      /** Rappel envoyé tout de suite à l'emprunteur (s'il a un compte). */
      async remind(id: number, loanId: number): Promise<Tool> {
        return (await request<Wrapped<Tool>>('POST', `tools/${id}/loans/${loanId}/remind`)).data
      },
      async removeLoan(id: number, loanId: number): Promise<Tool> {
        return (await request<Wrapped<Tool>>('DELETE', `tools/${id}/loans/${loanId}`)).data
      },
    },

    /** Parc automobile : véhicules et scooters, papiers, kilométrage, entretiens. */
    vehicles: {
      async list(filters: VehicleFilters = {}): Promise<Vehicle[]> {
        const { alerts, ...rest } = filters
        return (await request<Wrapped<Vehicle[]>>('GET', 'vehicles', undefined, { ...rest, ...(alerts ? { alerts: 1 } : {}) })).data
      },
      async options(): Promise<VehicleOptions> {
        return (await request<Wrapped<VehicleOptions>>('GET', 'vehicles/options')).data
      },
      async get(id: number): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('GET', `vehicles/${id}`)).data
      },
      async create(payload: VehiclePayload & { name: string; kind: Vehicle['kind']['value'] }): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('POST', 'vehicles', payload)).data
      },
      async update(id: number, payload: VehiclePayload): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('PATCH', `vehicles/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `vehicles/${id}`)
      },
      async addPaper(id: number, payload: VehiclePaperPayload & { type: NonNullable<VehiclePaperPayload['type']> }): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('POST', `vehicles/${id}/papers`, payload)).data
      },
      async updatePaper(id: number, paperId: number, payload: VehiclePaperPayload): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('PATCH', `vehicles/${id}/papers/${paperId}`, payload)).data
      },
      async removePaper(id: number, paperId: number): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('DELETE', `vehicles/${id}/papers/${paperId}`)).data
      },
      /** Relevé du compteur (aussi par le conducteur attitré). */
      async addMileage(id: number, payload: VehicleMileagePayload): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('POST', `vehicles/${id}/mileages`, payload)).data
      },
      async removeMileage(id: number, mileageId: number): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('DELETE', `vehicles/${id}/mileages/${mileageId}`)).data
      },
      async addMaintenance(id: number, payload: VehicleMaintenancePayload & { type: NonNullable<VehicleMaintenancePayload['type']>; done_on: string }): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('POST', `vehicles/${id}/maintenances`, payload)).data
      },
      async updateMaintenance(id: number, maintenanceId: number, payload: VehicleMaintenancePayload): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('PATCH', `vehicles/${id}/maintenances/${maintenanceId}`, payload)).data
      },
      async removeMaintenance(id: number, maintenanceId: number): Promise<Vehicle> {
        return (await request<Wrapped<Vehicle>>('DELETE', `vehicles/${id}/maintenances/${maintenanceId}`)).data
      },
    },

    contracts: {
      list(filters: ContractFilters = {}): Promise<Paginated<Contract>> {
        const { due, ending, ...rest } = filters
        return request('GET', 'contracts', undefined, { ...rest, ...(due ? { due: 1 } : {}), ...(ending ? { ending: 1 } : {}) })
      },
      async get(id: number): Promise<Contract> {
        return (await request<Wrapped<Contract>>('GET', `contracts/${id}`)).data
      },
      async create(payload: ContractPayload & { client_id: number; title: string; start_date: string }): Promise<Contract> {
        return (await request<Wrapped<Contract>>('POST', 'contracts', payload)).data
      },
      async update(id: number, payload: ContractPayload): Promise<Contract> {
        return (await request<Wrapped<Contract>>('PATCH', `contracts/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `contracts/${id}`)
      },
      /** Facture brouillon de la prochaine période. */
      async invoice(id: number): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('POST', `contracts/${id}/invoice`)).data
      },
      pdf(id: number): Promise<Blob> {
        return requestBlob(`contracts/${id}/pdf`)
      },
      async flatRates(clientId?: number): Promise<FlatRate[]> {
        return (await request<Wrapped<FlatRate[]>>('GET', 'flat-rates', undefined, clientId ? { client_id: clientId } : {})).data
      },
      async createFlatRate(payload: { designation: string; description?: string | null; unit?: string | null; price?: number; client_id?: number | null; article_id?: number | null }): Promise<FlatRate> {
        return (await request<Wrapped<FlatRate>>('POST', 'flat-rates', payload)).data
      },
      async updateFlatRate(id: number, payload: Partial<{ designation: string; description: string | null; unit: string | null; price: number; client_id: number | null }>): Promise<FlatRate> {
        return (await request<Wrapped<FlatRate>>('PATCH', `flat-rates/${id}`, payload)).data
      },
      async removeFlatRate(id: number): Promise<void> {
        await request('DELETE', `flat-rates/${id}`)
      },
    },

    /** Procès-verbaux de réception d'un chantier. */
    receptionReports: {
      async list(projectId: number): Promise<ReceptionReport[]> {
        return (await request<Wrapped<ReceptionReport[]>>('GET', `projects/${projectId}/reception-reports`)).data
      },
      async get(id: number): Promise<ReceptionReport> {
        return (await request<Wrapped<ReceptionReport>>('GET', `reception-reports/${id}`)).data
      },
      async create(projectId: number, payload: ReceptionReportPayload & { title: string; date: string }): Promise<ReceptionReport> {
        return (await request<Wrapped<ReceptionReport>>('POST', `projects/${projectId}/reception-reports`, payload)).data
      },
      async update(id: number, payload: ReceptionReportPayload): Promise<ReceptionReport> {
        return (await request<Wrapped<ReceptionReport>>('PATCH', `reception-reports/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `reception-reports/${id}`)
      },
      async uploadLogo(id: number, party: ReceptionParty, file: Blob, filename: string): Promise<ReceptionReport> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<ReceptionReport>>('POST', `reception-reports/${id}/logos/${party}`, form)).data
      },
      async removeLogo(id: number, party: ReceptionParty): Promise<ReceptionReport> {
        return (await request<Wrapped<ReceptionReport>>('DELETE', `reception-reports/${id}/logos/${party}`)).data
      },
      pdf(id: number): Promise<Blob> {
        return requestBlob(`reception-reports/${id}/pdf`)
      },
    },

    /** Fil de commentaires d'une fiche : qui voit la fiche peut commenter. */
    comments: {
      /** Du plus ancien au plus récent ; avec `updatedSince`, les changements (suppressions comprises). */
      list(type: CommentableType, id: number, updatedSince?: string | null): Promise<{ data: Comment[]; meta: { server_time: string } }> {
        return request('GET', `${type}/${id}/comments`, undefined, updatedSince ? { updated_since: updatedSince } : {})
      },
      async create(type: CommentableType, id: number, payload: CommentPayload): Promise<Comment> {
        return (await request<Wrapped<Comment>>('POST', `${type}/${id}/comments`, payload)).data
      },
      /** L'auteur seulement ; les nouvelles mentions sont prévenues. */
      async update(commentId: number, payload: Partial<Omit<CommentPayload, 'client_uuid'>>): Promise<Comment> {
        return (await request<Wrapped<Comment>>('PATCH', `comments/${commentId}`, payload)).data
      },
      async remove(commentId: number): Promise<void> {
        await request('DELETE', `comments/${commentId}`)
      },
      /** Personnes qui voient la fiche, à mentionner avec @. */
      async mentionable(type: CommentableType, id: number): Promise<Mentionable[]> {
        return (await request<Wrapped<Mentionable[]>>('GET', `${type}/${id}/mentionable`)).data
      },
    },

    /** Informations temporaires (`tech_shares.*`) : effacées à l'expiration. */
    techShares: {
      list(filters: TechShareFilters = {}): Promise<SyncPaginated<TechShare>> {
        const { received, mine, ...rest } = filters
        return request('GET', 'tech-shares', undefined, { ...rest, ...(received ? { received: 1 } : {}), ...(mine ? { mine: 1 } : {}) })
      },
      async get(id: number): Promise<TechShare> {
        return (await request<Wrapped<TechShare>>('GET', `tech-shares/${id}`)).data
      },
      async create(payload: TechSharePayload & { title: string; recipients: number[] }): Promise<TechShare> {
        return (await request<Wrapped<TechShare>>('POST', 'tech-shares', payload)).data
      },
      async update(id: number, payload: Omit<TechSharePayload, 'client_uuid'>): Promise<TechShare> {
        return (await request<Wrapped<TechShare>>('PATCH', `tech-shares/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `tech-shares/${id}`)
      },
      /** Le destinataire indique l'avoir lue. */
      async markRead(id: number): Promise<TechShare> {
        return (await request<Wrapped<TechShare>>('POST', `tech-shares/${id}/read`)).data
      },
      /** Efface tout de suite le contenu et les fichiers. */
      async expire(id: number): Promise<TechShare> {
        return (await request<Wrapped<TechShare>>('POST', `tech-shares/${id}/expire`)).data
      },
    },

    /** Demandes d'accès des techniciens (`tech_access_requests.*`). */
    accessRequests: {
      list(filters: TechAccessRequestFilters = {}): Promise<SyncPaginated<TechAccessRequest>> {
        const { pending, mine, ...rest } = filters
        return request('GET', 'tech-access-requests', undefined, { ...rest, ...(pending ? { pending: 1 } : {}), ...(mine ? { mine: 1 } : {}) })
      },
      async get(id: number): Promise<TechAccessRequest> {
        return (await request<Wrapped<TechAccessRequest>>('GET', `tech-access-requests/${id}`)).data
      },
      async create(payload: TechAccessRequestPayload): Promise<TechAccessRequest> {
        return (await request<Wrapped<TechAccessRequest>>('POST', 'tech-access-requests', payload)).data
      },
      /** Accepter (avec l'information à envoyer) ou refuser (avec la raison). */
      async decide(id: number, payload: AccessRequestDecision): Promise<TechAccessRequest> {
        return (await request<Wrapped<TechAccessRequest>>('POST', `tech-access-requests/${id}/decide`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `tech-access-requests/${id}`)
      },
    },

    /** Boîte mail des demandes (`client_requests.update`). */
    inbox: {
      list(filters: { status?: 'new' | 'converted' | 'ignored' | 'all'; search?: string; page?: number } = {}): Promise<{ data: InboundEmail[]; meta: InboundEmailMeta }> {
        return request('GET', 'inbound-emails', undefined, { ...filters })
      },
      async get(id: number): Promise<InboundEmail> {
        return (await request<Wrapped<InboundEmail>>('GET', `inbound-emails/${id}`)).data
      },
      /** Relève la boîte tout de suite. */
      /** `failed` : e-mails illisibles, laissés non lus dans la boîte mail. */
      async fetch(): Promise<{ imported: number; skipped: number; failed: number }> {
        return (await request<Wrapped<{ imported: number; skipped: number; failed: number }>>('POST', 'inbound-emails/fetch')).data
      },
      async convert(id: number, payload: { client_id?: number | null; body?: string; priority?: Priority; assigned_to?: number | null } = {}): Promise<{ email: InboundEmail; request: ClientRequest }> {
        return (await request<Wrapped<{ email: InboundEmail; request: ClientRequest }>>('POST', `inbound-emails/${id}/convert`, payload)).data
      },
      async ignore(id: number, restore = false): Promise<InboundEmail> {
        return (await request<Wrapped<InboundEmail>>('POST', `inbound-emails/${id}/ignore`, restore ? { restore: true } : {})).data
      },
      attachment(id: number, index: number): Promise<Blob> {
        return requestBlob(`inbound-emails/${id}/attachments/${index}`)
      },
    },

    /** Liens d'une demande vers des tâches, factures, bordereaux, devis, projets. */
    clientRequestLinks: {
      async candidates(type: ClientRequestLinkType, search = ''): Promise<Array<{ id: number; label: string }>> {
        return (await request<Wrapped<Array<{ id: number; label: string }>>>('GET', 'client-request-link-candidates', undefined, { type, search })).data
      },
      async add(requestId: number, type: ClientRequestLinkType, id: number): Promise<ClientRequest> {
        return (await request<Wrapped<ClientRequest>>('POST', `client-requests/${requestId}/links`, { type, id })).data
      },
      async remove(linkId: number): Promise<ClientRequest> {
        return (await request<Wrapped<ClientRequest>>('DELETE', `client-request-links/${linkId}`)).data
      },
    },

    storageLocations: {
      async list(all = false): Promise<StorageLocation[]> {
        return (await request<Wrapped<StorageLocation[]>>('GET', 'storage-locations', undefined, all ? { all: 1 } : undefined)).data
      },
      async get(id: number): Promise<StorageLocation> {
        return (await request<Wrapped<StorageLocation>>('GET', `storage-locations/${id}`)).data
      },
      async create(payload: { name: string; code?: string | null; description?: string | null }): Promise<StorageLocation> {
        return (await request<Wrapped<StorageLocation>>('POST', 'storage-locations', payload)).data
      },
      async update(id: number, payload: { name?: string; code?: string | null; description?: string | null; is_active?: boolean }): Promise<StorageLocation> {
        return (await request<Wrapped<StorageLocation>>('PATCH', `storage-locations/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `storage-locations/${id}`)
      },
    },

    projects: {
      list(filters: ProjectFilters = {}): Promise<SyncPaginated<Project>> {
        return request('GET', 'projects', undefined, { ...filters })
      },
      /** Résumé du projet en PDF (sans montants pour qui ne voit pas les prix). */
      summaryPdf(id: number): Promise<Blob> {
        return requestBlob(`projects/${id}/summary-pdf`)
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

    /** Outils pratiques (calculs, conversions) et leurs liens avec marques, fournisseurs et articles. */
    practicalTools: {
      async list(): Promise<PracticalToolInfo[]> {
        return (await request<Wrapped<PracticalToolInfo[]>>('GET', 'practical-tools')).data
      },
      /** Outils liés à une marque, un fournisseur ou un article. */
      async forRecord(type: PracticalToolLinkType, id: number): Promise<RecordPracticalTool[]> {
        return (await request<Wrapped<RecordPracticalTool[]>>('GET', `practical-tools/for/${type}/${id}`)).data
      },
      /** Lie l'outil à la fiche (`stock.update`) ; déjà lié, rien ne change. */
      async link(tool: string, type: PracticalToolLinkType, id: number): Promise<PracticalToolLink> {
        return (await request<Wrapped<PracticalToolLink>>('POST', `practical-tools/${tool}/links`, { type, id })).data
      },
      async unlink(linkId: number): Promise<void> {
        await request('DELETE', `practical-tool-links/${linkId}`)
      },
    },

    /** Contacts liés à un projet ou à un devis (un contact peut venir d'un autre client). */
    recordContacts: {
      async list(type: ContactableType, id: number): Promise<RecordContact[]> {
        return (await request<Wrapped<RecordContact[]>>('GET', `${type}/${id}/contacts`)).data
      },
      /** Lie le contact ; déjà lié, seul son rôle change. */
      async add(type: ContactableType, id: number, contactId: number, role?: string | null): Promise<RecordContact> {
        const payload = role === undefined ? { contact_id: contactId } : { contact_id: contactId, role }
        return (await request<Wrapped<RecordContact>>('POST', `${type}/${id}/contacts`, payload)).data
      },
      async setRole(linkId: number, role: string | null): Promise<RecordContact> {
        return (await request<Wrapped<RecordContact>>('PATCH', `record-contacts/${linkId}`, { role })).data
      },
      async order(type: ContactableType, id: number, ids: number[]): Promise<RecordContact[]> {
        return (await request<Wrapped<RecordContact[]>>('POST', `${type}/${id}/contacts/order`, { ids })).data
      },
      /** Retire le contact de la fiche (le contact reste). */
      async remove(linkId: number): Promise<void> {
        await request('DELETE', `record-contacts/${linkId}`)
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
      /** Crée les appareils du chantier du projet depuis les lignes du devis (seul le reste de chaque ligne). */
      async toSite(id: number, payload: QuoteSitePayload): Promise<{ site: Site; created: number }> {
        const res = await request<Wrapped<Site> & { meta: { created: number } }>('POST', `quotes/${id}/site-equipment`, payload)
        return { site: res.data, created: res.meta?.created ?? 0 }
      },
      /**
       * PDF du devis (logo, banque, signature et cachet).
       * `neutral` : version neutre ou non pour ce téléchargement ; sans valeur, le réglage du devis.
       */
      pdf(id: number, neutral?: boolean): Promise<Blob> {
        return requestBlob(`quotes/${id}/pdf${neutral === undefined ? '' : `?neutral=${neutral ? 1 : 0}`}`)
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
      /** Lie la ligne à un article du stock (null : la délie) sans changer la ligne ; possible sur un devis accepté. */
      async linkArticle(lineId: number, articleId: number | null): Promise<Quote> {
        return (await request<Wrapped<Quote>>('PATCH', `quote-lines/${lineId}/article`, { article_id: articleId })).data
      },
      /** Lie les lignes sans article aux articles de même référence (ou désignation). */
      async linkArticles(id: number): Promise<{ quote: Quote; linked: number; message: string }> {
        const r = await request<{ data: Quote; linked: number; message: string }>('POST', `quotes/${id}/link-articles`)
        return { quote: r.data, linked: r.linked, message: r.message }
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
      /**
       * Quantitatif du devis, sans prix ni forfaits (main-d'œuvre) : toutes les sections visibles
       * (avec un récapitulatif), ou une seule avec `sectionId`. PDF par défaut, ou CSV pour un tableur.
       */
      quantities(id: number, options: { format?: 'pdf' | 'csv'; sectionId?: number; neutral?: boolean } = {}): Promise<Blob> {
        const params = new URLSearchParams()
        if (options.format) params.set('format', options.format)
        if (options.sectionId !== undefined) params.set('section_id', String(options.sectionId))
        if (options.neutral !== undefined) params.set('neutral', options.neutral ? '1' : '0')
        const query = params.toString()
        return requestBlob(`quotes/${id}/quantities${query ? `?${query}` : ''}`)
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
      /** Matériel livré : les lignes liées à un article sortent du stock (tout ou rien). */
      async releaseDeliveryNote(noteId: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `delivery-notes/${noteId}/release`)).data
      },
      /** Annule la sortie : les articles reviennent en stock. */
      async restockDeliveryNote(noteId: number): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `delivery-notes/${noteId}/restock`)).data
      },
      deliveryNotePdf(noteId: number): Promise<Blob> {
        return requestBlob(`delivery-notes/${noteId}/pdf`)
      },
      /**
       * Destinataires proposés (contacts liés au devis d'abord, puis client et ses contacts), objet et message.
       * `document: 'proposal'` : pour envoyer la proposition technique seule.
       */
      async emailDraft(id: number, document: QuoteEmailDocument = 'quote'): Promise<QuoteEmailDraft> {
        return (await request<Wrapped<QuoteEmailDraft>>('GET', `quotes/${id}/email-draft${document === 'proposal' ? '?document=proposal' : ''}`)).data
      },
      /** Lignes retirées du quantitatif (`hidden`) ; les autres y sont. Possible même sur un devis accepté. */
      async setQuantitiesLines(id: number, hidden: number[]): Promise<Quote> {
        return (await request<Wrapped<Quote>>('POST', `quotes/${id}/quantities/lines`, { hidden })).data
      },
      /** Envoie le devis par e-mail avec son PDF (un brouillon passe à « Envoyé »), ou la proposition seule (`document: 'proposal'`). */
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
      /** Relance suivante proposée (`level` : numéro de la relance). */
      async reminderDraft(id: number): Promise<QuoteEmailDraft & { level: number }> {
        return (await request<Wrapped<QuoteEmailDraft & { level: number }>>('GET', `invoices/${id}/reminder-draft`)).data
      },
      async remind(id: number, payload: Omit<QuoteEmailPayload, 'attach_proposal'>): Promise<Invoice> {
        return (await request<Wrapped<Invoice>>('POST', `invoices/${id}/remind`, payload)).data
      },
      /** Avoir : `amount` absent = tout ce qui reste à annuler. */
      async createCreditNote(id: number, payload: { reason: string; amount?: number; issued_at?: string }): Promise<{ id: number; number: string; amount: number }> {
        return (await request<Wrapped<{ id: number; number: string; amount: number }>>('POST', `invoices/${id}/credit-notes`, payload)).data
      },
      creditNotePdf(creditNoteId: number): Promise<Blob> {
        return requestBlob(`credit-notes/${creditNoteId}/pdf`)
      },
      /** Échéancier des encaissements attendus (factures, acomptes, contrats). */
      async schedule(months = 6): Promise<{ data: ScheduleItem[]; meta: { total: number; overdue: number } }> {
        return request('GET', 'invoices/schedule', undefined, { months })
      },
    },

    brands: {
      async list(search?: string): Promise<Brand[]> {
        return (await request<Wrapped<Brand[]>>('GET', 'brands', undefined, { search })).data
      },
      async get(id: number): Promise<Brand> {
        return (await request<Wrapped<Brand>>('GET', `brands/${id}`)).data
      },
      async uploadLogo(id: number, file: Blob, filename = 'logo'): Promise<Brand> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<Brand>>('POST', `brands/${id}/logo`, form)).data
      },
      async removeLogo(id: number): Promise<Brand> {
        return (await request<Wrapped<Brand>>('DELETE', `brands/${id}/logo`)).data
      },
      async create(payload: { name: string; description?: string | null; website?: string | null }): Promise<Brand> {
        return (await request<Wrapped<Brand>>('POST', 'brands', payload)).data
      },
      async update(id: number, payload: { name?: string; description?: string | null; website?: string | null }): Promise<Brand> {
        return (await request<Wrapped<Brand>>('PATCH', `brands/${id}`, payload)).data
      },
      /** Refusé tant que la marque a des articles. */
      async remove(id: number): Promise<void> {
        await request('DELETE', `brands/${id}`)
      },
    },

    providers: {
      list(filters: SyncFilters & { search?: string } = {}): Promise<SyncPaginated<Provider>> {
        return request('GET', 'providers', undefined, { ...filters })
      },
      async get(id: number): Promise<Provider> {
        return (await request<Wrapped<Provider>>('GET', `providers/${id}`)).data
      },
      async uploadLogo(id: number, file: Blob, filename = 'logo'): Promise<Provider> {
        const form = new FormData()
        form.append('logo', file, filename)
        return (await request<Wrapped<Provider>>('POST', `providers/${id}/logo`, form)).data
      },
      async removeLogo(id: number): Promise<Provider> {
        return (await request<Wrapped<Provider>>('DELETE', `providers/${id}/logo`)).data
      },
      async create(payload: ProviderPayload & { name: string }): Promise<Provider> {
        return (await request<Wrapped<Provider>>('POST', 'providers', payload)).data
      },
      async update(id: number, payload: ProviderPayload): Promise<Provider> {
        return (await request<Wrapped<Provider>>('PATCH', `providers/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `providers/${id}`)
      },
    },

    /** Articles du stock : quantité changée seulement par les mouvements (`stock.move`). */
    articles: {
      list(filters: ArticleFilters = {}): Promise<SyncPaginated<Article>> {
        const { low, active, ...rest } = filters
        return request('GET', 'articles', undefined, {
          ...rest,
          ...(low ? { low: 1 } : {}),
          ...(active === undefined ? {} : { active: active === 'all' ? 'all' : active ? 1 : 0 }),
        })
      },
      async summary(): Promise<StockSummary> {
        return (await request<Wrapped<StockSummary>>('GET', 'articles/summary')).data
      },
      /** Fiche : articles liés et 50 derniers mouvements. */
      async get(id: number): Promise<Article> {
        return (await request<Wrapped<Article>>('GET', `articles/${id}`)).data
      },
      /** Code-barres ou référence exacte (scan). */
      async findByBarcode(code: string): Promise<Article | null> {
        const result = await request<SyncPaginated<Article>>('GET', 'articles', undefined, { barcode: code, active: 'all' })
        return result.data[0] ?? null
      },
      async create(payload: ArticlePayload & { designation: string }): Promise<Article> {
        return (await request<Wrapped<Article>>('POST', 'articles', payload)).data
      },
      async update(id: number, payload: ArticlePayload): Promise<Article> {
        return (await request<Wrapped<Article>>('PATCH', `articles/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `articles/${id}`)
      },
      /** Copie l'article (sans son image ni sa quantité en stock, qui démarre à 0). */
      async duplicate(id: number): Promise<Article> {
        return (await request<Wrapped<Article>>('POST', `articles/${id}/duplicate`)).data
      },
      async uploadImage(id: number, file: Blob, filename = 'image'): Promise<Article> {
        const form = new FormData()
        form.append('image', file, filename)
        return (await request<Wrapped<Article>>('POST', `articles/${id}/image`, form)).data
      },
      async removeImage(id: number): Promise<Article> {
        return (await request<Wrapped<Article>>('DELETE', `articles/${id}/image`)).data
      },
      async setDependencies(id: number, items: Array<{ article_id: number; quantity: number }>): Promise<Article> {
        return (await request<Wrapped<Article>>('PUT', `articles/${id}/dependencies`, { items })).data
      },
      /** Entrée, sortie ou inventaire ; renvoie l'article à jour. */
      async move(id: number, payload: StockMovementPayload): Promise<Article> {
        return (await request<Wrapped<Article>>('POST', `articles/${id}/movements`, payload)).data
      },
      movements(filters: { article_id?: number; project_id?: number; type?: string; from?: string; to?: string; search?: string; page?: number; per_page?: number } = {}): Promise<Paginated<StockMovement>> {
        return request('GET', 'stock-movements', undefined, { ...filters })
      },
    },

    /** Achats : brouillon → commandé → reçu en partie → reçu. */
    purchases: {
      list(filters: PurchaseFilters = {}): Promise<SyncPaginated<Purchase>> {
        const { open, ...rest } = filters
        return request('GET', 'purchases', undefined, { ...rest, ...(open ? { open: 1 } : {}) })
      },
      async get(id: number): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('GET', `purchases/${id}`)).data
      },
      async create(payload: PurchasePayload & { provider_id: number }): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('POST', 'purchases', payload)).data
      },
      async update(id: number, payload: Omit<PurchasePayload, 'lines' | 'low_stock' | 'client_uuid'>): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('PATCH', `purchases/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `purchases/${id}`)
      },
      async addLine(id: number, payload: PurchaseLinePayload): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('POST', `purchases/${id}/lines`, payload)).data
      },
      async updateLine(lineId: number, payload: PurchaseLinePayload): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('PATCH', `purchase-lines/${lineId}`, payload)).data
      },
      async removeLine(lineId: number): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('DELETE', `purchase-lines/${lineId}`)).data
      },
      async order(id: number, payload: { ordered_at?: string; expected_at?: string | null } = {}): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('POST', `purchases/${id}/order`, payload)).data
      },
      async cancel(id: number): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('POST', `purchases/${id}/cancel`)).data
      },
      async receive(id: number, payload: PurchaseReceivePayload = {}): Promise<Purchase> {
        return (await request<Wrapped<Purchase>>('POST', `purchases/${id}/receive`, payload)).data
      },
      /** Bon de commande (`costs.view`). */
      pdf(id: number): Promise<Blob> {
        return requestBlob(`purchases/${id}/pdf`)
      },
    },

    /** Tâches et planning ; `update` avec `status` seul : personnes affectées comprises. */
    tasks: {
      list(filters: TaskFilters = {}): Promise<SyncPaginated<Task>> {
        const { open, overdue, unscheduled, ...rest } = filters
        return request('GET', 'tasks', undefined, {
          ...rest,
          ...(open ? { open: 1 } : {}),
          ...(overdue ? { overdue: 1 } : {}),
          ...(unscheduled ? { unscheduled: 1 } : {}),
        })
      },
      async summary(): Promise<TaskSummary> {
        return (await request<Wrapped<TaskSummary>>('GET', 'tasks/summary')).data
      },
      async get(id: number): Promise<Task> {
        return (await request<Wrapped<Task>>('GET', `tasks/${id}`)).data
      },
      async create(payload: TaskPayload & { title: string }): Promise<Task> {
        return (await request<Wrapped<Task>>('POST', 'tasks', payload)).data
      },
      async update(id: number, payload: Omit<TaskPayload, 'subtasks' | 'client_uuid'>): Promise<Task> {
        return (await request<Wrapped<Task>>('PATCH', `tasks/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `tasks/${id}`)
      },
      async addSubtask(id: number, title: string): Promise<Task> {
        return (await request<Wrapped<Task>>('POST', `tasks/${id}/subtasks`, { title })).data
      },
      async updateSubtask(subtaskId: number, payload: { title?: string; is_done?: boolean }): Promise<Task> {
        return (await request<Wrapped<Task>>('PATCH', `subtasks/${subtaskId}`, payload)).data
      },
      async removeSubtask(subtaskId: number): Promise<Task> {
        return (await request<Wrapped<Task>>('DELETE', `subtasks/${subtaskId}`)).data
      },
    },

    /** Dépenses : chacun les siennes (à valider), le comptable toutes (`accounting.*`). */
    expenses: {
      list(filters: ExpenseFilters = {}): Promise<SyncPaginated<Expense>> {
        return request('GET', 'expenses', undefined, { ...filters })
      },
      async summary(): Promise<ExpenseSummary> {
        return (await request<Wrapped<ExpenseSummary>>('GET', 'expenses/summary')).data
      },
      async get(id: number): Promise<Expense> {
        return (await request<Wrapped<Expense>>('GET', `expenses/${id}`)).data
      },
      /** Avec `file` : justificatif (photo, PDF) envoyé en même temps. */
      async create(payload: ExpensePayload & { label: string; amount: number; spent_at: string }, file?: Blob, filename?: string): Promise<Expense> {
        return (await request<Wrapped<Expense>>('POST', 'expenses', file ? toForm(payload, file, filename) : payload)).data
      },
      async update(id: number, payload: ExpensePayload): Promise<Expense> {
        return (await request<Wrapped<Expense>>('PATCH', `expenses/${id}`, payload)).data
      },
      async uploadReceipt(id: number, file: Blob, filename = 'justificatif'): Promise<Expense> {
        return (await request<Wrapped<Expense>>('POST', `expenses/${id}/receipt`, toForm({}, file, filename))).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `expenses/${id}`)
      },
      async approve(id: number): Promise<Expense> {
        return (await request<Wrapped<Expense>>('POST', `expenses/${id}/approve`)).data
      },
      async reject(id: number, reason: string): Promise<Expense> {
        return (await request<Wrapped<Expense>>('POST', `expenses/${id}/reject`, { reason })).data
      },
      async reimburse(id: number): Promise<Expense> {
        return (await request<Wrapped<Expense>>('POST', `expenses/${id}/reimburse`)).data
      },
    },

    expenseCategories: {
      async list(all = false): Promise<ExpenseCategory[]> {
        return (await request<Wrapped<ExpenseCategory[]>>('GET', 'expense-categories', undefined, all ? { all: 1 } : undefined)).data
      },
      async create(payload: { name: string; color?: string | null }): Promise<ExpenseCategory> {
        return (await request<Wrapped<ExpenseCategory>>('POST', 'expense-categories', payload)).data
      },
      async update(id: number, payload: { name?: string; color?: string | null; is_active?: boolean }): Promise<ExpenseCategory> {
        return (await request<Wrapped<ExpenseCategory>>('PATCH', `expense-categories/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `expense-categories/${id}`)
      },
    },

    /** Caisses : membres, versements, solde. */
    expenseSpaces: {
      async list(all = false): Promise<ExpenseSpace[]> {
        return (await request<Wrapped<ExpenseSpace[]>>('GET', 'expense-spaces', undefined, all ? { all: 1 } : undefined)).data
      },
      async get(id: number): Promise<ExpenseSpace> {
        return (await request<Wrapped<ExpenseSpace>>('GET', `expense-spaces/${id}`)).data
      },
      async create(payload: { name: string; description?: string | null; member_ids?: number[] }): Promise<ExpenseSpace> {
        return (await request<Wrapped<ExpenseSpace>>('POST', 'expense-spaces', payload)).data
      },
      /** `member_ids` : remplacent les membres. */
      async update(id: number, payload: { name?: string; description?: string | null; is_active?: boolean; member_ids?: number[] }): Promise<ExpenseSpace> {
        return (await request<Wrapped<ExpenseSpace>>('PATCH', `expense-spaces/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `expense-spaces/${id}`)
      },
      async fund(id: number, payload: { amount: number; funded_at?: string; method?: string | null; note?: string | null }): Promise<ExpenseSpace> {
        return (await request<Wrapped<ExpenseSpace>>('POST', `expense-spaces/${id}/fundings`, payload)).data
      },
      async removeFunding(fundingId: number): Promise<ExpenseSpace> {
        return (await request<Wrapped<ExpenseSpace>>('DELETE', `expense-space-fundings/${fundingId}`)).data
      },
    },

    transactions: {
      list(filters: AccountingFilters & { direction?: 'in' | 'out'; page?: number; per_page?: number } = {}): Promise<Paginated<Transaction>> {
        return request('GET', 'transactions', undefined, { ...filters })
      },
      async create(payload: TransactionPayload & { direction: 'in' | 'out'; label: string; amount: number; transacted_at: string }): Promise<Transaction> {
        return (await request<Wrapped<Transaction>>('POST', 'transactions', payload)).data
      },
      async update(id: number, payload: TransactionPayload): Promise<Transaction> {
        return (await request<Wrapped<Transaction>>('PATCH', `transactions/${id}`, payload)).data
      },
      async remove(id: number): Promise<void> {
        await request('DELETE', `transactions/${id}`)
      },
    },

    /** Bilan et journal (`accounting.view`) ; période par défaut : l'année en cours. */
    accounting: {
      async summary(filters: AccountingFilters = {}): Promise<AccountingSummary> {
        return (await request<Wrapped<AccountingSummary>>('GET', 'accounting/summary', undefined, { ...filters })).data
      },
      ledger(filters: AccountingFilters & { direction?: 'in' | 'out'; source?: string; search?: string; page?: number; per_page?: number } = {}): Promise<Paginated<LedgerEntry>> {
        return request('GET', 'accounting/ledger', undefined, { ...filters })
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
