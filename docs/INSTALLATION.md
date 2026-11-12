# Installer et mettre à jour PHAROS Compagnon

Cette procédure concerne Chrome pour ordinateur, version 120 ou ultérieure. L’utilisation de l’extension ne demande aucune commande dans le terminal.

## Première installation

1. Ouvrez la rubrique **Releases** du dépôt GitHub et choisissez **v1.0.4**.
2. Dans **Assets**, téléchargez **Pharos-Compagnon-1.0.4.zip**.
3. Décompressez l’archive. Vous obtenez le dossier **Pharos-Compagnon**.
4. Déplacez ce dossier dans un emplacement permanent, par exemple votre dossier Documents. Conservez-le à cet emplacement pendant l’utilisation de l’extension.
5. Dans la barre d’adresse de Chrome, saisissez `chrome://extensions` et validez.
6. Activez **Mode développeur**.
7. Cliquez sur **Charger l’extension non empaquetée**.
8. Sélectionnez **Pharos-Compagnon/extension**. C’est ce sous-dossier qui contient `manifest.json`.
9. Ouvrez le menu des extensions de Chrome et épinglez **PHAROS Compagnon**.
10. Rechargez les onglets Facebook déjà ouverts.

La version installée doit indiquer **1.0.4** dans la page des extensions. Vous pouvez ouvrir le bouton de l’extension, puis **Ouvrir mes dossiers**.

## Premier dossier

Sur Facebook, développez le commentaire que vous souhaitez relever et cliquez sur **PHAROS** près de celui-ci. Vérifiez le nom affiché, le texte et les liens dans la fiche. Une collecte peut laisser un champ vide lorsqu’elle ne dispose pas d’informations suffisantes.

Pour une capture, revenez sur l’onglet Facebook du commentaire, placez celui-ci à l’écran, puis ouvrez le bouton de l’extension et choisissez **Capturer la page visible**. La capture inclut toute la zone visible de l’onglet.

Renseignez la visibilité, la catégorie, le choix relatif à la qualité de victime et votre contexte. **Préparer sur PHAROS** ouvre le portail officiel. Vous relisez les informations et assurez vous-même la validation finale.

## Mettre à jour une installation existante

1. Dans **Mes dossiers**, cliquez sur **Sauvegarder**. Conservez le fichier JSON obtenu.
2. Décompressez la nouvelle version dans un dossier temporaire.
3. Copiez tous les fichiers et sous-dossiers contenus dans son dossier **extension**.
4. Collez-les dans le dossier **extension déjà installé**, en acceptant le remplacement. Conservez exactement le même emplacement d’installation.
5. Dans `chrome://extensions`, cliquez sur **Actualiser** pour PHAROS Compagnon.
6. Vérifiez le numéro de version, puis rechargez les onglets **Mes dossiers** et Facebook.

Cette opération remplace les fichiers de l’extension ; les fiches restent dans son stockage local. Ne désinstallez pas l’extension pour effectuer cette mise à jour.

Si vous choisissez une installation distincte ou changez de profil Chrome, conservez votre sauvegarde puis utilisez **Importer** dans la nouvelle installation. Deux installations peuvent avoir des stockages différents.

## Gérer les captures dans la version 1.0.4

Les captures ajoutées depuis le module apparaissent automatiquement dans la fiche correspondante déjà ouverte. Vous pouvez revenir directement sur cet onglet ; le texte que vous étiez en train de saisir et la position dans la fiche sont conservés.

Sous chaque capture, **Retirer** supprime uniquement l’image choisie après confirmation. La suppression de l’image est immédiate. Les modifications de texte restent à sauvegarder avec l’un des boutons **Enregistrer**, en haut ou en bas de la fiche.

## Sauvegarder et supprimer

- **Sauvegarder** exporte les dossiers au format JSON, avec leurs captures.
- **Exporter cette fiche** crée une sauvegarde JSON du dossier sélectionné.
- **Version imprimable / PDF** produit un fichier HTML à ouvrir puis à imprimer ou enregistrer en PDF.
- **Supprimer** efface une fiche et ses captures du stockage de l’extension. Les fichiers déjà exportés restent à effacer séparément.

Consultez le [dépannage](DEPANNAGE.md) si une étape ne fonctionne pas.

Référence sur le chargement manuel : [documentation officielle de Chrome](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).

