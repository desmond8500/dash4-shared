/**
 * Types des réponses de l'API Dash4 (dash4-api, /api/v1).
 * À garder alignés sur les API Resources Laravel.
 */

export type AccountType = 'manager' | 'technician'

export type RoleName =
  | 'admin'
  | 'manager'
  | 'project_manager'
  | 'sales'
  | 'accountant'
  | 'storekeeper'
  | 'technician'

export interface LabelledValue<T extends string = string> {
  value: T
  label: string
}

export interface RoleRef {
  name: RoleName
  label: string
}

export interface User {
  id: number
  firstname: string
  lastname: string
  full_name: string
  email: string
  phone: string | null
  job_title: string | null
  account_type: LabelledValue<AccountType>
  is_active: boolean
  roles: RoleRef[]
  /** Présent seulement pour l'utilisateur connecté (/auth/me, /auth/login). */
  permissions?: string[]
  last_login_at: string | null
  created_at: string | null
  updated_at: string | null
}

/** Utilisateur connecté : les permissions sont toujours présentes. */
export interface CurrentUser extends User {
  permissions: string[]
}

export interface Role {
  name: RoleName
  label: string
  account_type: AccountType
  permissions: string[]
}

export interface LoginPayload {
  email: string
  password: string
  device_name?: string
}

export interface LoginResponse {
  token: string
  token_type: 'Bearer'
  expires_at: string
  user: CurrentUser
}

export interface UserPayload {
  firstname: string
  lastname: string
  email: string
  phone?: string | null
  job_title?: string | null
  account_type: AccountType
  password?: string
  roles: RoleName[]
  is_active?: boolean
}

export interface UserFilters {
  search?: string
  account_type?: AccountType
  is_active?: boolean
  role?: RoleName
  page?: number
  per_page?: number
}

export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface Wrapped<T> {
  data: T
}

/** Valeur d'énumération renvoyée par l'API : code + libellé français. */
export interface Labelled<V extends string> {
  value: V
  label: string
}

/** Réponse de liste paginée ; `meta.server_time` sert de `updated_since` à la synchro suivante. */
export interface SyncPaginated<T> {
  data: T[]
  meta: PaginationMeta & { server_time: string }
}

export interface SyncFilters {
  /** Date ISO : ne renvoie que les fiches modifiées depuis, suppressions comprises. */
  updated_since?: string
  page?: number
  per_page?: number
}

// ---------------------------------------------------------------------------
// Clients et contacts
// ---------------------------------------------------------------------------

export type ClientType = 'company' | 'individual' | 'public_body' | 'association'
export type ClientStatus = 'prospect' | 'active' | 'inactive'
export type Civility = 'mr' | 'mrs'

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  company: 'Entreprise',
  individual: 'Particulier',
  public_body: 'Organisme public',
  association: 'Association',
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect',
  active: 'Client actif',
  inactive: 'Inactif',
}

export const CIVILITY_LABELS: Record<Civility, string> = {
  mr: 'M.',
  mrs: 'Mme',
}

export interface Phone {
  id: number
  label: string | null
  number: string
}

export interface Email {
  id: number
  label: string | null
  address: string
}

export interface PhoneInput {
  label?: string | null
  number: string
}

export interface EmailInput {
  label?: string | null
  address: string
}

