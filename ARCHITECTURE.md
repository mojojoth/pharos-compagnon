# Architecture et maintenance

## Flux

Le script Facebook repère des blocs de commentaire et y ajoute un bouton. Il ne sauvegarde aucun contenu pendant ce repérage. Après clic, le connecteur extrait le texte affiché, le nom affiché, les liens et la date affichée quand ils sont disponibles. Le service worker fixe l’heure d’observation, normalise les données, calcule leur SHA-256, puis enregistre la fiche. Deux collectes du même lien, du même texte et des mêmes informations d’auteur/publication réouvrent la fiche existante. Un texte différent ou une amélioration des informations relevées produit une nouvelle fiche.

La fiche contient un relevé d’origine et un brouillon distinct. Seul le brouillon, les notes, le statut et la référence de réception sont modifiables. Un contrôle de version refuse un enregistrement qui écraserait les changements d’un autre onglet. Les écritures sont sérialisées par le worker.

La préparation PHAROS crée un onglet vierge, y associe un brouillon éphémère dans `storage.session`, puis ouvre le domaine officiel. Le script officiel ne peut obtenir que le brouillon de son propre onglet. La liaison expire après trente minutes, à la fermeture de l’onglet, au rechargement de l’extension ou au redémarrage du navigateur. Un onglet PHAROS ouvert séparément ne reçoit rien.

## Adaptateur PHAROS observé le 10 novembre 2026

- Étape catégorie : `/etape/contenu`, identifiants `-etape-contenu_radio-button-group-input__*` et bouton `template-etape_btn__next--etape-contenu`.
- Étape description : `/etape/identifier`, réseau social `-etape-identifier_radio-button-group-input__sur-un-reseau-social`, date `identifier_text-input-calendar`, heure `identifier_text-input-time`.
- Case victime : `identifier_checkbox__je-suis-la-victime-du-signalement`. Le champ `draft.victim` accepte `yes`, `no`, ou une valeur vide pour un choix non précisé. Le worker demande un choix explicite avant le transfert. Oui coche la case native ; Non la décoche. Une modification manuelle ultérieure sur le portail est conservée et bloque l’avancement automatique.
- URL : champ visible unique de placeholder `https://exemple.fr` (maximum observé : 800).
- Description : textarea visible unique, `name=textarea`, dont le placeholder commence par `Description détaillée des faits signalés.` (maximum observé : 4 000).
- Une liste fermée de deux boutons « Continuer » peut être actionnée. Aucun clic générique sur submit, aucune soumission HTTP, aucune gestion des coordonnées ou CAPTCHA. Les champs de texte déjà remplis sont conservés. Un texte trop long bloque l’avancement automatique.

Ces sélecteurs sont regroupés dans `extension/connectors/pharos.js`. Si le portail change, la copie reste disponible dans le panneau latéral. Aucune garantie de stabilité des sélecteurs tiers.

En 1.0.2, le composant victime a été inspecté à nouveau sur le portail et dans son script public `main-XOETZFEF.js` le 10 novembre 2026. Le gestionnaire de clic du bloc `.fr-checkbox-group` annule l’action native par `preventDefault()` et met à jour une sélection interne liée à la propriété `checked`. Un clic direct sur l’input peut donc être annulé par l’activation native du navigateur. L’adaptateur clique une fois sur le libellé associé visible, avec repli sur le bloc identifié puis sur l’input pour d’autres variantes. Il attend jusqu’à 1,5 seconde la prise en compte par le rendu, sans répéter le clic. Le content script revérifie les champs et la case après son délai de stabilisation de 250 ms avant de continuer. Une absence de confirmation ou une modification manuelle conserve l’arrêt à cette étape.

## Permissions et données

| Permission | Utilité |
|---|---|
| storage | Dossiers et liaisons temporaires avec les onglets |
| activeTab | Capture de la partie visible après clic sur l’icône de l’extension |
| contextMenus | Collecte de secours à partir du texte sélectionné sur Facebook |
| unlimitedStorage | Captures multiples sans le quota standard de 10 Mo |

Les scripts sont déclarés uniquement sur les quatre domaines Facebook listés et les deux domaines officiels PHAROS. Ni `<all_urls>`, ni accès aux cookies, ni interception de requêtes. Les données ne passent pas par `storage.sync`. `storage.local` et `storage.session` sont réservés aux contextes de confiance. Le worker vérifie l’origine et le type de chaque message. Un script Facebook peut créer une fiche mais ne peut ni lister ni lire ni exporter des dossiers. Le script PHAROS ne peut lire que son transfert.

