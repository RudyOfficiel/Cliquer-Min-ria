/**
 * ============================================================
 * MINÉRIA — script.js
 * ============================================================
 * Fichier principal du jeu. Contient :
 *   - GameState    : état central unique du jeu
 *   - Game Loop    : boucle principale (requestAnimationFrame)
 *   - Actions      : clic, achat, déblocage, prestige
 *   - UI Module    : tout ce qui touche l'affichage DOM
 *   - Effets       : particules, nombres flottants, ambiance
 *   - Sons         : Web Audio API (optionnel)
 *   - Init         : démarrage complet du jeu
 *
 * ORDRE DE CHARGEMENT DES FICHIERS (voir index.html) :
 *   1. upgrades.js  → données statiques (BUILDINGS_DATA, etc.)
 *   2. events.js    → système d'événements (EventSystem)
 *   3. save.js      → sauvegarde (SaveSystem)
 *   4. script.js    → logique principale (ce fichier)
 *
 * MÉCANIQUE DE DÉPART :
 *   Le joueur commence avec 15 pierres et ne peut pas encore
 *   miner. Il doit d'abord acheter la "Pioche de Base" (15 🪨)
 *   dans la boutique. Une fois achetée, le bouton Miner se
 *   débloque et chaque clic rapporte 1 pierre.
 * ============================================================
 */

'use strict'; // Active le mode strict JavaScript (moins de bugs silencieux)


// ============================================================
// FONCTIONS UTILITAIRES GLOBALES
// ============================================================

/**
 * Formate un nombre en notation lisible (K, M, Md, T, Qd, Qi).
 * Exemples : 1500 → "1.5K", 2500000 → "2.5M", 0.5 → "0.500"
 * @param {number} n
 * @returns {string}
 */
function formatNumber(n) {
    if (n === undefined || n === null || isNaN(n) || n < 0) return '0';
    const abs = Math.abs(n);

    // Petits nombres avec décimales
    if (abs < 1 && abs > 0) return n.toFixed(3);
    if (abs < 1000)         return Math.floor(n).toString();

    // Grands nombres avec suffixe
    const tiers = [
        [1e18, 'Qi'],  // Quintillions
        [1e15, 'Qd'],  // Quadrillions
        [1e12, 'T'],   // Trillions
        [1e9,  'Md'],  // Milliards
        [1e6,  'M'],   // Millions
        [1e3,  'K'],   // Milliers
    ];
    for (const [val, suffix] of tiers) {
        if (abs >= val) {
            // Supprime les zéros inutiles après la virgule
            return (n / val).toFixed(2).replace(/\.?0+$/, '') + suffix;
        }
    }
    return Math.floor(n).toString();
}

/**
 * Formate un temps en secondes vers une chaîne lisible.
 * Exemples : 75 → "1m 15s", 3725 → "1h 2m"
 * @param {number} s - Secondes
 * @returns {string}
 */
