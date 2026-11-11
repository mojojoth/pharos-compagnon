# PHAROS Compagnon

<img src="extension/icons/128.png" alt="Icône de PHAROS Compagnon" width="80" height="80">

**Une extension Chrome gratuite et indépendante pour conserver les éléments d’un commentaire Facebook et préparer un signalement PHAROS.**

Version proposée : **1.0.3**. L’installation se fait manuellement sur Chrome pour ordinateur. Aucun compte propre à l’extension ni paiement n’est nécessaire.

PHAROS Compagnon s’adresse aux personnes qui souhaitent rassembler les informations utiles sur des contenus potentiellement illicites, vérifier leur dossier et préparer leur démarche sur le portail officiel. L’utilisateur garde la décision et la validation de chaque envoi.

## Télécharger

**[Télécharger PHAROS Compagnon 1.0.3](https://github.com/mojojoth/pharos-compagnon/releases/download/v1.0.3/Pharos-Compagnon-1.0.3.zip)**

Ouvrez la rubrique **Releases** de ce dépôt, puis la version **v1.0.3**. Dans **Assets**, téléchargez le fichier **Pharos-Compagnon-1.0.3.zip** joint à la publication.

Ce fichier contient le dossier **Pharos-Compagnon**, avec un sous-dossier **extension** à charger dans Chrome. Aucun logiciel de compilation n’est nécessaire pour l’utiliser.

## Installer dans Chrome

1. Téléchargez et décompressez l’archive.
2. Placez le dossier **Pharos-Compagnon** dans un emplacement permanent sur votre ordinateur.
3. Saisissez `chrome://extensions` dans la barre d’adresse de Chrome.
4. Activez **Mode développeur**, puis cliquez sur **Charger l’extension non empaquetée**.
5. Sélectionnez le sous-dossier **extension**, qui contient `manifest.json`.
6. Épinglez PHAROS Compagnon dans la barre d’outils et rechargez vos onglets Facebook.

L’extension demande **Chrome 120 ou une version ultérieure**, sur ordinateur. Cette distribution vise Chrome ; la compatibilité avec d’autres navigateurs n’est pas validée.

Consultez le [guide d’installation et de mise à jour](docs/INSTALLATION.md).

## Utiliser l’extension

1. Sur Facebook, ouvrez le commentaire qui vous intéresse et développez son texte si nécessaire.
2. Cliquez sur **PHAROS** près du commentaire, ou utilisez le menu contextuel après avoir sélectionné son texte.
3. Dans la fiche, vérifiez le texte, le nom affiché et les liens récupérés. Complétez les informations manquantes.
4. Confirmez la visibilité publique du contenu, choisissez une catégorie et indiquez si vous êtes la victime.
5. Ajoutez vos éléments de contexte et, si utile, une capture d’écran.
6. Cliquez sur **Préparer sur PHAROS**, relisez le formulaire officiel, complétez vos informations et confirmez personnellement l’envoi.

Une fiche manuelle permet aussi de constituer un dossier lorsque la collecte automatique ne reconnaît pas un commentaire.

## Fonctionnalités

- Collecte au clic du texte et des métadonnées visibles disponibles.
- Vérification et correction du nom affiché, du commentaire et des liens.
- Conservation distincte du relevé d’origine et du brouillon modifiable.
- Ajout de captures, de notes et d’une référence de réception.
- Classement et recherche des dossiers.
- Sauvegarde et import au format JSON.
- Export d’une fiche en HTML pour impression ou enregistrement en PDF.
- Préremplissage des étapes reconnues du portail PHAROS, avec avancement optionnel des deux premières étapes.

## Confidentialité

Les dossiers et captures sont conservés dans le stockage local de votre profil Chrome. L’éditeur ne reçoit aucune copie et l’extension n’utilise pas de serveur de collecte, de publicité, de mesure d’audience ou d’analyse par intelligence artificielle.

Lorsque vous préparez le formulaire officiel, les informations préremplies sont mises à disposition du site PHAROS dès leur insertion dans sa page. Les captures et les notes personnelles ne sont pas transférées automatiquement.

Une capture de la page visible comprend toute la zone affichée de l’onglet Facebook. Vérifiez les informations qu’elle contient avant de la conserver ou de la partager. Le stockage et les exports ne sont pas chiffrés par l’extension.

Lire la [politique de confidentialité](docs/CONFIDENTIALITE.md).

## Limites

PHAROS Compagnon est un outil indépendant, sans affiliation au ministère de l’Intérieur, à PHAROS ou à Meta. Il ne qualifie pas automatiquement les contenus et ne vérifie pas l’identité civile des titulaires de comptes.

Les coordonnées, les contrôles du portail et la confirmation finale restent à la main de l’utilisateur. Le signalement PHAROS et le dépôt de plainte sont des démarches distinctes.

Les interfaces de Facebook et de PHAROS peuvent changer. Un nom, un lien ou un champ peut rester à compléter. Des options de saisie manuelle et de copie sont disponibles. Les règles, limites et décisions de réception du portail restent gérées par PHAROS.

## Mise à jour 1.0.3

Le correctif traite le décalage du formulaire vers le bas lorsque la liste de dossiers s’allonge. Sur ordinateur, la liste de gauche et le formulaire défilent séparément. La sélection d’une autre fiche remet le formulaire en haut.

Les mises à jour distribuées ici se font manuellement. Sauvegardez vos dossiers avant de remplacer les fichiers et conservez le même emplacement d’installation. Voir le [guide de mise à jour](docs/INSTALLATION.md#mettre-à-jour-une-installation-existante) et l’[historique des versions](CHANGELOG.md).

## Assistance

Consultez le [dépannage](docs/DEPANNAGE.md). Pour signaler un problème technique, ouvrez une **Issue** en indiquant la version de Chrome, la version de l’extension et les étapes permettant de reproduire le problème.

Utilisez des exemples fictifs et des captures anonymisées. Les Issues sont publiques : n’y joignez pas de dossier de signalement, de coordonnées personnelles ou de référence de réception.

## Documentation technique

Le dossier `extension/` contient les fichiers directement chargeables, sans compilation. Les dépendances de développement servent uniquement aux tests.

- [Développement et tests](docs/DEVELOPPEMENT.md)
- [Architecture](ARCHITECTURE.md)
- [Vérifications et limites des essais de la version 1.0.3](VALIDATION.md)

Projet porté par **Mansour Thiam**.
