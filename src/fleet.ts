import type { PaperState, ServiceState, Vehicle, VehicleAlert } from './types.js'

/** Parc automobile : petites règles d'affichage partagées par le web et le mobile. */

/** Gravité d'une alerte pour l'affichage (Tag PrimeVue / couleur Ionic). */
export function fleetSeverity(state: PaperState | ServiceState | null | undefined): 'danger' | 'warn' | 'success' | 'secondary' {
  if (state === 'expired' || state === 'late') return 'danger'
  if (state === 'soon') return 'warn'
  if (state === 'ok') return 'success'
  return 'secondary'
}

/** Phrase courte pour une alerte : « Assurance : échéance dépassée (12/03/2027) », « Vidange : en retard ». */
export function alertText(alert: VehicleAlert): string {
  const date = alert.date ? new Date(`${alert.date}T00:00:00`).toLocaleDateString('fr-FR') : null
  if (alert.kind === 'paper') {
    return alert.state === 'expired' ? `${alert.label} : échéance dépassée${date ? ` (${date})` : ''}` : `${alert.label} : à renouveler avant le ${date}`
  }
  return alert.state === 'late' ? `${alert.label} : en retard${date ? ` (prévu le ${date})` : ''}` : `${alert.label} : à prévoir${date ? ` le ${date}` : ' bientôt'}`
}

/** « Yamaha NMax · DK-1234-AB » */
export function vehicleSubtitle(v: Pick<Vehicle, 'brand' | 'model' | 'plate'>): string {
  return [[v.brand, v.model].filter(Boolean).join(' '), v.plate].filter(Boolean).join(' · ')
}

/** Kilomètres lisibles : « 12 500 km ». */
export function formatKm(km: number | null | undefined): string {
  return km === null || km === undefined ? '—' : `${new Intl.NumberFormat('fr-FR').format(km).replace(/ /g, ' ')} km`
}

/** Nombre de jours restants avant une date (négatif si dépassée). */
export function daysUntil(date: string, today: Date = new Date()): number {
  const d = new Date(`${date}T00:00:00`)
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((d.getTime() - t.getTime()) / 86_400_000)
}