function formatTime(s) {
    s = Math.floor(s);
    if (s < 60)   return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/**
 * Met en majuscule la première lettre d'une chaîne.
 * Utilisé pour construire des clés de stats : 'stone' → 'Stone'
 * @param {string} str
 * @returns {string}
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Borne une valeur entre un minimum et un maximum.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}


// ============================================================
// GAMESTATE — État central unique du jeu
// ============================================================
// Principe : UNE seule source de vérité.
// Tout ce qui change dans le jeu passe par cet objet.
// Les fonctions de calcul lisent depuis GameState.
// L'UI affiche depuis GameState.
// SaveSystem sauvegarde/charge GameState.
// ============================================================

const GameState = {

    // ── Ressources ───────────────────────────────────────────
    // Quantités actuellement possédées par le joueur.
    // Ces valeurs augmentent via le clic et la production auto.
    resources: {
        stone:     0,    // Pierre : ressource principale
        coal:      0,    // Charbon : ressource secondaire niveau 1
        iron:      0,    // Fer : ressource secondaire niveau 2
        gold:      0,    // Or : ressource secondaire niveau 3
        diamond:   0,    // Diamant : ressource secondaire niveau 4
        crystal:   0,    // Cristal : ressource secondaire niveau 5
        legendary: 0,    // Minerai Légendaire : ressource ultime
    },

    // ── Collections (initialisées dans initGameState()) ─────
    buildings: [],    // Copie de BUILDINGS_DATA + champ `count`
    upgrades:  [],    // Copie de UPGRADES_DATA + champ `bought`
    zones:     [],    // Copie de ZONES_DATA + champs `unlocked`, `active`

    // ── Prestige — "Reconstruction de la Mine" ───────────────
    // Les bonus prestige sont PERMANENTS, même après réinitialisation.
    prestige: {
        count:          0,    // Nombre de prestiges effectués
        fragments:      0,    // Fragments actuellement possédés (cosmétique)
        totalFragments: 0,    // Total cumulatif sur tous les prestiges
        clickBonus:     0,    // % bonus à la puissance de clic (ex: 50 = +50%)
        autoBonus:      0,    // % bonus à la production auto
        luckBonus:      0,    // % bonus aux chances de ressources rares
    },

    // ── Statistiques ─────────────────────────────────────────
    // Compteurs cumulatifs. Ne sont jamais réinitialisés (même après prestige).
    stats: {
        totalClicks:          0,    // Nombre total de clics effectués
        totalStoneEarned:     0,    // Total de pierres GAGNÉES (pas le stock)
        totalCoalEarned:      0,
        totalIronEarned:      0,
        totalGoldEarned:      0,
        totalDiamondEarned:   0,
        totalCrystalEarned:   0,
        totalLegendaryEarned: 0,
        totalPlayTime:        0,    // Secondes de jeu cumulées
        eventsTriggered:      0,    // Nombre d'événements vécus
        sessionStart:         Date.now(), // Timestamp de démarrage de cette session
    },

    // ── Paramètres utilisateur ───────────────────────────────
    settings: {
        soundEnabled:          false, // Son activé (false par défaut car nécessite interaction)
        particlesEnabled:      true,  // Animations de particules
        notificationsEnabled:  true,  // Notifications d'achat/événement
    },

    // ── Achievements ─────────────────────────────────────────
    achievements: [], // Liste des IDs de succès débloqués

    // ── Multiplicateurs temporaires (événements) ─────────────
    // Ces valeurs sont modifiées par EventSystem pendant les événements.
    activeMultiplier:    1,     // Multiplie toute la production auto
    clickMultiplierBonus:1,     // Multiplie temporairement le clic
    earthquakeActive:    false, // Si true : production auto ÷2
    moleActive:          false, // Si true : production auto = 0

    // ── Mode d'achat de la boutique ───────────────────────────
    // 1 = achète 1 bâtiment, 10 = achète 10, 100 = achète 100, 'max' = autant que possible
    buyMode: 1,

    // ── Valeurs dérivées (recalculées chaque frame par getGameLoop) ──
    // Ces valeurs ne sont jamais sauvegardées, juste des caches calculés.
    clickPower:       1,    // Pierres gagnées par clic
    productionPerSec: 0,    // Pierres gagnées par seconde
    currentZone:      null, // Référence vers la zone active (objet zones[])
};


/**
 * Initialise le GameState avec les données de configuration.
 * Copie BUILDINGS_DATA, UPGRADES_DATA, ZONES_DATA dans GameState
 * en ajoutant les champs mutables (count, bought, unlocked, active).
 *
 * IMPORTANT : Cette fonction doit être appelée AVANT SaveSystem.load().
 * Ainsi, les nouvelles données ajoutées dans upgrades.js sont toujours
 * présentes, même sur une vieille sauvegarde.
 */
function initGameState() {
    // Crée les bâtiments avec count = 0
    GameState.buildings = BUILDINGS_DATA.map(b => ({ ...b, count: 0 }));

    // Crée les upgrades avec bought = false
    GameState.upgrades  = UPGRADES_DATA.map(u  => ({ ...u, bought: false }));

    // Crée les zones : la première (surface) est débloquée et active par défaut
    GameState.zones = ZONES_DATA.map((z, i) => ({
        ...z,
        unlocked: i === 0,  // Seule la Surface est débloquée dès le départ
        active:   i === 0,  // La Surface est la zone active par défaut
    }));

    // Référence vers la zone active
    GameState.currentZone = GameState.zones[0];
}


// ============================================================
// FONCTIONS DE CALCUL — Valeurs dérivées du GameState
// ============================================================

/**
 * Calcule la puissance de clic totale.
 * Prend en compte :
 *   1. Les upgrades de pioche achetés (multiplicatifs)
 *   2. Le bonus prestige (%)
 *   3. Le bonus temporaire des événements
 *   4. 1% de la production auto (design Cookie Clicker)
 * @returns {number} Pierres gagnées par clic (avant mult de zone)
 */
function getClickPower() {
    let power = 1; // Base : 1 pierre par clic

    // Applique tous les upgrades de type 'click' achetés
    GameState.upgrades
        .filter(u => u.type === 'click' && u.bought)
        .forEach(u => power *= u.multiplier);

    // Bonus de prestige (pourcentage)
    power *= 1 + GameState.prestige.clickBonus / 100;

    // Bonus temporaire (événement "Coup de Veine")
    power *= (GameState.clickMultiplierBonus || 1);

    // Bonus passif : 1% de la prod auto s'ajoute au clic (comme Cookie Clicker)
    power += getProductionPerSec() * 0.01;

    return Math.max(0, power); // Jamais négatif
}

/**
 * Calcule la production automatique totale en pierres/seconde.
 * Prend en compte :
 *   1. Production de chaque bâtiment
 *   2. Upgrades spécifiques à chaque bâtiment
 *   3. Upgrades globaux
 *   4. Bonus de prestige
 *   5. Multiplicateur de zone (défini dans ZONES_DATA)
 *   6. Multiplicateurs d'événements
 *   7. Malus (tremblement, taupe)
 * @returns {number} Pierres/seconde
 */
function getProductionPerSec() {
    // Blocage total si une taupe est active
    if (GameState.moleActive) return 0;

    let total = 0;

    // ── Calcul par bâtiment ───────────────────────────────────
    GameState.buildings.forEach(building => {
        if (building.count === 0) return; // Aucun bâtiment de ce type

        let prod = building.baseProduction * building.count;

        // Upgrades spécifiques à CE bâtiment (type 'auto' avec target correspondant)
        GameState.upgrades
            .filter(u => u.type === 'auto' && u.target === building.id && u.bought)
            .forEach(u => prod *= u.multiplier);

        total += prod;
    });

    // ── Upgrades globaux ─────────────────────────────────────
    GameState.upgrades
        .filter(u => u.type === 'global' && u.bought)
        .forEach(u => total *= u.multiplier);

    // ── Bonus de prestige ────────────────────────────────────
    total *= 1 + GameState.prestige.autoBonus / 100;

    // ── Multiplicateur de zone ───────────────────────────────
    // Chaque zone donne un bonus de production (défini dans ZONES_DATA)
    // Note : ce multiplicateur est aussi appliqué au clic via getClickGain()
    const zoneBonus = getZoneMultiplier();
    total *= zoneBonus;

    // ── Multiplicateur d'événement (ex: Veine de Diamant) ───
    total *= (GameState.activeMultiplier || 1);

    // ── Malus tremblement de terre ───────────────────────────
    if (GameState.earthquakeActive) total *= 0.5;

    return Math.max(0, total);
}

/**
 * Retourne le multiplicateur de production de la zone active.
 * Plus on est profond, plus le multiplicateur est élevé.
 * @returns {number}
 */
function getZoneMultiplier() {
    const zoneIdx = GameState.zones.findIndex(z => z.active);
    // Multiplicateurs de zone : 1× surface, 1.5× grotte, 2× mine abandonnée, etc.
    const multipliers = [1, 1.5, 2, 3, 5, 8, 15];
    return multipliers[zoneIdx] || 1;
}

/**
 * Calcule la quantité de pierres gagnée par un seul clic.
 * = clickPower × multiplicateur de zone
 * @returns {number}
 */
function getClickGain() {
    return GameState.clickPower * getZoneMultiplier();
}

/**
 * Vérifie si le joueur possède la pioche de départ.
 * Le bouton Miner est verrouillé tant que cette condition est false.
 * @returns {boolean}
 */
function hasStarterPickaxe() {
    const starterUpgrade = GameState.upgrades.find(u => u.id === 'pickaxe_starter');
    return starterUpgrade ? starterUpgrade.bought : false;
}

/**
 * Calcule le temps restant (en secondes) avant de pouvoir se payer `cost` pierres.
 * Retourne 0 si déjà affordable, Infinity si production = 0.
 * @param {number} cost           - Coût en pierres
 * @param {number} currentAmount  - Pierres actuellement possédées
 * @returns {number}
 */
function timeToAfford(cost, currentAmount) {
    if (currentAmount >= cost) return 0;
    const pps = GameState.productionPerSec;
    if (pps <= 0) return Infinity;
    return (cost - currentAmount) / pps;
}

/**
 * Calcule le nombre de Fragments de Sagesse disponibles pour un prestige.
 * Formule : √(totalStoneEarned / 1 000 000)
 * Zéro si moins de 1M de pierres gagnées au total.
 * @returns {number}
 */
function getPrestigeFragments() {
    const earned = GameState.stats.totalStoneEarned;
    if (earned < 1000000) return 0;
    return Math.floor(Math.sqrt(earned / 1000000));
}

// ── Conditions de visibilité dans la boutique ───────────────

/**
 * Détermine si un upgrade doit apparaître dans la boutique.
 * Condition : ressource/bâtiment requis atteint + pas encore acheté.
 * @param {Object} upgrade
 * @returns {boolean}
 */
function isUpgradeVisible(upgrade) {
    if (upgrade.bought) return false; // Déjà acheté → masqué

    // Upgrade de départ (pioche_starter) : toujours visible, jamais achetée
    if (upgrade.isStarter) return true;

    // Condition sur une ressource gagnée au total
    if (upgrade.unlockResource) {
        const key   = `total${capitalize(upgrade.unlockResource)}Earned`;
        const total = GameState.stats[key] || 0;
        return total >= upgrade.unlockAmount;
    }

    // Condition sur un nombre de bâtiments d'un type précis
    if (upgrade.unlockBuilding) {
        const b = GameState.buildings.find(b => b.id === upgrade.unlockBuilding);
        return b ? b.count >= upgrade.unlockCount : false;
    }

    return true; // Pas de condition = toujours visible
}

/**
 * Détermine si un bâtiment doit apparaître dans la boutique.
 * Visible quand on a gagné 50% du seuil de déblocage (anticipe l'accès).
 * @param {Object} building
 * @returns {boolean}
 */
function isBuildingVisible(building) {
    if (!building.unlockResource) return true;
    const key   = `total${capitalize(building.unlockResource)}Earned`;
    const total = GameState.stats[key] || 0;
    return total >= building.unlockAmount * 0.5; // Visible à mi-chemin
}

/**
 * Vérifie si le joueur peut se payer un upgrade.
 * @param {Object} upgrade
 * @returns {boolean}
 */
function canAffordUpgrade(upgrade) {
    return (GameState.resources[upgrade.costResource] || 0) >= upgrade.cost;
}


// ============================================================
// ACTIONS DU JEU — Modifications du GameState
// ============================================================

/**
 * Effectue un clic sur le bouton Miner.
 * Prérequis : hasStarterPickaxe() doit être true.
 * Effets : ajoute des pierres, anime le bouton, génère les effets visuels.
 * @param {Event|null} event - L'événement souris/tactile (pour la position des particules)
 */
function performClick(event) {
    // Sécurité : ne peut pas miner sans pioche
    if (!hasStarterPickaxe()) return;

    const gain = getClickGain();

    // Ajoute les pierres gagnées
    GameState.resources.stone        += gain;
    GameState.stats.totalClicks++;
    GameState.stats.totalStoneEarned += gain;

    // Chance de trouver des ressources secondaires (charbon, fer, etc.)
    rollSpecialResource();

    // Effets visuels (si activés dans les paramètres)
    if (GameState.settings.particlesEnabled) {
        spawnParticles(event);
        spawnFloatingNumber(`+${formatNumber(gain)}`, event);
    }

    // Son de clic (si activé)
    if (GameState.settings.soundEnabled) playClickSound();

    // Animation du bouton (enlève et remet la classe CSS pour relancer l'animation)
    const btn = document.getElementById('mine-btn');
    if (btn) {
        btn.classList.remove('clicking');
        void btn.offsetWidth; // Force le reflow du navigateur (relance l'animation)
        btn.classList.add('clicking');
    }

    // Vérifie si de nouveaux succès ont été débloqués
    checkAchievements();

    // Met à jour l'état du bouton (peut changer si la pioche vient d'être achetée)
    UI.updateMineButtonState();
}

/**
 * Tire au sort des ressources secondaires lors d'un clic.
 * Les chances dépendent de la zone active et du bonus de chance (prestige).
 * Un seul tirage aléatoire (rng) est fait, puis comparé à plusieurs seuils.
 */
function rollSpecialResource() {
    const luckMult = 1 + GameState.prestige.luckBonus / 100; // Bonus de chance prestige
    const zoneIdx  = GameState.zones.findIndex(z => z.active); // Index de la zone (0-6)
    const rng      = Math.random(); // Un seul tirage pour toutes les ressources

    // Table : [ressource, probabilité de base, zone minimum, quantité gagnée]
    const table = [
        ['coal',      0.06,   0, 2.0   ],  // Charbon : 6% dès la surface
        ['iron',      0.025,  1, 1.0   ],  // Fer : 2.5% dès la grotte
        ['gold',      0.012,  2, 0.3   ],  // Or : 1.2% dès la mine abandonnée
        ['diamond',   0.005,  3, 0.05  ],  // Diamant : 0.5% dès la zone magma
        ['crystal',   0.002,  4, 0.01  ],  // Cristal : 0.2% dès le temple
        ['legendary', 0.0005, 5, 0.001 ],  // Légendaire : 0.05% dès le labo
    ];

    table.forEach(([res, chance, minZone, amount]) => {
        if (zoneIdx >= minZone && rng < chance * luckMult) {
            const earned = amount * (0.5 + Math.random()); // Variation aléatoire ±50%
            GameState.resources[res]  = (GameState.resources[res]  || 0) + earned;
            const key = `total${capitalize(res)}Earned`;
            GameState.stats[key]      = (GameState.stats[key]      || 0) + earned;
        }
    });
}

/**
 * Achète des bâtiments selon le mode d'achat actuel (×1, ×10, ×100, max).
 * Déduit les pierres et incrémente le compteur du bâtiment.
 * @param {string} buildingId - ID du bâtiment (ex: 'miner')
 */
function buyBuilding(buildingId) {
    const building = GameState.buildings.find(b => b.id === buildingId);
    if (!building) return;

    let amount, cost;
    const mode = GameState.buyMode;

    if (mode === 'max') {
        // Mode Max : achète autant que possible
        const result = getBuildingMaxAffordable(building, building.count, GameState.resources.stone);
        if (result.count === 0) return; // Même 1 seul n'est pas abordable
        amount = result.count;
        cost   = result.cost;
    } else {
        // Mode ×N : essaie d'acheter N, se replie sur 1 si le lot n'est pas abordable
        cost = getBuildingBulkCost(building, building.count, mode);
        if (GameState.resources.stone < cost) {
            // Essaie 1 seul si le lot est trop cher
            if (mode > 1) {
                cost = getBuildingCost(building, building.count);
                if (GameState.resources.stone < cost) return;
                amount = 1;
            } else {
                return; // Même 1 n'est pas abordable
            }
        } else {
            amount = mode;
        }
    }

    // Débite les pierres et incrémente le bâtiment
    GameState.resources.stone -= cost;
    building.count += amount;

    addLog(`🏗️ ${building.name} ×${amount} acheté(s) pour ${formatNumber(cost)} 🪨`);
    checkAchievements();
    if (GameState.settings.soundEnabled) playBuySound();
}

/**
 * Achète un upgrade (amélioration unique).
 * @param {string} upgradeId - ID de l'upgrade (ex: 'pickaxe_starter')
 */
function buyUpgrade(upgradeId) {
    const upgrade = GameState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.bought) return;
    if (!canAffordUpgrade(upgrade))   return;

    // Débite la ressource requise
    GameState.resources[upgrade.costResource] -= upgrade.cost;
    upgrade.bought = true;

    addLog(`✅ ${upgrade.name} acheté !`);
    UI.showNotification(`✅ ${upgrade.name} acheté !`, 'success');
    checkAchievements();

    // Met à jour l'état du bouton Miner (peut se débloquer ici)
    UI.updateMineButtonState();

    if (GameState.settings.soundEnabled) playBuySound();
}

