# Développement et tests

Les fichiers du dossier `extension/` se chargent directement dans Chrome. Aucune compilation ni dépendance de développement n’est nécessaire pour l’utilisation de l’extension.

## Tests de développement

Le projet utilise **Node.js 24 ou ultérieur**. Depuis la racine du dépôt :

```sh
npm ci
npm test
```

Les dépendances et leurs versions sont fixées dans `package.json` et `package-lock.json`. Elles servent uniquement aux tests.

Les tests fonctionnels utilisent notamment un DOM simulé et des API Chrome simulées. Les résultats et leurs limites pour la version 1.0.3 figurent dans [VALIDATION.md](../VALIDATION.md). Ils ne remplacent pas une vérification du rendu réel et du comportement dans le navigateur.

Un parcours Chromium est également fourni dans `tests/browser.test.mjs`, avec la commande `npm run test:browser`. Il demande un environnement Playwright et les navigateurs correspondants. Le rapport de validation indique que ce parcours n’a pas été exécuté jusqu’au bout lors de la vérification de la version 1.0.3.

## Contribuer

Pour proposer une correction, décrivez le problème et utilisez un exemple fictif. Les cas de test ne doivent contenir ni dossier de signalement réel, ni identifiant de connexion, ni coordonnées personnelles. Les exports créés par l’extension ne font pas partie des sources à publier.

Consultez [l’architecture](../ARCHITECTURE.md) pour le fonctionnement du stockage, les contrôles des messages et les connecteurs.
