# dash4-shared — consignes

- Paquet `@dash4/shared` : types de l'API Dash4, client HTTP (`createApiClient`) et règles de droits d'affichage.
- Les types de `src/types.ts` suivent exactement les API Resources de dash4-api ; les mettre à jour à chaque changement de l'API.
- Aucune dépendance d'exécution : seulement TypeScript et l'API `fetch`.
- Chaque changement publié = un nouveau tag `vX.Y.Z`, puis mise à jour de la version dans dash4-web et dash4-mobile.
- Messages d'erreur en français ; code en anglais. Tests Vitest pour chaque fonction.