/**
 * Débloque une zone si le joueur a assez de ressources.
 * Vérifie les ressources COURANTES (pas totalEarned).
 * @param {string} zoneId - ID de la zone
 */
function unlockZone(zoneId) {
    const zone = GameState.zones.find(z => z.id === zoneId);
    if (!zone || zone.unlocked) return;

    // Vérifie que le joueur a assez de pierres EN STOCK (pas juste gagnées)
    const currentAmount = GameState.resources[zone.unlockResource] || 0;
    if (zone.unlockCost > 0 && currentAmount < zone.unlockCost) return;

    // Débite le coût
    if (zone.unlockCost > 0) {
        GameState.resources[zone.unlockResource] -= zone.unlockCost;
    }

    zone.unlocked = true;
    addLog(`🗺️ Zone débloquée : ${zone.name} (${zone.depth}m de profondeur) !`);
    UI.showNotification(`🎉 Nouvelle zone : ${zone.emoji} ${zone.name} !`, 'success', 4000);
    checkAchievements();
}

/**
 * Active (sélectionne) une zone déjà débloquée.
 * Change le thème visuel et les multiplicateurs de production.
 * @param {string} zoneId
 */
function activateZone(zoneId) {
    const zone = GameState.zones.find(z => z.id === zoneId);
    if (!zone || !zone.unlocked) return;

    // Désactive toutes les zones, active la sélectionnée
    GameState.zones.forEach(z => z.active = false);
    zone.active = true;
    GameState.currentZone = zone;

    // Met à jour l'UI : thème de couleurs + panneau de zone
    UI.applyZoneTheme(zone);
    UI.updateZonePanel();

    addLog(`🗺️ Zone active : ${zone.emoji} ${zone.name} (×${getZoneMultiplier()} production)`);
}

/**
 * Effectue un Prestige ("Reconstruction de la Mine").
 * Réinitialise les ressources/bâtiments/upgrades en échange de
 * Fragments de Sagesse permanents qui boostent les stats futures.
 */
