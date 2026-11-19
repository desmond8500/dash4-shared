# Dash4 — code partagé

Types TypeScript, client de l'API et règles de droits utilisés par **dash4-web** et **dash4-mobile**.

```ts
import { createApiClient, can } from '@dash4/shared'

const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL, // ex. https://api.dash4.yonkou.info/api
  storage: { get: () => localStorage.getItem('token'), set: (t) => (t ? localStorage.setItem('token', t) : localStorage.removeItem('token')) },
  onUnauthorized: () => router.push('/connexion'),
})

const { user } = await api.auth.login({ email, password, device_name: 'Web' })
if (can(user, 'users.view')) { /* … */ }
```

Modules disponibles : `auth`, `users`, `roles`, `clients`, `contacts`, `clientRequests` (+ `summary`), `assignees`, `notifications`, `projects` (+ logo), `notes`, `links`, `documents` (`upload`, `download`), `company` (+ signature, cachet), `bankAccounts`, `settings`, `quotes` (sections, lignes, statut, duplication, PDF, copie signée, proposition technique, acomptes, dépenses, bordereaux, envoi par e-mail), `quoteTemplates` (systèmes et modèles), `emailSignatures` (`list`, `get`, `create`, `update`, `remove`) ; logo d'un client : `clients.uploadLogo(id, fichier)` et `clients.removeLogo(id)`.

Montants : `computeTotals(ht, 'vat' | 'brs' | 'none', settings)` (TVA ajoutée, BRS déduite), `formatMoney(1250000)` → « 1 250 000 F CFA », `formatDocumentNumber('DEV-{YYYY}-{####}', 1)`.

Synchronisation du mobile : `api.syncAll((f) => api.clients.list(f), derniereSynchro)` renvoie toutes les fiches modifiées depuis (suppressions comprises, `deleted_at` rempli) et le `serverTime` à garder pour la synchro suivante.

## Installation dans un projet

Le paquet est installé directement depuis GitHub :

```json
"dependencies": { "@dash4/shared": "github:desmond8500/dash4-shared#main" }
```

npm lance `prepare`, qui compile `src/` vers `dist/`. Le `package-lock.json` du projet fige le commit utilisé ;
`npm update @dash4/shared` récupère la dernière version de `main`.

## Développement

```bash
npm install
npm test          # Vitest
npm run typecheck
npm run build
```

À chaque changement de l'API (dash4-api), mettre à jour `src/types.ts` et la version dans `package.json`, puis lancer `npm update @dash4/shared` dans dash4-web et dash4-mobile. Des tags (`v0.2.0`…) peuvent être ajoutés depuis GitHub pour figer des versions.

Les règles de droits (`can`, `canSee`, `isTechnician`…) ne font que **cacher** ce que l'API refuse déjà : la vérification réelle est toujours faite par le serveur.

### Factures (0.10.0)

`api.invoices` : `list` (filtres `status`, `unpaid`, `overdue`, `client_id`, `quote_id`…), `summary`, `create`
(depuis un devis : `{ quote_id, scope, percent, title }` ; depuis un acompte : `{ quote_deposit_id }` ; libre :
`{ client_id, title }`), `update`, lignes, `issue`, `cancel`, `addPayment` / `removePayment`, `pdf`, `emailDraft`, `send`.
Listes `INVOICE_SCOPES` et `PAYMENT_METHODS` pour les formulaires.

### Stock et achats (0.11.0)

`api.brands`, `api.providers`, `api.articles` (`list` avec `low`, `barcode`, `category`… ; `findByBarcode` pour le scan ;
`move` : entrée / sortie / inventaire ; `setDependencies`, image, `movements`), `api.purchases` (`create` avec `low_stock`,
lignes, `order`, `cancel`, `receive`, `pdf`). Bordereaux : `api.quotes.releaseDeliveryNote` / `restockDeliveryNote`.

### Comptabilité (0.12.0)

`api.expenses` (`create` avec justificatif facultatif, `approve`, `reject`, `reimburse`, `uploadReceipt`, `summary`),
`api.expenseCategories`, `api.expenseSpaces` (caisses : membres, `fund`, solde), `api.transactions`,
`api.accounting.summary` / `ledger` (bilan : factures encaissées, dépenses validées, achats reçus, transactions).

### Tâches (0.13.0)

`api.tasks` : `list` (planning : `from` + `to` ; `open`, `overdue`, `unscheduled`, `assigned_to: 'me'`…), `summary`,
`create` (avec `assignee_ids`, `subtasks`), `update` (`status` seul : personnes affectées), sous-tâches.
`api.clientRequests.convert(id, { type: 'task' })`.

### Emplacements, boîte mail, liens des demandes (0.14.0)

`api.storageLocations`, `api.articles.list({ storage_location_id })` ; `api.inbox` (`list`, `get`, `fetch`, `convert`, `ignore`,
`attachment`) ; `api.clientRequestLinks` (`candidates`, `add`, `remove`).

### Journaux d'intervention (0.15.0)

`api.journals` : `list` (`project_id`, `task_id`, `from`, `to`, `mine`…), `get`, `create` (`sections`, `participants`, `task_id`),
`update` (sections et intervenants remplacés), `remove`, `pdf`. Photos : `api.documents.upload('journals', id, …)`.
