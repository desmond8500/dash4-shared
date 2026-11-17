import type { CurrentUser, RoleName } from './types.js'

/**
 * Règles de droits côté interface.
 * Elles ne font que cacher ce que l'API refuse déjà : la vraie vérification est faite par le serveur.
 */

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: 'Administrateur',
  manager: 'Manager',
  project_manager: 'Chef de projet',
  sales: 'Commercial',
  accountant: 'Comptable',
  storekeeper: 'Magasinier',
  technician: 'Technicien',
}

export const MANAGER_ROLES: RoleName[] = [
  'admin',
  'manager',
  'project_manager',
  'sales',
  'accountant',
  'storekeeper',
]

type MaybeUser = Pick<CurrentUser, 'permissions' | 'account_type' | 'roles'> | null | undefined

/** Vrai si l'utilisateur a la permission (ex. `quotes.view`). */
export function can(user: MaybeUser, permission: string): boolean {
  return !!user && user.permissions.includes(permission)
}

/** Vrai si l'utilisateur a au moins une des permissions. */
export function canAny(user: MaybeUser, permissions: string[]): boolean {
  return permissions.some((permission) => can(user, permission))
}

/**
 * Vrai si l'utilisateur peut voir un module, en entier ou seulement ses éléments
 * (`clients.view` ou `clients.view.own`).
 */
export function canSee(user: MaybeUser, module: string): boolean {
  return canAny(user, [`${module}.view`, `${module}.view.own`])
}

export function isTechnician(user: MaybeUser): boolean {
  return user?.account_type.value === 'technician'
}

export function hasRole(user: MaybeUser, role: RoleName): boolean {
  return !!user && user.roles.some((r) => r.name === role)
}

export function isAdmin(user: MaybeUser): boolean {
  return hasRole(user, 'admin')
}

/** Rôles proposables pour un type de compte (un technicien n'a que le rôle Technicien). */
export function rolesForAccountType(accountType: 'manager' | 'technician'): RoleName[] {
  return accountType === 'technician' ? ['technician'] : MANAGER_ROLES
}
