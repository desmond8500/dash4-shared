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
