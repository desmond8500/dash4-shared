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

## Installation dans un projet

Le paquet est installé directement depuis GitHub, à une version figée par un tag :

```json
"dependencies": { "@dash4/shared": "github:desmond8500/dash4-shared#v0.1.0" }
```

npm lance `prepare`, qui compile `src/` vers `dist/`.

## Développement

```bash
npm install
npm test          # Vitest
npm run typecheck
npm run build
```

À chaque changement de l'API (dash4-api), mettre à jour `src/types.ts`, publier un nouveau tag (`v0.2.0`…) et monter la version dans dash4-web et dash4-mobile.

Les règles de droits (`can`, `canSee`, `isTechnician`…) ne font que **cacher** ce que l'API refuse déjà : la vérification réelle est toujours faite par le serveur.