function performPrestige() {
    const fragments = getPrestigeFragments();
    if (fragments <= 0) return;

    // Accumule les fragments
    GameState.prestige.fragments      += fragments;
    GameState.prestige.totalFragments += fragments;
    GameState.prestige.count++;

    // Recalcule les bonus permanents (plafonnés à 500% pour équilibre)
    GameState.prestige.clickBonus = clamp(GameState.prestige.totalFragments * 5,  0, 500);
    GameState.prestige.autoBonus  = clamp(GameState.prestige.totalFragments * 5,  0, 500);
    GameState.prestige.luckBonus  = clamp(GameState.prestige.totalFragments * 2,  0, 200);

    // ── Réinitialisation partielle ────────────────────────────
    // Ressources remises à zéro (mais stats conservées)
    Object.keys(GameState.resources).forEach(k => GameState.resources[k] = 0);

    // Bâtiments remis à zéro
    GameState.buildings.forEach(b => b.count = 0);

    // Upgrades tous remis à "non acheté"
    GameState.upgrades.forEach(u => u.bought = false);

    // Zones : seule la Surface reste débloquée
    GameState.zones.forEach((z, i) => {
        z.unlocked = i === 0;
        z.active   = i === 0;
    });
    GameState.currentZone = GameState.zones[0];

    // Réinitialise les multiplicateurs temporaires
    GameState.activeMultiplier     = 1;
    GameState.clickMultiplierBonus = 1;
    GameState.earthquakeActive     = false;
    GameState.moleActive           = false;

    // Remet les 15 pierres de départ (le joueur doit racheter la pioche)
    GameState.resources.stone = 15;

    // Mise à jour UI complète
    UI.applyZoneTheme(GameState.currentZone);
    UI.updateAll();
    UI.showNotification(
        `🔄 Reconstruction #${GameState.prestige.count} ! +${fragments} Fragments de Sagesse`,
        'prestige', 5000
    );
    addLog(`🔄 Prestige #${GameState.prestige.count} — +${fragments} Fragments. Nouvelle mine !`);
    SaveSystem.save(GameState);
}


// ============================================================
// GAME LOOP — Boucle principale du jeu
// ============================================================
// requestAnimationFrame appelle gameLoop à chaque frame (≈60fps).
// On calcule le delta time (temps depuis la dernière frame) pour
// rendre la production indépendante du taux de rafraîchissement.

let lastTick      = null; // Timestamp de la dernière frame (ms)
let uiSlowTimer   = 0;    // Compteur pour les mises à jour UI lentes (boutique, etc.)

function gameLoop(timestamp) {
    // Initialise lastTick à la première frame
    if (!lastTick) lastTick = timestamp;

    // Calcule le temps écoulé depuis la dernière frame (en secondes)
    const rawDelta = (timestamp - lastTick) / 1000;
    lastTick = timestamp;

    // Plafonne à 0.5s pour éviter les gains énormes si l'onglet était en arrière-plan
    const delta = Math.min(rawDelta, 0.5);

    // ── Production automatique idle ──────────────────────────
    const pps  = getProductionPerSec();
    const gain = pps * delta;

    if (gain > 0) {
        GameState.resources.stone        += gain;
        GameState.stats.totalStoneEarned += gain;

        // Distribue aussi les ressources secondaires (charbon, fer, etc.)
        distributeSecondaryResources(gain);
    }

    // ── Mise à jour des valeurs dérivées ─────────────────────
    GameState.clickPower       = getClickPower();
    GameState.productionPerSec = pps;
    GameState.stats.totalPlayTime += delta;

    // ── Vérification des zones débloquables ──────────────────
    checkZoneUnlockIndicators();

    // ── Achievements (vérification toutes les 3 secondes) ───
    uiSlowTimer += delta;
    if (uiSlowTimer >= 3) {
        checkAchievements();
        uiSlowTimer = 0;
    }

    // ── Mise à jour UI rapide (chaque frame) ─────────────────
    UI.updateResources();
    UI.updateMineButton();

    // Continue la boucle indéfiniment
    requestAnimationFrame(gameLoop);
}

/**
 * Distribue des ressources secondaires proportionnellement à la production de pierres.
 * Appelé à chaque frame de la game loop et lors des gains hors-ligne.
 *
 * BUG FIX : Dans la v1, rates[0] était 0 → le charbon n'était jamais produit auto.
 * Correction : table avec taux non-nuls pour toutes les ressources.
 *
 * @param {number} stoneProd - Quantité de pierres produites dans ce tick
 */
function distributeSecondaryResources(stoneProd) {
    const zoneIdx  = GameState.zones.findIndex(z => z.active);
    const luckMult = 1 + GameState.prestige.luckBonus / 100;

    // [ressource, taux relatif (% de la prod pierre), zone minimum pour cette ressource]
    const table = [
        ['coal',      0.015,  0],  // 1.5% de la prod pierre en charbon, dès la surface
        ['iron',      0.007,  1],  // 0.7% dès la grotte
        ['gold',      0.003,  2],  // 0.3% dès la mine abandonnée
        ['diamond',   0.001,  3],  // 0.1% dès la zone magma
        ['crystal',   0.0004, 4],  // 0.04% dès le temple ancien
        ['legendary', 0.0001, 5],  // 0.01% dès le laboratoire perdu
    ];

    table.forEach(([res, rate, minZone]) => {
        if (zoneIdx >= minZone) {
            const amount = stoneProd * rate * luckMult * (GameState.activeMultiplier || 1);
            if (amount > 0) {
                GameState.resources[res] = (GameState.resources[res] || 0) + amount;
                const key = `total${capitalize(res)}Earned`;
                GameState.stats[key]     = (GameState.stats[key]     || 0) + amount;
            }
        }
    });
}

/**
 * Met à jour les indicateurs visuels des zones débloquables.
 * BUG FIX v1 : compare les ressources COURANTES au coût (pas totalEarned).
 */
function checkZoneUnlockIndicators() {
    GameState.zones.forEach(zone => {
        if (!zone.unlocked && zone.unlockResource) {
            const current = GameState.resources[zone.unlockResource] || 0;
            const canUnlock = current >= zone.unlockCost;
            // Met à jour la classe CSS 'available' sur l'item de zone
            document.querySelectorAll('.zone-item').forEach(item => {
                const nameEl = item.querySelector('.zone-name');
                if (nameEl && nameEl.textContent === zone.name) {
                    item.classList.toggle('available', canUnlock);
                }
            });
        }
    });
}

/**
 * Vérifie tous les achievements et débloque ceux dont la condition est remplie.
 * Appelé toutes les 3 secondes pour ne pas surcharger le CPU.
 */
function checkAchievements() {
    ACHIEVEMENTS_DATA.forEach(ach => {
        if (!GameState.achievements.includes(ach.id)) {
            try {
                if (ach.condition(GameState)) {
                    GameState.achievements.push(ach.id);
                    UI.showAchievement(ach);
                    addLog(`🏆 Succès : "${ach.name}" débloqué !`);
                }
            } catch (e) { /* Ignore les erreurs silencieusement */ }
        }
    });
}


// ============================================================
// LOG TICKER — Journal des événements en bas de page
// ============================================================

const logEntries = []; // Tableau des N dernières entrées de log
const LOG_MAX    = 30; // Nombre maximum d'entrées conservées

/**
 * Ajoute une entrée dans le log et met à jour l'affichage.
 * @param {string} msg - Message à afficher
 */
function addLog(msg) {
    logEntries.unshift({
        msg,
        time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
    if (logEntries.length > LOG_MAX) logEntries.pop();
    renderLog();
}

/** Met à jour l'affichage du log dans le DOM */
function renderLog() {
    const container = document.getElementById('log-ticker');
    if (!container) return;
    // Affiche les 5 derniers messages avec opacité dégressive
    container.innerHTML = logEntries.slice(0, 5)
        .map((e, i) => `<span class="log-entry${i === 0 ? ' log-new' : ''}" style="opacity:${1 - i * 0.18}">[${e.time}] ${e.msg}</span>`)
        .join('');
}


// ============================================================
// SONS — Web Audio API (léger, sans fichier externe)
// ============================================================
// Les sons sont générés en temps réel via l'API Web Audio.
// Pas de fichiers .mp3 nécessaires !

let audioCtx = null; // Contexte audio (créé une seule fois à la demande)

/** Retourne le contexte audio, le crée s'il n'existe pas encore. */
function getAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            return null; // Navigateur ne supporte pas Web Audio
        }
    }
    return audioCtx;
}

/**
 * Joue une note synthétique simple.
 * @param {number} freq     - Fréquence en Hz
 * @param {number} duration - Durée en secondes
 * @param {string} type     - Type d'oscillateur : 'square', 'sine', 'triangle'
 * @param {number} vol      - Volume (0 à 1)
 */
