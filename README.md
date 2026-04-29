# Adhan Desktop Overlay 🕌✨

Bienvenue sur le dépôt officiel de **Adhan Desktop Overlay** ! 

Il s'agit d'un utilitaire Windows extrêmement discret et esthétique conçu pour alerter visuellement des entrées et sorties des horaires de prière en se fondant parfaitement dans votre environnement de travail (Ambient / Subliminal Tech).

Idéal pour les professionnels, développeurs ou toute personne travaillant de longues heures sur écran, en open space ou en télétravail.

## 🌟 Fonctionnalités Principales

- **Alerte Subliminale (Deep Work) :** L'application n'interrompt jamais votre travail. Aucun son stressant, aucune popup bloquante. Les bordures de votre écran s'illuminent doucement en transparence et disparaissent d'elles-mêmes.
- **Zéro Configuration (Plug & Play) :** 
  - 🚀 **Lancement invisible** en arrière-plan au démarrage de votre ordinateur.
  - 🌍 **Géolocalisation intelligente** pour récupérer automatiquement votre ville.
  - 🕌 **Calibrage "Mawaqit" automatique** (Algorithme UOIF 12°) qui correspond nativement aux horaires exacts des mosquées de France, sans aucun réglage nécessaire.
- **Logique Juridique Pragmatique :**
  - 🟢 **Vert (Début) :** La prière vient de rentrer. S'affiche 15 secondes puis s'efface complètement.
  - 🟠 **Orange (-30 min) :** Alerte préventive avant la sortie définitive de l'heure.
  - 🔴 **Rouge (-10 min) :** Urgence, la plage horaire est sur le point de se terminer.
- **Contournement des VPN d'entreprise :** Si votre réseau professionnel fausse votre géolocalisation IP, un bouton vous permet de saisir manuellement votre ville via une superbe interface intégrée.
- **Masquage Instantané ("Kill Switch") :** En pleine présentation écran ou partie de jeu en ligne ? Tapez simplement **`Ctrl + Espace`** (ou cliquez sur l'icône de l'app) pour effacer immédiatement le cadre lumineux sans perturber votre cycle !
- **Esthétique Personnalisable :** Un clic-droit sur l'icône vous permet de voir le planning des prières de la journée et de changer de thème visuel (Oasis Lumineuse, Aurore Boréale, Océan Arctique...).

## 📥 Téléchargement / Installation

1. Allez dans l'onglet **[Releases](https://github.com/AdelHANIFI/Overlay/releases)** situé à droite de cette page.
2. Téléchargez le fichier d'installation de la version la plus récente (`Adhan-Overlay-Setup-1.x.x.exe`).
3. Double-cliquez pour l'installer.
4. C'est terminé ! L'application tourne désormais en silence dans la zone de notification de Windows (l'icône d'étoile à 8 branches près de votre horloge). 

Les mises à jour futures se téléchargeront et s'installeront automatiquement en arrière-plan.

## ⚙️ Pour les Développeurs

Le projet est Open Source, développé avec Electron, Javascript pur, CSS moderne, et la librairie mathématique `adhan`. 
Pour explorer ou compiler le projet vous-même :

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm start

# Compiler l'exécutable final Windows (.exe)
npm run dist
```

---
*Projet développé dans un esprit de discrétion, de beauté visuelle et d'assistance quotidienne. Sadaqa Jariya.*
