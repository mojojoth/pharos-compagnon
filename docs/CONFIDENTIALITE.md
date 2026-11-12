# Politique de confidentialité de PHAROS Compagnon

Dernière mise à jour : **12 novembre 2026**. Version concernée : **1.0.4**.

Éditeur : **Mansour Thiam**. Les questions techniques peuvent être adressées dans la rubrique **Issues** de ce dépôt, avec des exemples fictifs et sans données personnelles. Cette rubrique est publique.

PHAROS Compagnon est une extension indépendante permettant de constituer des dossiers à partir de commentaires Facebook et de préparer un formulaire sur le portail officiel PHAROS. Elle n’est ni éditée ni approuvée par le ministère de l’Intérieur, PHAROS ou Meta.

## Informations traitées

Après une action de collecte de l’utilisateur, l’extension traite le texte du commentaire, le nom affiché de l’auteur, le lien de son profil, les liens du commentaire et de la publication, l’URL de la page consultée et les dates disponibles. Un relevé peut également conserver le texte visible du bloc du commentaire pour en garder le contexte.

Les dossiers peuvent contenir les corrections apportées par l’utilisateur, la catégorie choisie, la visibilité du contenu, la réponse au champ relatif à la qualité de victime, le contexte, la description, les notes, le statut et une éventuelle référence de réception.

L’extension traite aussi les captures jointes ou réalisées à la demande de l’utilisateur et les sauvegardes JSON qu’il décide d’importer. Une capture inclut toute la zone visible de l’onglet Facebook concerné, y compris d’autres informations présentes à l’écran.

## Finalités

Les informations servent à créer et gérer les fiches locales, préparer une description, produire les sauvegardes et exports demandés et préremplir les étapes reconnues du portail PHAROS. L’extension ne détermine pas automatiquement la légalité du contenu et ne vérifie pas l’identité civile des titulaires de comptes.

## Stockage et accès de l’éditeur

Les dossiers et les images sont conservés dans le stockage local du profil Chrome utilisé. L’extension ne les synchronise pas avec `chrome.storage.sync`, ne dispose pas de serveur de collecte et n’en transmet aucune copie à son éditeur.

Le transfert d’un brouillon vers un onglet PHAROS utilise un stockage de session. La liaison est limitée à l’onglet ouvert par l’extension, expire au plus tard après trente minutes et est supprimée à la fermeture de l’onglet.

L’éditeur n’a pas accès aux dossiers locaux et ne peut ni les consulter, ni les récupérer, ni les effacer à distance.

## Mise à disposition des informations sur PHAROS

Lorsque l’utilisateur choisit **Préparer sur PHAROS**, l’extension ouvre le portail officiel en HTTPS et insère les informations utiles au formulaire, dont le lien, la catégorie, la description et le choix relatif à la qualité de victime. Les informations préremplies sont mises à disposition du site PHAROS dès leur insertion dans sa page, avant la confirmation finale de l’envoi.

Les notes personnelles et les captures ne sont pas jointes automatiquement au formulaire. L’utilisateur complète lui-même ses coordonnées et confirme personnellement le signalement. Les traitements et la conservation effectués par le portail relèvent de ses propres règles de confidentialité.

## Exportation et partage

Les sauvegardes JSON et les exports HTML peuvent contenir des noms, URL, commentaires, notes et images. Ils sont enregistrés sur l’appareil à la demande de l’utilisateur et restent sous son contrôle.

La suppression d’une fiche ne supprime pas les fichiers exportés précédemment ou leurs copies transmises à d’autres personnes. Ces fichiers doivent être effacés séparément.

## Conservation et protection

Les fiches persistent localement jusqu’à leur suppression par l’utilisateur. Aucune purge automatique des anciens dossiers n’est prévue. L’utilisateur peut consulter, exporter et supprimer chaque fiche avec ses captures depuis le tableau de bord. Il peut également retirer une capture choisie après confirmation, sans supprimer les autres images de la fiche. Le retrait ne supprime pas les copies déjà exportées.

L’extension n’ajoute pas de chiffrement propre aux données locales ni aux fichiers exportés. Leur protection dépend également de la sécurité de l’appareil, du profil Chrome et du lieu de conservation des sauvegardes. L’utilisateur doit vérifier les captures et limiter les informations conservées à celles utiles à sa démarche.

## Publicité et suivi

L’extension n’intègre ni publicité, ni mesure d’audience, ni analyse des personnes par intelligence artificielle. Elle n’établit pas d’historique général de navigation. Les URL relevées correspondent aux éléments choisis pour constituer les dossiers.

Les données des dossiers ne sont ni vendues, ni exploitées à des fins publicitaires, ni utilisées pour évaluer une solvabilité ou accorder un crédit. Leur usage et leurs transferts par l’extension se limitent aux fonctions décrites ici.

## GitHub et autres services

Consulter ce dépôt, télécharger une version ou publier une Issue implique l’utilisation de GitHub, soumis à sa propre politique de confidentialité. Aucune fonction de l’extension ne publie les dossiers dans ce dépôt ou dans les Issues.

Facebook, Chrome et le portail PHAROS peuvent aussi traiter des données dans le cadre de leurs services respectifs. Cette politique décrit le fonctionnement de PHAROS Compagnon et ne remplace pas les politiques de ces services.