function playNote(freq, duration, type = 'square', vol = 0.15) {
    const ctx = getAudio();
    if (!ctx) return;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.type = type;
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.01);
}

/** Son de clic : bruit court de pioche */
function playClickSound() {
    playNote(280 + Math.random() * 120, 0.08, 'square', 0.12);
}

/** Son d'achat : accord montant positif */
function playBuySound() {
    [400, 600, 800].forEach((f, i) =>
        setTimeout(() => playNote(f, 0.12, 'sine', 0.1), i * 60)
    );
}


// ============================================================
// EFFETS VISUELS
// ============================================================

/**
 * Crée des particules animées autour du bouton Miner lors d'un clic.
 * Les particules se dispersent en étoile et disparaissent rapidement.
 * @param {Event|null} event - Événement de clic (pour position)
 */
function spawnParticles(event) {
    const container = document.getElementById('particles-container');
    const btn       = document.getElementById('mine-btn');
    if (!container || !btn) return;

    const r     = btn.getBoundingClientRect();
    const cx    = r.left + r.width  / 2;  // Centre X du bouton
    const cy    = r.top  + r.height / 2;  // Centre Y du bouton
    const color = GameState.currentZone?.colorAccent || '#E8A020';

    // Crée 10 particules dispersées en cercle
    for (let i = 0; i < 10; i++) {
        const p     = document.createElement('div');
        p.className = 'particle';

        const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.6; // Direction
        const speed = 50 + Math.random() * 70;   // Vitesse de dispersion
        const size  = 3  + Math.random() * 7;    // Taille de la particule

        // Les variables CSS --vx et --vy sont utilisées dans l'animation CSS
        p.style.cssText = `
            left: ${cx}px; top: ${cy}px;
            width: ${size}px; height: ${size}px;
            --vx: ${Math.cos(angle) * speed}px;
            --vy: ${Math.sin(angle) * speed}px;
            background: ${color};
            box-shadow: 0 0 6px ${color};
        `;

        container.appendChild(p);
        setTimeout(() => p.remove(), 900); // Supprime après l'animation
    }
}

/**
 * Affiche un nombre flottant "+N" qui monte depuis le bouton Miner.
 * Fonction globale car aussi appelée depuis events.js.
 * @param {string}    text  - Texte à afficher (ex: "+42", "📦 +500")
 * @param {Event|null} event - Événement de clic (ignoré, on utilise le bouton)
 */
