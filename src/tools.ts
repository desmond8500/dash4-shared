import { daysUntil } from './fleet.js'
import type { ToolLoan, ToolLoanState, ToolStatus } from './types.js'

/** Outillage : petites règles d'affichage partagées par le web et le mobile. */

/** Gravité d'une disponibilité ou d'un prêt pour l'affichage (Tag PrimeVue / couleur Ionic). */
export function toolSeverity(state: ToolStatus | ToolLoanState): 'danger' | 'warn' | 'success' | 'info' | 'secondary' {
  if (state === 'late') return 'danger'
  if (state === 'soon' || state === 'unavailable') return 'warn'
  if (state === 'available') return 'success'
  if (state === 'lent' || state === 'ongoing') return 'info'
  return 'secondary'
}

/** Retour prévu d'un prêt : « À rendre aujourd'hui », « En retard de 3 jours », « À rendre le 28/11/2026 ». */
export function loanDueText(loan: Pick<ToolLoan, 'due_on' | 'returned_at'>, today: Date = new Date()): string {
  if (loan.returned_at) return `Rendu le ${new Date(loan.returned_at).toLocaleDateString('fr-FR')}`
  if (!loan.due_on) return 'Sans date de retour'
  const days = daysUntil(loan.due_on, today)
  if (days < 0) return `En retard de ${-days} jour${days < -1 ? 's' : ''}`
  if (days === 0) return "À rendre aujourd'hui"
  if (days === 1) return 'À rendre demain'
  return `À rendre le ${new Date(`${loan.due_on}T00:00:00`).toLocaleDateString('fr-FR')}`
}
