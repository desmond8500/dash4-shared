import { describe, expect, it } from 'vitest'
import { can, canSee, isAdmin, isReadOnly, isTechnician, rolesForAccountType } from '../src'
import type { CurrentUser } from '../src'

function user(partial: Partial<CurrentUser>): CurrentUser {
  return {
    id: 1,
    firstname: 'Awa',
    lastname: 'Diop',
    full_name: 'Awa Diop',
    email: 'awa@example.com',
    phone: null,
    job_title: null,
    account_type: { value: 'manager', label: 'Gestionnaire' },
    is_active: true,
    roles: [{ name: 'sales', label: 'Commercial' }],
    permissions: ['quotes.view', 'tasks.view.own'],
    last_login_at: null,
    created_at: null,
    updated_at: null,
    ...partial,
  }
}

describe('permissions', () => {
  it('vérifie une permission', () => {
    expect(can(user({}), 'quotes.view')).toBe(true)
    expect(can(user({}), 'invoices.view')).toBe(false)
    expect(can(null, 'quotes.view')).toBe(false)
  })

  it('voit un module en entier ou seulement ses éléments', () => {
    expect(canSee(user({}), 'quotes')).toBe(true)
    expect(canSee(user({}), 'tasks')).toBe(true)
    expect(canSee(user({}), 'invoices')).toBe(false)
  })

  it('reconnaît un technicien et un administrateur', () => {
    expect(isTechnician(user({ account_type: { value: 'technician', label: 'Technicien' } }))).toBe(true)
    expect(isAdmin(user({ roles: [{ name: 'admin', label: 'Administrateur' }] }))).toBe(true)
    expect(isAdmin(user({}))).toBe(false)
  })

  it('ne propose que le rôle Technicien à un compte technicien', () => {
    expect(rolesForAccountType('technician')).toEqual(['technician'])
    expect(rolesForAccountType('manager')).not.toContain('technician')
  })
})

describe('compte lecture seule', () => {
  it('se reconnaît à son rôle et se propose pour un compte gestionnaire', () => {
    const user = { permissions: ['quotes.view'], account_type: { value: 'manager', label: 'Gestionnaire' }, roles: [{ name: 'viewer', label: 'Lecture seule' }] } as never
    expect(isReadOnly(user)).toBe(true)
    expect(rolesForAccountType('manager')).toContain('viewer')
  })
})