function showFloatingNumber(text, event) {
    const container = document.getElementById('floating-numbers');
    if (!container) return;

    const btn = document.getElementById('mine-btn');
    let x = window.innerWidth  / 2;
    let y = window.innerHeight / 2;

    if (btn) {
        const r = btn.getBoundingClientRect();
        x = r.left + r.width / 2 + (Math.random() - 0.5) * 80; // Légèrement aléatoire en X
        y = r.top  + r.height / 2 - 10;
    }

    const el       = document.createElement('div');
    el.className   = 'floating-number';
    el.textContent = text;
    el.style.left  = `${x}px`;
    el.style.top   = `${y}px`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// Alias pour les appels internes (rétrocompatibilité)
function spawnFloatingNumber(text, event) {
    showFloatingNumber(text, event);
}

/**
 * Crée une étincelle d'ambiance aléatoire dans la zone de minage.
 * Appelée toutes les ~800ms pour donner vie à l'environnement.
 */
function spawnAmbientSpark() {
    const area  = document.getElementById('mine-area');
    if (!area) return;

    const color = GameState.currentZone?.colorAccent || '#E8A020';
    const spark = document.createElement('div');
    spark.className = 'ambient-spark';
    spark.style.cssText = `
        left: ${10 + Math.random() * 80}%;
        top:  ${10 + Math.random() * 80}%;
        background: ${color};
        box-shadow: 0 0 8px ${color};
        animation-duration: ${1.5 + Math.random() * 2}s;
    `;
    area.appendChild(spark);
    setTimeout(() => spark.remove(), 3000);
}

/** Démarre la boucle des étincelles d'ambiance */
function startAmbience() {
    setInterval(spawnAmbientSpark, 800);
}


// ============================================================
// MODULE UI — Tout ce qui touche l'affichage DOM
// ============================================================
// Principe : UI ne modifie JAMAIS GameState. Il ne fait que LIRE.
// Toutes les modifications passent par les fonctions d'action ci-dessus.

const UI = {

    // Cache des éléments DOM fréquemment accédés (évite querySelectorAll en boucle)
    els: {},

    /**
     * Initialise le cache des éléments DOM.
     * Appelé une seule fois dans init().
     */
    init() {
        this.els = {
            // Ressources dans la top bar
            stoneVal:       document.getElementById('res-stone'),
            coalVal:        document.getElementById('res-coal'),
            ironVal:        document.getElementById('res-iron'),
            goldVal:        document.getElementById('res-gold'),
            diamondVal:     document.getElementById('res-diamond'),
            crystalVal:     document.getElementById('res-crystal'),
            legendaryVal:   document.getElementById('res-legendary'),
            stonePerSec:    document.getElementById('stone-per-sec'),
            // Centre
            clickPowerEl:   document.getElementById('click-power'),
            mineBtn:        document.getElementById('mine-btn'),
            mineBtnText:    document.getElementById('mine-btn-text'),
            // Boutique (panneau droit)
            shopBuildings:  document.getElementById('shop-buildings'),
            shopUpgrades:   document.getElementById('shop-upgrades'),
            totalBuildings: document.getElementById('total-buildings'),
            // Panneau gauche
            zonesPanel:     document.getElementById('zones-panel'),
            depthBar:       document.getElementById('depth-bar-fill'),
            depthValue:     document.getElementById('depth-value'),
            zoneNameEl:     document.getElementById('current-zone-name'),
            zoneDescEl:     document.getElementById('current-zone-desc'),
            statsPanel:     document.getElementById('stats-content'),
            achievPanel:    document.getElementById('achievements-content'),
            // Prestige
            prestigeBtn:    document.getElementById('prestige-btn'),
            prestigeFrags:  document.getElementById('prestige-fragments'),
            prestigePreview:document.getElementById('prestige-preview'),
            // Événements & notifications
            eventBanner:    document.getElementById('event-banner'),
            notifContainer: document.getElementById('notifications'),
            achievPopup:    document.getElementById('achievement-popup'),
        };
    },

    // ────────────────────────────────────────────────────────
    // MISE À JOUR RAPIDE (appelée chaque frame par gameLoop)
    // ────────────────────────────────────────────────────────

    /** Met à jour les compteurs de ressources dans la top bar */
    updateResources() {
        const r   = GameState.resources;
        const set = (el, v) => { if (el) el.textContent = formatNumber(v); };

        set(this.els.stoneVal,     r.stone);
        set(this.els.coalVal,      r.coal);
        set(this.els.ironVal,      r.iron);
        set(this.els.goldVal,      r.gold);
        set(this.els.diamondVal,   r.diamond);
        set(this.els.crystalVal,   r.crystal);
        set(this.els.legendaryVal, r.legendary);

        if (this.els.stonePerSec) {
            this.els.stonePerSec.textContent = `${formatNumber(GameState.productionPerSec)}/s`;
        }
    },

    /** Met à jour l'affichage de la puissance de clic sous le bouton Miner */
    updateMineButton() {
        if (this.els.clickPowerEl) {
            if (hasStarterPickaxe()) {
                this.els.clickPowerEl.textContent = `+${formatNumber(getClickGain())} / clic`;
            } else {
                // Indique au joueur ce qu'il doit faire
                this.els.clickPowerEl.textContent = `Achetez la Pioche de Base !`;
            }
        }
    },

    /**
     * Met à jour l'état visuel du bouton Miner (actif/bloqué).
     * Appelé après chaque achat pour détecter si la pioche vient d'être achetée.
     */
    updateMineButtonState() {
        const btn  = this.els.mineBtn;
        const text = this.els.mineBtnText;
        if (!btn) return;

        if (hasStarterPickaxe()) {
            // Bouton actif : cliquable
            btn.disabled = false;
            btn.classList.remove('locked');
            if (text) text.textContent = 'Miner';
        } else {
            // Bouton verrouillé : indique l'action à faire
            btn.disabled = true;
            btn.classList.add('locked');
            if (text) text.textContent = '🔒 Achète une pioche !';
        }
    },

    // ────────────────────────────────────────────────────────
    // BOUTIQUE (mise à jour toutes les secondes)
    // ────────────────────────────────────────────────────────

    /** Met à jour tout le contenu de la boutique */
    updateShop() {
        this.renderBuildings();
        this.renderUpgrades();
        // Met à jour le compteur total de bâtiments
        if (this.els.totalBuildings) {
            this.els.totalBuildings.textContent =
                GameState.buildings.reduce((t, b) => t + b.count, 0);
        }
    },

    /** Rend la liste des bâtiments dans l'onglet "Bâtiments" */
    renderBuildings() {
        const container = this.els.shopBuildings;
        if (!container) return;
        container.innerHTML = '';

        GameState.buildings.forEach(building => {
            // Masque les bâtiments non encore débloqués
            if (!isBuildingVisible(building)) return;

            // Calcule le coût selon le mode d'achat actuel
            const mode = GameState.buyMode;
            let cost, canAfford, modeLabel;

            if (mode === 'max') {
                const res = getBuildingMaxAffordable(building, building.count, GameState.resources.stone);
                cost      = res.cost;
                canAfford = res.count > 0;
                modeLabel = res.count > 0 ? `×${res.count}` : '×0';
            } else {
                cost      = getBuildingBulkCost(building, building.count, mode);
                canAfford = GameState.resources.stone >= cost;
                modeLabel = `×${mode}`;
            }

            // Calcule le temps avant de pouvoir se l'offrir (si pas abordable)
            const nextCost = getBuildingCost(building, building.count);
            const tta      = timeToAfford(nextCost, GameState.resources.stone);
            const ttaStr   = !canAfford && tta < Infinity ? ` (${formatTime(tta)})` : '';

            const item = document.createElement('div');
            item.className = `shop-item building-item${canAfford ? ' affordable' : ''}`;
            item.innerHTML = `
                <div class="shop-item-icon">${building.emoji}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${building.name}</div>
                    <div class="shop-item-desc">${building.desc}</div>
                    <div class="shop-item-prod">Prod : ${formatNumber(building.baseProduction * building.count)}/s</div>
                </div>
                <div class="shop-item-right">
                    <div class="shop-item-count">${building.count}</div>
                    <div class="shop-item-buy-label">${modeLabel}</div>
                    <div class="shop-item-cost ${canAfford ? 'can-afford' : 'cannot-afford'}">
                        🪨 ${formatNumber(cost)}${ttaStr}
                    </div>
                </div>`;
            item.addEventListener('click', () => buyBuilding(building.id));
            container.appendChild(item);
        });
    },

    /** Rend la liste des upgrades dans l'onglet "Améliorations" */
    renderUpgrades() {
        const container = this.els.shopUpgrades;
        if (!container) return;

        const visible = GameState.upgrades.filter(u => isUpgradeVisible(u));

        if (visible.length === 0) {
            container.innerHTML = '<div class="shop-empty">Continuez à miner pour débloquer des améliorations !</div>';
            return;
        }

        container.innerHTML = '';
        visible.forEach(upgrade => {
            const canAfford = canAffordUpgrade(upgrade);

            // Temps avant affordabilité
            const tta    = timeToAfford(upgrade.cost, GameState.resources[upgrade.costResource] || 0);
            const ttaStr = !canAfford && tta < Infinity
                ? `<span class="tta"> (${formatTime(tta)})</span>` : '';

            const item = document.createElement('div');
            item.className = `shop-item upgrade-item${canAfford ? ' affordable' : ''}`;

            // Mise en avant spéciale pour la pioche de départ
            if (upgrade.isStarter) {
                item.classList.add('starter-upgrade');
            }

            item.innerHTML = `
                <div class="shop-item-icon">${upgrade.emoji}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${upgrade.name}${upgrade.isStarter ? ' ⭐' : ''}</div>
                    <div class="shop-item-desc">${upgrade.desc}</div>
                    <div class="shop-item-effect">${getUpgradeEffectText(upgrade)}</div>
                </div>
                <div class="shop-item-right">
                    <div class="shop-item-cost ${canAfford ? 'can-afford' : 'cannot-afford'}">
                        ${getResEmoji(upgrade.costResource)} ${formatNumber(upgrade.cost)}${ttaStr}
                    </div>
                </div>`;
            item.addEventListener('click', () => buyUpgrade(upgrade.id));
            container.appendChild(item);
        });
    },

    // ────────────────────────────────────────────────────────
    // PANNEAU DE ZONE (gauche)
    // ────────────────────────────────────────────────────────

    /** Met à jour les informations de zone (nom, description, barre de profondeur, liste) */
    updateZonePanel() {
        const zone = GameState.currentZone;
        if (!zone) return;

        if (this.els.zoneNameEl) this.els.zoneNameEl.textContent = `${zone.emoji} ${zone.name}`;
        if (this.els.zoneDescEl) this.els.zoneDescEl.textContent = zone.desc;

        // Barre de progression de profondeur
        const maxDepth = ZONES_DATA[ZONES_DATA.length - 1].depth;
        const pct      = (zone.depth / maxDepth) * 100;
        if (this.els.depthBar)   this.els.depthBar.style.width    = `${pct}%`;
        if (this.els.depthValue) this.els.depthValue.textContent  = `${zone.depth}m`;

        this.renderZones();

        // Met à jour l'indicateur de zone dans le centre
        const nameEl  = document.getElementById('mine-zone-name');
        const emojiEl = document.getElementById('mine-zone-emoji');
        if (nameEl)  nameEl.textContent  = zone.name;
        if (emojiEl) emojiEl.textContent = zone.emoji;
    },

    /** Rend la liste des zones dans le panneau gauche */
    renderZones() {
        const container = this.els.zonesPanel;
        if (!container) return;
        container.innerHTML = '';

        GameState.zones.forEach(zone => {
            const item = document.createElement('div');
            const canUnlock = !zone.unlocked && zone.unlockResource &&
                (GameState.resources[zone.unlockResource] || 0) >= zone.unlockCost;

            item.className = [
                'zone-item',
                zone.unlocked ? 'unlocked' : 'locked',
                zone.active   ? 'active'   : '',
                canUnlock     ? 'available': '',
            ].filter(Boolean).join(' ');

            if (zone.unlocked) {
                // Zone débloquée : cliquable pour l'activer
                item.innerHTML = `
                    <span class="zone-emoji">${zone.emoji}</span>
                    <span class="zone-name">${zone.name}</span>
                    <span class="zone-depth">${zone.depth}m</span>`;
                item.addEventListener('click', () => activateZone(zone.id));
            } else {
                // Zone verrouillée : affiche le coût
                item.innerHTML = `
                    <span class="zone-emoji">${canUnlock ? zone.emoji : '🔒'}</span>
                    <span class="zone-name">${zone.name}</span>
                    <span class="zone-cost ${canUnlock ? 'can-afford' : ''}">
                        ${canUnlock ? '▶ Débloquer : ' : ''}${formatNumber(zone.unlockCost)} 🪨
                    </span>`;
                if (canUnlock) {
                    item.addEventListener('click', () => {
                        unlockZone(zone.id);
                        activateZone(zone.id);
                        this.renderZones();
                    });
                }
            }
            container.appendChild(item);
        });
    },

    // ────────────────────────────────────────────────────────
    // STATISTIQUES
    // ────────────────────────────────────────────────────────

    /** Met à jour le panneau de statistiques */
    updateStats() {
        const container = this.els.statsPanel;
        if (!container) return;

        const s      = GameState.stats;
        const totalB = GameState.buildings.reduce((t, b) => t + b.count, 0);

        container.innerHTML = `
            <div class="stat-row"><span>🖱️ Total clics</span>              <span>${formatNumber(s.totalClicks)}</span></div>
            <div class="stat-row"><span>🪨 Pierres gagnées</span>           <span>${formatNumber(s.totalStoneEarned)}</span></div>
            <div class="stat-row"><span>🖤 Charbon gagné</span>             <span>${formatNumber(s.totalCoalEarned || 0)}</span></div>
            <div class="stat-row"><span>💎 Diamants gagnés</span>           <span>${formatNumber(s.totalDiamondEarned || 0)}</span></div>
            <div class="stat-row"><span>🌟 Légendaire gagné</span>          <span>${formatNumber(s.totalLegendaryEarned || 0)}</span></div>
            <div class="stat-row"><span>🏗️ Bâtiments totaux</span>          <span>${totalB}</span></div>
            <div class="stat-row"><span>🗺️ Zones débloquées</span>          <span>${GameState.zones.filter(z => z.unlocked).length} / ${GameState.zones.length}</span></div>
            <div class="stat-row"><span>⚡ Production/seconde</span>        <span>${formatNumber(GameState.productionPerSec)}</span></div>
            <div class="stat-row"><span>⛏️ Puissance de clic</span>         <span>${formatNumber(GameState.clickPower)}</span></div>
            <div class="stat-row"><span>🔢 Mult. de zone</span>             <span>×${getZoneMultiplier()}</span></div>
            <div class="stat-row"><span>🎲 Événements vécus</span>          <span>${s.eventsTriggered}</span></div>
            <div class="stat-row"><span>⏱️ Temps de jeu total</span>        <span>${formatTime(s.totalPlayTime)}</span></div>
            <div class="stat-row"><span>🔄 Prestiges effectués</span>       <span>${GameState.prestige.count}</span></div>
        `;
    },

    // ────────────────────────────────────────────────────────
    // PRESTIGE
    // ────────────────────────────────────────────────────────

    /** Met à jour le panneau Prestige */
    updatePrestigePanel() {
        const frags    = getPrestigeFragments();
        const zonesOk  = GameState.zones.filter(z => z.unlocked).length >= 5;
        const canPrest = frags > 0 && zonesOk;

        if (this.els.prestigeFrags) {
            this.els.prestigeFrags.textContent = `${GameState.prestige.totalFragments} Fragments de Sagesse`;
        }
        if (this.els.prestigePreview) {
            if (canPrest) {
                this.els.prestigePreview.innerHTML =
                    `<span style="color:#FFD700">✅ +${frags} Fragment${frags > 1 ? 's' : ''} disponibles !</span>`;
            } else if (!zonesOk) {
                const remaining = 5 - GameState.zones.filter(z => z.unlocked).length;
                this.els.prestigePreview.textContent = `Débloquez encore ${remaining} zone(s)`;
            } else {
                this.els.prestigePreview.textContent = 'Accumulez plus de pierres (min. 1M)';
            }
        }
        if (this.els.prestigeBtn) {
            this.els.prestigeBtn.disabled = !canPrest;
            this.els.prestigeBtn.classList.toggle('ready', canPrest);
        }

        // Affichage des bonus actuels
        const p   = GameState.prestige;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('pb-click', `+${p.clickBonus}%`);
        set('pb-auto',  `+${p.autoBonus}%`);
        set('pb-luck',  `+${p.luckBonus}%`);
        set('pb-count', p.count);
    },

    // ────────────────────────────────────────────────────────
    // ACHIEVEMENTS
    // ────────────────────────────────────────────────────────

    /** Rend la grille de succès dans le panneau gauche */
    renderAchievements() {
        const container = this.els.achievPanel;
        if (!container) return;

        const unlocked = GameState.achievements.length;
        const total    = ACHIEVEMENTS_DATA.length;

        // Met à jour le compteur dans l'onglet
        const countEl = document.getElementById('ach-count');
        if (countEl) countEl.textContent = `${unlocked} / ${total}`;

        container.innerHTML = '';
        ACHIEVEMENTS_DATA.forEach(ach => {
            const done = GameState.achievements.includes(ach.id);
            const item = document.createElement('div');
            item.className = `achievement-item ${done ? 'unlocked' : 'locked'}`;
            item.innerHTML = `
                <span class="ach-emoji">${done ? ach.emoji : '🔒'}</span>
                <div class="ach-info">
                    <div class="ach-name">${done ? ach.name : '???'}</div>
                    <div class="ach-desc">${done ? ach.desc : 'Continuez à jouer...'}</div>
                </div>`;
            container.appendChild(item);
        });
    },

    // ────────────────────────────────────────────────────────
    // THÈME DE ZONE
    // ────────────────────────────────────────────────────────

    /**
     * Change le thème visuel selon la zone active.
     * Modifie les variables CSS --zone-primary, --zone-accent, --zone-bg.
     * @param {Object} zone - L'objet zone actif
     */
    applyZoneTheme(zone) {
        const root = document.documentElement;
        root.style.setProperty('--zone-primary', zone.colorPrimary);
        root.style.setProperty('--zone-accent',  zone.colorAccent);
        root.style.setProperty('--zone-bg',       zone.colorBg);

        // Change le data-zone pour les animations CSS de fond
        document.getElementById('mine-area')?.setAttribute('data-zone', zone.ambience);
    },

    // ────────────────────────────────────────────────────────
    // NOTIFICATIONS ET POPUPS
    // ────────────────────────────────────────────────────────

    /**
     * Affiche une notification toast en haut à droite.
     * @param {string} msg      - Message
     * @param {string} type     - 'info' | 'success' | 'prestige'
     * @param {number} duration - Durée d'affichage en ms (défaut 3000)
     */
    showNotification(msg, type = 'info', duration = 3000) {
        if (!GameState.settings.notificationsEnabled) return;
        const container = this.els.notifContainer;
        if (!container) return;

        const notif = document.createElement('div');
        notif.className = `notification notif-${type}`;
        notif.textContent = msg;
        container.appendChild(notif);

        // Déclenche l'animation CSS d'entrée
        requestAnimationFrame(() => notif.classList.add('visible'));

        // Retire la notification après la durée
        setTimeout(() => {
            notif.classList.remove('visible');
            setTimeout(() => notif.remove(), 400);
        }, duration);
    },

    /** Affiche la bannière d'événement en bas de page */
    showEventBanner(evt) {
        const banner = this.els.eventBanner;
        if (!banner) return;

        // Barre de durée animée (si événement temporaire)
        const timerHTML = evt.duration > 0
            ? `<div class="event-timer"><div class="event-timer-fill" style="animation-duration:${evt.duration}ms"></div></div>`
            : '';

        banner.innerHTML = `
            <div class="event-icon">${evt.emoji}</div>
            <div class="event-info">
                <div class="event-name" style="color:${evt.color}">${evt.name}</div>
                <div class="event-desc">${evt.desc}</div>
            </div>${timerHTML}`;

        banner.className = `event-banner active event-${evt.type}`;
        banner.style.borderColor = evt.color;

        // Masque automatiquement les événements instantanés après 4s
        if (evt.duration === 0) {
            setTimeout(() => this.hideEventBanner(), 4000);
        }
    },

    /** Masque la bannière d'événement */
    hideEventBanner() {
        if (this.els.eventBanner) {
            this.els.eventBanner.className = 'event-banner';
        }
    },

    /** Affiche le popup de succès débloqué en bas de page */
    showAchievement(ach) {
        const popup = this.els.achievPopup;
        if (!popup) return;

        popup.innerHTML = `
            <div class="ach-popup-icon">${ach.emoji}</div>
            <div class="ach-popup-text">
                <div class="ach-popup-title">Succès débloqué !</div>
                <div class="ach-popup-name">${ach.name}</div>
            </div>`;

        popup.classList.add('visible');
        setTimeout(() => popup.classList.remove('visible'), 3500);

        // Actualise le panneau achievements
        this.renderAchievements();
    },

    /** Met à jour TOUT l'affichage d'un coup (utilisé après prestige/chargement) */
    updateAll() {
        this.updateResources();
        this.updateMineButton();
        this.updateMineButtonState();
        this.updateShop();
        this.updateZonePanel();
        this.updateStats();
        this.updatePrestigePanel();
        this.renderAchievements();
    },
};


// ============================================================
// HELPERS D'AFFICHAGE (utilisés par UI.renderUpgrades)
// ============================================================

/** Retourne l'emoji correspondant à un id de ressource */
function getResEmoji(id) {
    const map = {
        stone: '🪨', coal: '🖤', iron: '⚙️',
        gold: '🥇', diamond: '💎', crystal: '🔮', legendary: '🌟',
    };
    return map[id] || '💰';
}

/** Retourne le texte d'effet affiché sous un upgrade en boutique */
function getUpgradeEffectText(upgrade) {
    if (upgrade.isStarter)       return '🔓 Débloque le minage';
    if (upgrade.type === 'click') return `⛏️ Clic ×${upgrade.multiplier}`;
    if (upgrade.type === 'auto')  return `🏗️ ${upgrade.target} ×${upgrade.multiplier}`;
    if (upgrade.type === 'global')return `⚡ Production globale ×${upgrade.multiplier}`;
    return '';
}


// ============================================================
// GESTION DES ONGLETS DE L'INTERFACE
// ============================================================

/** Initialise les deux systèmes d'onglets (boutique droite + panneaux gauche) */
function initTabs() {

    // Onglets de la boutique (Bâtiments / Améliorations)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${target}`)?.classList.add('active');
        });
    });

    // Onglets du panneau gauche (Zone / Stats / Succès / Prestige)
    document.querySelectorAll('.left-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.panel;
            document.querySelectorAll('.left-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.left-panel-content').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`panel-${target}`)?.classList.add('active');

            // Actualise le contenu selon l'onglet ouvert
            if (target === 'achievements') UI.renderAchievements();
            if (target === 'stats')        UI.updateStats();
            if (target === 'prestige')     UI.updatePrestigePanel();
        });
    });
}


