import { describe, expect, it } from 'vitest'
import { loanDueText, toolSeverity } from '../src/tools.js'

describe('outillage', () => {
  const today = new Date(2026, 10, 24)

  it('décrit le retour prévu d’un prêt', () => {
    expect(loanDueText({ due_on: null, returned_at: null }, today)).toBe('Sans date de retour')
    expect(loanDueText({ due_on: '2026-11-24', returned_at: null }, today)).toBe("À rendre aujourd'hui")
    expect(loanDueText({ due_on: '2026-11-25', returned_at: null }, today)).toBe('À rendre demain')
    expect(loanDueText({ due_on: '2026-11-23', returned_at: null }, today)).toBe('En retard de 1 jour')
    expect(loanDueText({ due_on: '2026-11-20', returned_at: null }, today)).toBe('En retard de 4 jours')
    expect(loanDueText({ due_on: '2026-11-28', returned_at: null }, today)).toBe('À rendre le 28/11/2026')
  })

  it('donne une gravité à chaque état', () => {
    expect(toolSeverity('late')).toBe('danger')
    expect(toolSeverity('soon')).toBe('warn')
    expect(toolSeverity('available')).toBe('success')
    expect(toolSeverity('lent')).toBe('info')
    expect(toolSeverity('returned')).toBe('secondary')
  })
})

describe('libellés de l’outillage', () => {
  it('nomme chaque état et chaque disponibilité', async () => {
    const { TOOL_CONDITION_LABELS, TOOL_STATUS_LABELS } = await import('../src/types.js')
    expect(TOOL_CONDITION_LABELS.repair).toBe('En réparation')
    expect(TOOL_STATUS_LABELS.late).toBe('Prêté — en retard')
  })
})