export interface Contact {
  id: number
  client_uuid: string | null
  client_id: number | null
  client?: { id: number; name: string } | null
  civility: Labelled<Civility> | null
  firstname: string
  lastname: string | null
  full_name: string
  job_title: string | null
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
  phones?: Phone[]
  emails?: Email[]
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface Client {
  id: number
  client_uuid: string | null
  name: string
  type: Labelled<ClientType>
  status: Labelled<ClientStatus>
  description: string | null
  address: string | null
  is_favorite: boolean
  /** Adresse publique du logo, ou null. */
  logo_url: string | null
  contacts_count?: number
  /** Présents seulement sur la fiche (GET /clients/{id}). */
  contacts?: Contact[]
  phones?: Phone[]
  emails?: Email[]
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ClientPayload {
  /** Identifiant généré par le mobile pour éviter les doublons quand l'envoi est rejoué (création seulement). */
  client_uuid?: string
  name: string
  type?: ClientType
  status?: ClientStatus
  description?: string | null
  address?: string | null
  is_favorite?: boolean
  /** Envoyé : remplace la liste. Absent : la liste ne change pas. */
  phones?: PhoneInput[]
  emails?: EmailInput[]
}

export interface ClientFilters extends SyncFilters {
  search?: string
  type?: ClientType
  status?: ClientStatus
  favorite?: boolean
  sort?: 'name' | '-updated_at'
}

export interface ContactPayload {
  client_uuid?: string
  client_id?: number | null
  civility?: Civility | null
  firstname: string
  lastname?: string | null
  job_title?: string | null
  company?: string | null
  email?: string | null
  phone?: string | null
  notes?: string | null
  phones?: PhoneInput[]
  emails?: EmailInput[]
}

export interface ContactFilters extends SyncFilters {
  search?: string
  client_id?: number
}

// ---------------------------------------------------------------------------
// Demandes clients
// ---------------------------------------------------------------------------

export type ClientRequestStatus = 'new' | 'in_progress' | 'done' | 'dismissed'
export type ClientRequestSource = 'phone' | 'whatsapp' | 'email' | 'visit' | 'other'
export type Priority = 'low' | 'normal' | 'high'

export const CLIENT_REQUEST_STATUS_LABELS: Record<ClientRequestStatus, string> = {
  new: 'Nouvelle',
  in_progress: 'En cours',
  done: 'Traitée',
  dismissed: 'Classée sans suite',
}

/** Statuts de la boîte « À traiter ». */
export const OPEN_CLIENT_REQUEST_STATUSES: ClientRequestStatus[] = ['new', 'in_progress']

export const CLIENT_REQUEST_SOURCE_LABELS: Record<ClientRequestSource, string> = {
  phone: 'Appel',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  visit: 'Visite',
  other: 'Autre',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Urgente',
}

export interface UserRef {
  id: number
  full_name: string
}

export interface ClientRequest {
  id: number
  client_uuid: string | null
  body: string
  client_id: number | null
  client?: { id: number; name: string } | null
  /** Personne qui n'est pas encore cliente. */
  contact_name: string | null
  contact_phone: string | null
  source: Labelled<ClientRequestSource>
  status: Labelled<ClientRequestStatus>
  priority: Labelled<Priority>
  assigned_to: number | null
  assignee?: UserRef | null
  creator?: UserRef | null
  processor?: UserRef | null
  remind_at: string | null
  processed_at: string | null
  /** Encore « Nouvelle » après le délai de relance (2 jours par défaut). */
  is_overdue: boolean
  /** Ce que la demande est devenue (tâche, devis, projet…). */
  converted_to: { type: string; id: number } | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ClientRequestPayload {
  client_uuid?: string
  body: string
  client_id?: number | null
  contact_name?: string | null
  contact_phone?: string | null
  source?: ClientRequestSource
  /** Ignorés pour un compte qui ne traite pas les demandes (technicien). */
  status?: ClientRequestStatus
  priority?: Priority
  assigned_to?: number | null
  remind_at?: string | null
}

export interface ClientRequestFilters extends SyncFilters {
  /** Boîte « À traiter » : Nouvelle et En cours. */
  open?: boolean
  /** Plusieurs statuts séparés par des virgules, ex. `done,dismissed`. */
  status?: string
  assigned?: 'me' | 'none'
  client_id?: number
  priority?: Priority
  source?: ClientRequestSource
  overdue?: boolean
  search?: string
}

export interface ClientRequestSummary {
  open: number
  new: number
  overdue: number
  mine: number
  reminders_due: number
  overdue_days: number
}

export interface Assignee {
  id: number
  full_name: string
  job_title: string | null
  account_type: AccountType
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface AppNotification {
  id: string
  /** Ex. `client_request.overdue`, `client_request.reminder`. */
  kind: string
  title: string
  body: string
  client_request_id?: number
  read_at: string | null
  created_at: string | null
}

export interface NotificationPage {
  data: AppNotification[]
  meta: { current_page: number; last_page: number; per_page: number; total: number; unread_count: number }
}

// ---------------------------------------------------------------------------
// Projets, notes, liens et documents
// ---------------------------------------------------------------------------

export type ProjectStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: 'À venir',
  in_progress: 'En cours',
  on_hold: 'En pause',
  completed: 'Terminé',
  cancelled: 'Annulé',
}

/** Projets encore actifs (liste par défaut). */
export const ACTIVE_PROJECT_STATUSES: ProjectStatus[] = ['planned', 'in_progress', 'on_hold']

/** Fiches qui acceptent notes, liens et documents (segment de l'adresse de l'API). */
export type AttachableType = 'clients' | 'projects' | 'quotes'

export interface Note {
  id: number
  client_uuid: string | null
  body: string
  is_pinned: boolean
  creator?: UserRef | null
  created_at: string | null
  updated_at: string | null
}

export interface NotePayload {
  client_uuid?: string
  body: string
  is_pinned?: boolean
}

export interface Link {
  id: number
  client_uuid: string | null
  label: string | null
  url: string
  creator?: UserRef | null
  created_at: string | null
}

export interface LinkPayload {
  client_uuid?: string
  label?: string | null
  url: string
}

export interface Document {
  id: number
  name: string
  mime_type: string | null
  size: number
  /** Chemin à passer à `api.documents.download` (fichier privé). */
  download_path: string
  creator?: UserRef | null
  created_at: string | null
}

export interface Project {
  id: number
  client_uuid: string | null
  name: string
  description: string | null
  status: Labelled<ProjectStatus>
  client_id: number | null
  client?: { id: number; name: string } | null
  manager_id: number | null
  manager?: UserRef | null
  start_date: string | null
  end_date: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  logo_url: string | null
  is_favorite: boolean
  notes_count?: number
  links_count?: number
  documents_count?: number
  /** Sur la fiche, ou dans la liste avec `include=notes,links`. */
  notes?: Note[]
  links?: Link[]
  documents?: Document[]
  /** Le compte connecté peut modifier ce projet (droits et « ses projets »). */
  can_update: boolean
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface ProjectPayload {
  client_uuid?: string
  name: string
  client_id: number
  description?: string | null
  status?: ProjectStatus
  manager_id?: number | null
  start_date?: string | null
  end_date?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  is_favorite?: boolean
}

export interface ProjectFilters extends SyncFilters {
  search?: string
  /** Plusieurs statuts séparés par des virgules. */
  status?: string
  /** À venir, en cours, en pause. */
  active?: boolean
  client_id?: number
  manager?: 'me'
  favorite?: boolean
  /** Synchro du mobile : `notes,links`. */
  include?: string
}

// ---------------------------------------------------------------------------
// Entreprise, banque, paramètres
// ---------------------------------------------------------------------------

/** TVA ajoutée, BRS (retenue à la source, entreprises individuelles) déduite, ou sans taxe. */
export type TaxMode = 'vat' | 'brs' | 'none'

export const TAX_MODE_LABELS: Record<TaxMode, string> = {
  vat: 'TVA',
  brs: 'BRS (retenue à la source)',
  none: 'Sans taxe',
}

export type DocumentType = 'quote' | 'invoice' | 'credit_note' | 'delivery_note' | 'purchase_order'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  quote: 'Devis',
  invoice: 'Factures',
  credit_note: 'Avoirs',
  delivery_note: 'Bons de livraison',
  purchase_order: 'Bons de commande',
}

export type SignatureDocument = 'quote' | 'invoice' | 'delivery_note' | 'report' | 'acceptance'

export const SIGNATURE_DOCUMENT_LABELS: Record<SignatureDocument, string> = {
  quote: 'Devis',
  invoice: 'Factures',
  delivery_note: 'Bons de livraison',
  report: "Rapports d'intervention",
  acceptance: 'Procès-verbaux',
}

export interface Company {
  name: string
  legal_form: string | null
  logo_url: string | null
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  ninea: string | null
  rccm: string | null
  share_capital: string | null
  legal_mentions: string | null
  terms: string | null
  /** Seulement pour `signature.manage`. */
  signature?: {
    has_signature: boolean
    has_stamp: boolean
    on: Record<SignatureDocument, boolean>
  }
  updated_at: string | null
}

export type CompanyPayload = Partial<Omit<Company, 'logo_url' | 'signature' | 'updated_at'>> & {
  signature_on?: Partial<Record<SignatureDocument, boolean>>
}

export interface BankAccount {
  id: number
  label: string | null
  bank_name: string
  holder: string
  account_number: string
  iban: string | null
  bic: string | null
  is_default: boolean
  updated_at: string | null
}

export type BankAccountPayload = Omit<BankAccount, 'id' | 'updated_at' | 'is_default'> & { is_default?: boolean }

export type Currency = 'XOF' | 'EUR' | 'USD'

export interface AppSettings {
  currency: Currency
  vat_rate: number
  brs_rate: number
  default_tax: TaxMode
  /** Formats : {YYYY}, {YY}, {MM}, {####}. */
  numbering: Record<DocumentType, string>
  /** Prochain numéro de chaque type de document. */
  next_numbers: Record<DocumentType, string>
}

export type SettingsPayload = Partial<Omit<AppSettings, 'next_numbers' | 'numbering'>> & {
  numbering?: Partial<Record<DocumentType, string>>
}

// ---------------------------------------------------------------------------
// Devis
// ---------------------------------------------------------------------------

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'cancelled'

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Brouillon',
  sent: 'Envoyé',
  accepted: 'Accepté',
  refused: 'Refusé',
  cancelled: 'Annulé',
}

/** Changements de statut permis (même règle que l'API). Accepter / refuser : `quotes.validate`. */
export const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent', 'accepted', 'cancelled'],
  sent: ['draft', 'accepted', 'refused', 'cancelled'],
  accepted: ['sent', 'cancelled'],
  refused: ['draft'],
  cancelled: ['draft'],
}

/** Statuts où le devis se modifie encore ; sinon il se duplique. */
export const EDITABLE_QUOTE_STATUSES: QuoteStatus[] = ['draft', 'sent']

export type QuoteLineCategory = 'central' | 'device' | 'cable' | 'accessory' | 'service' | 'other'

export const QUOTE_LINE_CATEGORY_LABELS: Record<QuoteLineCategory, string> = {
  central: 'Centrale',
  device: 'Organe',
  cable: 'Câble',
  accessory: 'Accessoires',
  service: "Main-d'œuvre / forfait",
  other: 'Autre',
}

export interface QuoteLine {
  id: number
  quote_section_id: number
  position: number
  article_id: number | null
  designation: string
  reference: string | null
  comment: string | null
  category: Labelled<QuoteLineCategory>
  unit: string | null
  quantity: number
  /** Avec `prices.view`. */
  unit_price?: number
  line_total?: number
  /** Avec `costs.view` : prix unitaire = coût × coefficient. */
  unit_cost?: number
  coefficient?: number
}

export interface QuoteSection {
  id: number
  title: string
  position: number
  /** Section masquée : ni imprimée ni comptée. */
  is_visible: boolean
  subtotal?: number
  lines: QuoteLine[]
}

export interface Quote {
  id: number
  client_uuid: string | null
  number: string
  title: string
  status: Labelled<QuoteStatus>
  client_id: number
  client?: { id: number; name: string } | null
  project_id: number | null
  project?: { id: number; name: string } | null
  introduction: string | null
  payment_terms: string | null
  notes: string | null
  issued_at: string
  valid_until: string | null
  tax_mode: Labelled<TaxMode>
  vat_rate: number
  brs_rate: number
  discount_rate: number
  bank_account_id: number | null
  bank_account?: { id: number; bank_name: string; label: string | null } | null
  show_signature: boolean
  is_favorite: boolean
  /** Montants : `prices.view`. */
  subtotal?: number
  discount_amount?: number
  net_amount?: number
  tax_amount?: number
  total?: number
  /** Coûts et marge : `costs.view`. */
  cost_total?: number
  margin?: number
  margin_rate?: number | null
  /** Sur la fiche. */
  sections?: QuoteSection[]
  sent_at: string | null
  decided_at: string | null
  signed_at: string | null
  signed_document_id: number | null
  creator?: UserRef | null
  can: { update: boolean; validate: boolean; delete: boolean; export: boolean; edit_prices: boolean }
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface QuotePayload {
  client_uuid?: string
  client_id: number
  project_id?: number | null
  title: string
  introduction?: string | null
  payment_terms?: string | null
  notes?: string | null
  issued_at?: string
  valid_until?: string | null
  tax_mode?: TaxMode
  discount_rate?: number
  bank_account_id?: number | null
  show_signature?: boolean
  is_favorite?: boolean
}

export interface QuoteLinePayload {
  designation: string
  reference?: string | null
  comment?: string | null
  category?: QuoteLineCategory
  unit?: string | null
  quantity?: number
  /** Demandent `costs.view`. */
  unit_cost?: number
  coefficient?: number
  position?: number
  /** Déplacer la ligne dans une autre section du même devis. */
  quote_section_id?: number
}

export interface QuoteFilters extends SyncFilters {
  search?: string
  /** Plusieurs statuts séparés par des virgules. */
  status?: string
  client_id?: number
  project_id?: number
  year?: number
}
