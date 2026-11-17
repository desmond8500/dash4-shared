# dash4-shared — consignes

- Paquet `@dash4/shared` : types de l'API Dash4, client HTTP (`createApiClient`) et règles de droits d'affichage.
- Les types de `src/types.ts` suivent exactement les API Resources de dash4-api ; les mettre à jour à chaque changement de l'API.
- Aucune dépendance d'exécution : seulement TypeScript et l'API `fetch`.
- Chaque changement : monter la version dans `package.json`, pousser sur `main`, puis `npm update @dash4/shared` dans dash4-web et dash4-mobile (installés depuis `github:desmond8500/dash4-shared#main`).
- Messages d'erreur en français ; code en anglais. Tests Vitest pour chaque fonction.
