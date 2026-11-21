import { describe, expect, it } from 'vitest'
import { alertText, daysUntil, fleetSeverity, formatKm, vehicleSubtitle } from '../src/fleet.js'

describe('fleet', () => {
  it('donne la gravité et le texte des alertes', () => {
    expect(fleetSeverity('expired')).toBe('danger')
    expect(fleetSeverity('soon')).toBe('warn')
    expect(fleetSeverity(null)).toBe('secondary')
    expect(alertText({ kind: 'paper', state: 'expired', label: 'Assurance', date: '2027-03-12' })).toBe('Assurance : échéance dépassée (12/03/2027)')
    expect(alertText({ kind: 'maintenance', state: 'late', label: 'Vidange', date: null })).toBe('Vidange : en retard')
  })

  it('met en forme le véhicule, les kilomètres et les jours restants', () => {
    expect(vehicleSubtitle({ brand: 'Yamaha', model: 'NMax', plate: 'DK-1234-AB' })).toBe('Yamaha NMax · DK-1234-AB')
    expect(vehicleSubtitle({ brand: null, model: null, plate: null })).toBe('')
    expect(formatKm(12500)).toBe('12 500 km')
    expect(formatKm(null)).toBe('—')
    expect(daysUntil('2026-12-01', new Date(2026, 10, 21))).toBe(10)
    expect(daysUntil('2026-11-20', new Date(2026, 10, 21))).toBe(-1)
  })
})
