# Vérification de la version 1.0.4 — 12 novembre 2026

## Vérifié

- 56 tests réussis : 14 tests du moteur, 27 contrôles d’intégration sur DOM simulé (dont 3 sous-tests du tableau de bord), 10 tests de régression Facebook et 5 tests du composant PHAROS, avec jsdom 31.0.0 et API Chrome simulées (Node 24).
- Les nouveaux contrôles couvrent le retrait d’une seule image parmi deux captures identiques, l’export après retrait, le retrait de la dernière capture, le refus d’une version dépassée ou d’une image absente, et la place libérée dans une fiche contenant cinq images.
- Le test du tableau de bord utilise les boutons de l’interface : Enregistrer en bas, annuler puis confirmer le retrait, préserver les notes non enregistrées et les sauvegarder ensuite. La valeur du défilement reste inchangée dans le DOM simulé ; le rendu graphique n’est pas mesuré.
- Trois nouveaux scénarios reproduisaient l’absence d’actualisation avec la première archive 1.0.4 et passent avec cet ajout : capture via le popup pendant que la fiche est ouverte, rattrapage au focus et à la visibilité après un événement manqué, et capture après modification de texte par un autre onglet. Ils vérifient aussi la conservation du curseur, de la saisie et du défilement, l’isolation d’une autre fiche et le maintien du refus d’écrasement concurrent.
- Le test existant du tableau de bord vérifie aussi que la sélection d’un autre dossier remet le défilement du formulaire en haut. Ce contrôle de navigation dans le DOM simulé ne mesure pas la géométrie de la page.
- Le défaut montré sur les deux captures a été identifié dans le CSS : la marge verticale automatique de `.workspace` centrait le formulaire dans une ligne de grille dont la hauteur augmentait avec la liste. Le correctif retire ce centrage, limite la grille à la hauteur de la fenêtre sur ordinateur et sépare les défilements des colonnes.
- Syntaxe CSS et déclarations inspectées : marge supérieure du formulaire à 0, défilement vertical automatique pour la liste et le formulaire, adaptation à 760 px conservée. Il s’agit d’une inspection des styles, pas d’un test de rendu.
- Les 5 cas supplémentaires échouaient avec le code 1.0.1. Ils reproduisent l’annulation de l’action native par le bloc de case à cocher observé sur PHAROS, le rendu différé, l’absence de confirmation et la présence d’un libellé visible avec une case masquée. Ils passent avec 1.0.2.
- Les 10 nouveaux cas de récupération Facebook échouaient avec le connecteur 1.0.0. Ils passent avec le correctif 1.0.1. Les fixtures représentent les symptômes signalés ; ce ne sont pas des copies du DOM réel du compte utilisateur.
- Syntaxe de tous les fichiers JavaScript vérifiée avec Node.
- Manifest JSON valide, ressources déclarées présentes, permissions limitées aux fonctions livrées.
- Formulaire PHAROS examiné dans un navigateur sur le site officiel : catégorie, choix « Sur un réseau social », champs du lien et de la description, date et heure d’observation. Aucun contenu de l’utilisateur saisi ni signalement envoyé.

## Parcours couverts par les tests

