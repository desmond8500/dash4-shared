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
