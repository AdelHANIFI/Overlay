# 🚀 Mode d'Emploi : Déployer une Mise à Jour Automatique (OTA)

Votre application est désormais programmée pour se mettre à jour toute seule chez vos futurs utilisateurs ! Voici le processus exact à suivre chaque fois que vous voudrez déployer une nouvelle version.

## 1. Mettre à Jour le Code
1. Dans votre projet `adhan_desktop`, modifiez le code ou le CSS comme bon vous semble.
2. Ouvrez le fichier `package.json` et changez le numéro de `"version"`.  
   *(Exemple : passez de `"1.0.0"` à `"1.0.1"`).*

## 2. Compiler la Nouvelle Version
Ouvrez votre terminal **en mode Administrateur** et tapez :

```bash
cmd /c "npm run dist"
```

## 3. Récupérer les 2 Fichiers Vitaux
Allez dans le dossier `dist/` qui vient d'être généré. Vous avez besoin de **DEUX fichiers** spécifiques pour que la mise à jour automatique fonctionne :
1. `Adhan Overlay Setup 1.X.X.exe` (Le nouveau fichier d'installation).
2. `latest.yml` (Un tout petit fichier secret généré par l'outil).

> **ATTENTION :** Le fichier `latest.yml` est ce qui donne le "feu vert" au système de mise à jour. S'il n'est pas publié en même temps que le `.exe`, la mise à jour automatique ne s'enclenchera jamais sur les PC de vos utilisateurs !

## 4. Publier la Mise à Jour sur GitHub
1. Allez sur votre dépôt en ligne : `https://github.com/AdelHANIFI/Overlay`
2. Sur le grand bouton à droite, cliquez sur **Releases**, puis sur **Draft a new release**.
3. Dans la case *Tag version*, tapez la **MÊME version** que votre `package.json` (Par exemple : `v1.0.1`). *(N'oubliez pas le "v" devant la version)*.
4. Dans le carré de rédaction, ajoutez un petit titre ou décrivez les nouveautés.
5. Sous le carré de texte, vous verrez une large zone grise nommée *"Attach binaries by dropping them here..."* ➔ **Glissez-déposez vos DEUX fichiers** (`.exe` ET `latest.yml`) ici.

## 5. Appuyer sur le Bouton Vert
Cliquez sur **Publish release**. Félicitations, la mise à jour est en ligne !

Dès cet instant :
- L'application de vos utilisateurs va enquêter silencieusement en arrière-plan.
- En lisant le `latest.yml`, elle réalisera qu'elle est en retard et téléchargera votre nouveau `.exe` en tâche de fond.
- Les utilisateurs verront apparaître sur leur bureau *(dans la barre des tâches)* un message : *"Nouvelle version prête ! Elle s'installera automatiquement à la prochaine fermeture de l'appli"*. 
- Tout aura été transparent pour eux.