| Parcours | Résultat |
|---|---|
| Repérage des commentaires au chargement | Boutons ajoutés, aucun dossier collecté sans clic |
| Commentaire et réponse imbriquée | Texte, auteur et lien distincts |
| Wrapper de mise en page et lien cité dans un commentaire | Extrait séparé des actions et lien direct distingué du lien cité |
| Avatar, emoji, retours à la ligne, « Voir plus » | Nom affiché conservé, texte et alerte de repli contrôlés |
| Commentaires ajoutés dynamiquement | Bouton ajouté par MutationObserver |
| Déduplication | Même commentaire, texte et métadonnées réouvrent la fiche ; métadonnées améliorées = nouvelle collecte |
| Profil portant comment_id | Nom récupéré, profil séparé des liens de contenu |
| Publication et identifiant relevés séparément | Lien reconstruit à partir du contexte de publication et de l’identifiant du commentaire |
| Réponse et commentaire parent | Les deux identifiants sont conservés quand ils sont relevés |
| Nom dans un libellé accessible | Récupération sans dépendre du texte d’un lien |
| Liens contradictoires ou contexte absent | Champ laissé à compléter ; aucun profil substitué au contenu |
| Ancien profil placé dans un champ de contenu | Ouverture PHAROS refusée avec explication |
| Sauvegarde 1.0.0 et recollecte | Ancien relevé préservé, nouvelle fiche créée si les informations sont améliorées |
| Modifications et version concurrente | Origine conservée ; écrasement concurrent refusé |
| Messages et stockage | Lecture des dossiers réservée aux pages de l’extension |
| Préparation PHAROS | Transfert limité à l’onglet créé, notes personnelles exclues |
| Avancement PHAROS | Deux premières étapes seulement ; arrêt aux informations personnelles |
| Choix victime Oui / Non | Valeur enregistrée dans la fiche et transmise ; case cochée / décochée |
| Choix victime absent | Aucun choix supposé ; transfert refusé avec explication |
| Modification manuelle de la case victime sur PHAROS | Modification conservée ; avancement automatique arrêté |
| Clic sur un bloc qui annule l’action native | Libellé actionné une fois ; choix Oui ou Non conservé |
| Rendu différé de la case | Attente de la confirmation avant l’avancement |
| Choix non confirmé | Arrêt avec explication, aucun clic répété |
| Case native masquée et libellé visible | Utilisation du libellé associé |
| Brouillon expiré / onglet indépendant | Pas de préremplissage |
| Champ existant / description trop longue | Valeur conservée / absence de troncature |
| Capture visible | Règles de contexte et d’onglet contrôlées avec API simulée |
| Capture depuis le module avec fiche déjà ouverte | Miniature actualisée sans ouvrir de nouvelle fiche ; saisie et curseur préservés |
| Retour sur un onglet après événement manqué | Captures relues au focus et au retour à la visibilité |
| Capture dans un autre dossier | Fiche affichée inchangée |
| Capture après modification de texte concurrente | Miniature actualisée ; écrasement du texte toujours refusé |
| Retrait d’un doublon | Suppression par identifiant ; autre image et relevé d’origine conservés |
| Retrait refusé ou annulé | Aucune capture supprimée |
| Limite de cinq captures après retrait | Ajout d’une nouvelle image possible |
| Retrait pendant la saisie | Champs modifiés conservés puis enregistrables |
| Export / import avec captures | Empreintes vérifiées, ajouts sans remplacement |
| Sauvegarde altérée | Rejet avant toute écriture |
| Tableau de bord | Affichage, saisie, aperçu et enregistrement en bas sans réinitialiser le défilement dans le DOM simulé |
| Changement de dossier après défilement du formulaire | Retour en haut contrôlé dans le DOM simulé |
| Alignement et défilements des colonnes | CSS inspecté ; rendu final à vérifier dans Chrome |

## Limites de cette vérification

La vérification visuelle de la mise en page 1.0.3 n’avait pas pu être menée ici : le navigateur d’aperçu refusait les pages de test locales. Cette restriction n’a pas été contournée. Aucun nouvel essai dans ce navigateur n’a été tenté pour 1.0.4. Les essais `tests/browser.test.mjs` sont fournis, mais **n’ont pas été exécutés jusqu’au bout**. Les tests jsdom ne valident pas le rendu graphique ni les autorisations réelles du navigateur.

L’utilisateur a confirmé le fonctionnement de 1.0.1, avec une intervention manuelle encore nécessaire pour la case victime sur PHAROS. Le DOM et le composant public de cette case ont été inspectés à nouveau pour préparer 1.0.2. Le correctif a été vérifié dans une reproduction du composant et les parcours simulés ; son exécution par l’extension sur le compte réel de l’utilisateur reste à confirmer. Les variantes de Facebook et les autorisations réelles de capture Chrome ne sont pas couvertes par les tests simulés. Aucun commentaire réel, coordonnée personnelle ou signalement n’a été envoyé pendant les essais.

Pour la première utilisation, vérifier un commentaire public sans l’envoyer : contrôler son texte, son auteur et son lien, ajouter une capture, puis ouvrir PHAROS jusqu’aux informations personnelles et fermer le formulaire. Le bouton de copie et la collecte par sélection restent disponibles en cas de variation des sites.

Pour vérifier 1.0.3 après installation, ouvrir Mes dossiers avec la liste existante, faire défiler la liste à gauche puis le formulaire à droite, et sélectionner un autre dossier. Vérifier que l’en-tête et les colonnes restent en place et que le formulaire sélectionné commence en haut. La mise à jour ne nécessite pas de recollecter les commentaires.

Pour vérifier 1.0.4 dans Chrome, joindre deux copies d’une image fictive dans une fiche de test. Cliquer sur Retirer puis annuler ; vérifier que les deux images restent présentes. Modifier une note, retirer une seule copie, puis enregistrer depuis le bas du dossier. Vérifier que la note reste affichée, qu’une seule image est retirée et que l’enregistrement ne ramène pas le formulaire en haut. Recharger ensuite la fiche pour vérifier la persistance.

Pour vérifier l’actualisation, garder une fiche ouverte avec une note modifiée non enregistrée. Revenir sur l’onglet Facebook correspondant, prendre une capture depuis le popup, puis revenir directement à l’onglet Mes dossiers sans cliquer sur Revenir à la fiche. Vérifier que la capture est affichée, que la note et le défilement sont conservés, puis enregistrer depuis le bas du dossier.
