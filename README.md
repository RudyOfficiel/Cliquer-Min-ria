# ⛏️ Minéria — L'Empire Souterrain

**Minéria** est un jeu de minage incrémental (clicker/idle) développé en JavaScript pur. Plongez dans les profondeurs de la terre, extrayez des ressources précieuses, automatisez votre production et bâtissez un empire minier légendaire.

---

## 🌟 Caractéristiques principales

*   **Système de Minage Dynamique** : Commencez avec une simple pioche et progressez jusqu'à des technologies d'extraction antimatière.
*   **Progression Profonde** : Explorez **16 zones uniques**, de la surface verdoyante au noyau terrestre, jusqu'aux mines divines.
*   **Automatisation complète** : Recrutez des mineurs, déployez des foreuses et utilisez des robots IA pour miner même quand vous ne cliquez pas.
*   **Système de Prestige** : "Reconstruisez la Mine" pour obtenir des **Fragments de Sagesse** et débloquer des bonus permanents surpuissants.
*   **Événements Aléatoires** : Faites face à des tremblements de terre, des invasions de taupes ou profitez de pluies de diamants et de météorites.
*   **Succès et Statistiques** : Plus de 30 succès à débloquer et un suivi détaillé de votre progression.
*   **Sauvegarde Automatique** : Votre progression est sauvegardée localement dans votre navigateur. Elle inclut également des **gains hors-ligne** (jusqu'à 8 heures).

---

## 🚀 Comment jouer ?

1.  **Commencez par le début** : Achetez votre première "Pioche de Base" dans la boutique pour débloquer le bouton "Miner".
2.  **Cliquez pour extraire** : Chaque clic vous rapporte de la pierre et parfois des minerais rares.
3.  **Investissez judicieusement** : Utilisez vos ressources pour acheter des bâtiments (production automatique) et des améliorations (multiplicateurs).
4.  **Descendez plus bas** : Débloquez de nouvelles zones pour augmenter drastiquement votre multiplicateur de production.
5.  **Devenez une légende** : Atteignez les profondeurs ultimes et collectionnez les minerais légendaires.

---

## 🛠️ Détails Techniques

Le projet est construit avec des technologies web standards, sans frameworks externes, pour une performance optimale et une légèreté maximale.

*   **Langages** : HTML5, CSS3, JavaScript (ES6+).
*   **Architecture** : Modulaire (IIFE) pour la gestion de l'état du jeu (`GameState`), du système de sauvegarde (`SaveSystem`) et des événements.
*   **Stockage** : Utilisation du `localStorage` pour la persistance des données.
*   **Audio** : Web Audio API pour une ambiance immersive.

---

## 📂 Structure du Projet

*   `index.html` : Structure du jeu et interface utilisateur.
*   `style.css` : Design industriel moderne et responsive.
*   `script.js` : Logique principale et boucle de jeu.
*   `upgrades.js` : Base de données des bâtiments, améliorations, zones et succès.
*   `save.js` : Gestion des sauvegardes et imports/exports.
*   `events.js` : Système d'événements aléatoires et commandes admin.
*   `auth.js` : Système d'authentification multi-comptes local.

---

## 📝 Licence

Ce projet est réalisé à des fins éducatives. Vous êtes libre de l'explorer et de le modifier pour votre propre apprentissage !

---
*Développé avec passion par RudyOfficiel.*