La capture est effectuée uniquement depuis la fenêtre de l’extension, sur l’onglet Facebook de la dernière collecte, après vérification de l’onglet actif. Elle est rejetée si l’onglet actif change pendant l’opération. Elle n’est pas nécessairement limitée au commentaire. Le stockage local et les fichiers d’export ne sont pas chiffrés par cette extension.

## Sauvegardes et intégrité

Les exports JSON portent `app: pharos-compagnon` et `schemaVersion: 1`. À l’import, les relevés et images sont normalisés et leurs empreintes recalculées. L’import est intégralement vérifié avant écriture et ajoute seulement les identifiants absents ; il ne remplace aucun dossier existant. Maximum d’import UI : 50 Mo, 1 000 fiches et cinq captures par fiche. Les textes exportés en HTML sont échappés ; ce document autonome n’exécute aucun script et ne charge aucune ressource réseau. Les empreintes ne prouvent ni la vérité du contenu, ni sa provenance, ni sa date.

## Connecteurs

`connectors/facebook.js` expose `discover`, `extract` et `insertionPoint` dans le monde isolé du content script. Il ne touche pas aux API privées du réseau. Une autre plateforme pourrait fournir cette interface et le même schéma de relevé, avec ses propres domaines déclarés dans le manifest. La version livrée limite la collecte automatique à Facebook.

Depuis 1.0.1, `connectors/facebook-urls.js` fournit une classification partagée aux scripts Facebook, au moteur et au worker. La présence de `comment_id` sur une URL de profil n’est plus considérée comme un permalien de commentaire. Les liens de publication doivent porter une route et un identifiant de contenu reconnus. Le nom est extrait séparément, y compris depuis les libellés accessibles et le libellé du bloc de commentaire.

Si le lien direct n’est pas présent, le connecteur recherche la publication dans les ancêtres proches du commentaire, puis dans l’URL de la page consultée si celle-ci désigne un contenu. Il peut y ajouter les identifiants de commentaire et de réponse relevés dans le bloc sélectionné, hors corps du message et réponses imbriquées. Des identifiants contradictoires ne donnent pas lieu à une reconstruction. Aucun lien de contenu ne vient du simple retrait de `comment_id` sur le profil de l’auteur. Les liens de profils sont aussi refusés par le worker avant l’ouverture de PHAROS, y compris dans les anciennes fiches.

Le schéma d’export reste en version 1. Les anciens relevés et leurs empreintes restent inchangés et importables. Les corrections de validation s’appliquent à la nouvelle collecte et à la préparation du formulaire, sans réécriture des relevés antérieurs.

## Développement

### Mise en page du tableau de bord (1.0.3)

Le centrage vertical provenait de `margin:auto` sur `.workspace`, dans la même ligne de grille que la liste dont la hauteur augmentait. Le formulaire utilise désormais `margin:0 auto` et `align-self:start`. Sur ordinateur, la ligne de grille occupe la hauteur de la fenêtre sous l’en-tête. `.record-list` et `.workspace` disposent de défilements distincts ; `min-height:0` autorise la réduction des éléments flex/grid au lieu d’agrandir le document. L’en-tête, la recherche et le filtre gardent leur place dans la colonne de gauche. Au changement de dossier, le formulaire est ramené en haut. Le media query existant à 760 px rétablit le flux vertical du document avec une liste de hauteur limitée.

Ces modifications concernent le CSS et la navigation dans la fiche ; le stockage, les formats d’export, les connecteurs et les permissions restent identiques à 1.0.2.

Le code livré est du JavaScript natif ; aucun build. Pour les tests moteur et DOM simulé : installer les dépendances de développement avec `npm install`, puis `npm test` (Node 24+). Pour les essais navigateur : installer Chromium pour Playwright si nécessaire (`npx playwright install chromium`), puis `npm run test:browser`. La variable `CHROMIUM_PATH` permet de choisir un exécutable Chromium existant. Les tests utilisent un profil temporaire isolé, des commentaires fictifs et des routes locales ; aucun signalement n’est envoyé.

Les fixtures ne reproduisent pas toutes les variantes de Facebook. Après une mise à jour du connecteur, vérifier manuellement un commentaire public, une réponse imbriquée et un commentaire déplié, puis le portail officiel jusqu’aux informations personnelles sans envoyer de signalement d’essai.