// ============================================================
// INITIALISATION DU JEU — Point d'entrée
// ============================================================

function init() {
    // ── 1. Prépare l'état initial ────────────────────────────
    initGameState();

    // ── 2. Charge la sauvegarde si elle existe ───────────────
    const loadResult = SaveSystem.load(GameState);

    // Si aucune sauvegarde : donne 15 pierres de départ (premier lancement)
    if (!loadResult || !loadResult.success) {
        GameState.resources.stone = 15;
        addLog('⛏️ Bienvenue dans Minéria ! Achetez votre première pioche pour commencer.');
    }

    // Resync la zone active (peut avoir changé si sauvegarde chargée)
    GameState.currentZone = GameState.zones.find(z => z.active) || GameState.zones[0];

    // ── 3. Initialise l'UI ───────────────────────────────────
    UI.init();
    UI.applyZoneTheme(GameState.currentZone);
    UI.updateAll(); // Rend tout une première fois
    initTabs();

    // ── 4. Bouton principal Miner ────────────────────────────
    const mineBtn = document.getElementById('mine-btn');
    if (mineBtn) {
        mineBtn.addEventListener('click', performClick);
    }

    // ── 5. Touche Espace = miner (si focus sur le body) ──────
    document.addEventListener('keydown', e => {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault(); // Empêche le scroll de page
            performClick(null);
        }
    });

    // ── 6. Boutons de mode d'achat (×1 / ×10 / ×100 / Max) ──
    document.querySelectorAll('.buy-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.buy-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            // Convertit 'max' en string, les autres en entier
            GameState.buyMode = mode === 'max' ? 'max' : parseInt(mode, 10);
            UI.updateShop(); // Rafraîchit les coûts affichés
        });
    });

    // ── 7. Prestige (modal de confirmation) ──────────────────
    document.getElementById('prestige-btn')?.addEventListener('click', () => {
        const frags = getPrestigeFragments();
        const el    = document.getElementById('modal-fragments-preview');
        if (el) el.textContent = `+${frags} Fragment${frags > 1 ? 's' : ''} de Sagesse`;
        document.getElementById('prestige-modal')?.classList.add('visible');
    });

    document.getElementById('prestige-confirm')?.addEventListener('click', () => {
        performPrestige();
        document.getElementById('prestige-modal')?.classList.remove('visible');
    });

    document.getElementById('prestige-cancel')?.addEventListener('click', () => {
        document.getElementById('prestige-modal')?.classList.remove('visible');
    });

    // ── 8. Paramètres header ─────────────────────────────────

    // Bouton Son
    document.getElementById('sound-toggle')?.addEventListener('click', () => {
        GameState.settings.soundEnabled = !GameState.settings.soundEnabled;
        const btn = document.getElementById('sound-toggle');
        if (btn) {
            btn.textContent = GameState.settings.soundEnabled ? '🔊' : '🔇';
            btn.classList.toggle('active', GameState.settings.soundEnabled);
        }
        // Débloque le contexte audio (nécessaire dans certains navigateurs)
        if (GameState.settings.soundEnabled) getAudio()?.resume();
    });

    // Bouton Particules
    document.getElementById('particles-toggle')?.addEventListener('click', () => {
        GameState.settings.particlesEnabled = !GameState.settings.particlesEnabled;
        document.getElementById('particles-toggle')
            ?.classList.toggle('active', GameState.settings.particlesEnabled);
    });

    // Bouton Sauvegarde manuelle
    document.getElementById('save-btn')?.addEventListener('click', () => {
        SaveSystem.save(GameState);
        UI.showNotification('💾 Partie sauvegardée !', 'success');
    });

    // Bouton Reset complet
    document.getElementById('reset-btn')?.addEventListener('click', () => {
        if (confirm('⚠️ Supprimer TOUTE la progression ?\nCette action est IRRÉVERSIBLE.')) {
            SaveSystem.deleteSave();
            location.reload();
        }
    });

    // ── 9. Gains hors connexion (si sauvegarde chargée) ──────
    if (loadResult?.success && loadResult.offlineSeconds > 10) {
        // On calcule les gains APRÈS avoir chargé la sauvegarde (pour les upgrades)
        const pps         = getProductionPerSec();
        const cappedSecs  = Math.min(loadResult.offlineSeconds, 8 * 3600); // Max 8h
        const offlineGain = pps * cappedSecs;

        if (offlineGain > 0) {
            GameState.resources.stone        += offlineGain;
            GameState.stats.totalStoneEarned += offlineGain;
            distributeSecondaryResources(offlineGain);

            // Affiche le message avec un délai pour laisser le temps à l'UI de charger
            setTimeout(() => {
                UI.showNotification(
                    `⏰ Absent ${formatTime(loadResult.offlineSeconds)} → +${formatNumber(offlineGain)} 🪨`,
                    'info', 6000
                );
                addLog(`⏰ Gains hors-ligne (${formatTime(cappedSecs)}) : +${formatNumber(offlineGain)} 🪨`);
            }, 1000);
        }
    }

    // ── 10. Démarre les systèmes périodiques ─────────────────

    // Auto-save toutes les 30s
    SaveSystem.startAutoSave(GameState);

    // Événements aléatoires
    EventSystem.start(GameState);

    // Étincelles d'ambiance visuelle
    startAmbience();

    // Mises à jour UI lentes (toutes les secondes : boutique, stats, etc.)
    setInterval(() => {
        UI.updateShop();
        UI.updateZonePanel();
        UI.updateStats();
        UI.updatePrestigePanel();
        renderLog();
    }, 1000);

    // ── 11. Lance la game loop ────────────────────────────────
    requestAnimationFrame(gameLoop);

    addLog('⛏️ Minéria chargé. Bonne mine !');
    console.log('⛏️ Minéria v1.1 — Jeu lancé avec succès.');
}

// Lance init() quand le DOM est entièrement chargé
document.addEventListener('DOMContentLoaded', init);