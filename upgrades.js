/**
 * ============================================================
 * MINÉRIA — upgrades.js
 * ============================================================
 * Ce fichier contient TOUTES les données statiques du jeu :
 *   - Bâtiments (producteurs automatiques)
 *   - Upgrades (améliorations ponctuelles)
 *   - Zones de la mine
 *   - Succès (achievements)
 *
 * PRINCIPE "DATA-DRIVEN" :
 *   Pour modifier l'équilibre du jeu, c'est ICI qu'il faut
 *   toucher. Pas besoin de modifier script.js.
 *
 * FORMULE DES COÛTS DE BÂTIMENTS :
 *   coût(n) = baseCost × costMultiplier^n
 *   (même formule que Cookie Clicker — progression exponentielle)
 * ============================================================
 */


// ============================================================
// BÂTIMENTS — Producteurs automatiques de ressources
// ============================================================
// Chaque bâtiment génère des pierres par seconde, même sans cliquer.
// Le joueur les achète avec ses pierres. Plus il en a, plus ça coûte.
//
// Champs :
//   id              → identifiant unique (clé interne)
//   name            → nom affiché en boutique
//   emoji           → icône visuelle
//   desc            → description courte
//   baseCost        → coût du premier achat (en pierres)
//   baseProduction  → pierres/seconde pour UN bâtiment
//   costMultiplier  → coefficient d'inflation (1.15 = +15% par achat)
//   unlockResource  → ressource nécessaire pour voir ce bâtiment
//   unlockAmount    → quantité totale gagnée pour débloquer la visibilité
// ============================================================

const BUILDINGS_DATA = [

    // ── NIVEAU 1 : Mineur manuel ──────────────────────────────
    // Premier bâtiment disponible, très bon rapport coût/production en début.
    {
        id: 'miner',
        name: 'Mineur Manuel',
        emoji: '⛏️',
        desc: 'Un brave mineur qui creuse sans relâche, jour et nuit.',
        baseCost: 15,            // Coût pour le 1er mineur
        baseProduction: 0.1,     // 0.1 pierre/seconde par mineur
        costMultiplier: 1.15,    // Chaque nouveau mineur coûte 15% de plus
        unlockResource: 'stone',
        unlockAmount: 8,         // Visible après avoir gagné 8 pierres au total
    },

    // ── NIVEAU 2 : Foreuse mécanique ─────────────────────────
    // Beaucoup plus efficace, mais bien plus chère.
    {
        id: 'drill',
        name: 'Foreuse',
        emoji: '🔩',
        desc: 'Machine mécanique perforant la roche avec puissance.',
        baseCost: 100,
        baseProduction: 0.5,
        costMultiplier: 1.15,
        unlockResource: 'stone',
        unlockAmount: 60,
    },

    // ── NIVEAU 3 : Robot autonome ─────────────────────────────
    // Nécessite d'avoir trouvé du charbon (ressource secondaire).
    {
        id: 'robot',
        name: 'Robot Mineur',
        emoji: '🤖',
        desc: 'Automate infatigable programmé pour miner 24h/24.',
        baseCost: 1100,
        baseProduction: 4,
        costMultiplier: 1.15,
        unlockResource: 'coal',  // Nécessite d'avoir trouvé du charbon
        unlockAmount: 30,
    },

    // ── NIVEAU 4 : Dynamite industrielle ─────────────────────
    {
        id: 'dynamite',
        name: 'Dynamite Industrielle',
        emoji: '💥',
        desc: 'Explosions contrôlées pour extraire massivement.',
        baseCost: 12000,
        baseProduction: 20,
        costMultiplier: 1.15,
        unlockResource: 'iron',
        unlockAmount: 20,
    },

    // ── NIVEAU 5 : Scanner ────────────────────────────────────
    {
        id: 'scanner',
        name: 'Scanner de Minerais',
        emoji: '📡',
        desc: 'Localise les veines riches avant de creuser.',
        baseCost: 130000,
        baseProduction: 100,
        costMultiplier: 1.15,
        unlockResource: 'gold',
        unlockAmount: 10,
    },

    // ── NIVEAU 6 : Usine ──────────────────────────────────────
    {
        id: 'refinery',
        name: 'Usine de Raffinage',
        emoji: '🏭',
        desc: 'Raffine les minerais bruts en ressources concentrées.',
        baseCost: 1400000,
        baseProduction: 500,
        costMultiplier: 1.15,
        unlockResource: 'diamond',
        unlockAmount: 5,
    },

    // ── NIVEAU 7 : Foreuse antimatière ───────────────────────
    {
        id: 'antimatter_drill',
        name: 'Foreuse Antimatière',
        emoji: '⚡',
        desc: 'Technologie expérimentale dissolvant la roche moléculairement.',
        baseCost: 20000000,
        baseProduction: 2500,
        costMultiplier: 1.15,
        unlockResource: 'crystal',
        unlockAmount: 3,
    },

    // ── NIVEAU 8 : Extracteur de noyau ───────────────────────
    {
        id: 'core_extractor',
        name: 'Extracteur de Noyau',
        emoji: '🌋',
        desc: 'Puise directement dans l\'énergie brute du noyau terrestre.',
        baseCost: 500000000,
        baseProduction: 15000,
        costMultiplier: 1.15,
        unlockResource: 'legendary',
        unlockAmount: 1,
    },
];


// ============================================================
// UPGRADES — Améliorations ponctuelles à acheter une seule fois
// ============================================================
// Les upgrades sont permanents une fois achetés.
// Ils n'apparaissent dans la boutique que quand leurs conditions
// de déblocage sont remplies, et disparaissent une fois achetés.
//
// Types d'upgrade :
//   'click'  → multiplie la puissance du clic
//   'auto'   → multiplie la production d'un bâtiment spécifique
//   'global' → multiplie TOUTE la production automatique
//
// Conditions de déblocage :
//   unlockResource + unlockAmount → avoir gagné X unités de cette ressource
//   unlockBuilding + unlockCount  → posséder X bâtiments de ce type
// ============================================================

const UPGRADES_DATA = [

    // ────────────────────────────────────────────────────────
    // PIOCHES — Améliorations de la puissance de clic
    // ────────────────────────────────────────────────────────

    // !! PIOCHE DE DÉPART — Spéciale !!
    // Le joueur commence avec 15 pierres et DOIT acheter cette pioche
    // pour pouvoir miner. C'est le "tutoriel" forcé.
    // Multiplicateur = 1 car c'est juste le déverrouillage du minage.
    {
        id: 'pickaxe_starter',
        name: 'Pioche de Base',
        emoji: '🪓',
        desc: 'Indispensable pour commencer à miner. Premier outil.',
        cost: 15,                // Coûte exactement les 15 pierres de départ
        costResource: 'stone',
        type: 'click',
        multiplier: 1,           // Débloque le minage (×1 = 1 pierre/clic)
        isStarter: true,         // Flag spécial : toujours visible dès le début
    },

    // Pioche en Pierre — 2ème pioche
    {
        id: 'pickaxe_stone',
        name: 'Pioche en Pierre',
        emoji: '⛏️',
        desc: 'Plus solide, frappe plus fort dans la roche.',
        cost: 75,
        costResource: 'stone',
        type: 'click',
        multiplier: 2,           // Double la puissance de clic
        unlockResource: 'stone',
        unlockAmount: 40,
    },

    // Pioche en Fer
    {
        id: 'pickaxe_iron',
        name: 'Pioche en Fer',
        emoji: '🔨',
        desc: 'Métal robuste pour une extraction bien plus efficace.',
        cost: 400,
        costResource: 'stone',
        type: 'click',
        multiplier: 3,
        unlockResource: 'coal',
        unlockAmount: 5,
    },

    // Pioche en Or
    {
        id: 'pickaxe_gold',
        name: 'Pioche Dorée',
        emoji: '✨',
        desc: 'Symbole de prestige. Étonnamment efficace.',
        cost: 4000,
        costResource: 'stone',
        type: 'click',
        multiplier: 4,
        unlockResource: 'gold',
        unlockAmount: 3,
    },

    // Pioche en Diamant
    {
        id: 'pickaxe_diamond',
        name: 'Pioche en Diamant',
        emoji: '💎',
        desc: 'Taille toute roche sans le moindre effort apparent.',
        cost: 40000,
        costResource: 'stone',
        type: 'click',
        multiplier: 5,
        unlockResource: 'diamond',
        unlockAmount: 1,
    },

    // Pioche Cristalline
    {
        id: 'pickaxe_crystal',
        name: 'Pioche Cristalline',
        emoji: '🔮',
        desc: 'Canalisée par l\'énergie des cristaux du sous-sol.',
        cost: 400000,
        costResource: 'stone',
        type: 'click',
        multiplier: 8,
        unlockResource: 'crystal',
        unlockAmount: 1,
    },

    // Pioche Légendaire
    {
        id: 'pickaxe_legendary',
        name: 'Pioche Légendaire',
        emoji: '🌟',
        desc: 'Forgée dans le noyau terrestre. Absolument divine.',
        cost: 8000000,
        costResource: 'stone',
        type: 'click',
        multiplier: 15,
        unlockResource: 'legendary',
        unlockAmount: 0.5,
    },

    // ────────────────────────────────────────────────────────
    // AMÉLIORATIONS DE BÂTIMENTS — Doublent/triplent leur production
    // ────────────────────────────────────────────────────────

    // Mineur Manuel ×2 (après 5 mineurs)
    {
        id: 'hard_hats',
        name: 'Casques Renforcés',
        emoji: '⛑️',
        desc: 'Des casques modernes = des mineurs plus productifs.',
        cost: 200,
        costResource: 'stone',
        type: 'auto',
        target: 'miner',        // S'applique uniquement aux "miner"
        multiplier: 2,
        unlockBuilding: 'miner',
        unlockCount: 5,
    },

    // Mineur Manuel ×3 (après 25 mineurs)
    {
        id: 'minecart',
        name: 'Wagonnets à Charbon',
        emoji: '🚃',
        desc: 'Transport accéléré = extraction doublée pour les mineurs.',
        cost: 1000,
        costResource: 'stone',
        type: 'auto',
        target: 'miner',
        multiplier: 3,
        unlockBuilding: 'miner',
        unlockCount: 25,
    },

    // Foreuse ×2
    {
        id: 'drill_upgrade',
        name: 'Foreuse Supersonique',
        emoji: '🌀',
        desc: 'Vitesse de rotation doublée, extraction doublée.',
        cost: 500,
        costResource: 'stone',
        type: 'auto',
        target: 'drill',
        multiplier: 2,
        unlockBuilding: 'drill',
        unlockCount: 5,
    },

    // Foreuse ×3
    {
        id: 'drill_diamond_bit',
        name: 'Fraise en Diamant',
        emoji: '🔬',
        desc: 'Embout ultra-résistant pour les profondeurs extrêmes.',
        cost: 5000,
        costResource: 'stone',
        type: 'auto',
        target: 'drill',
        multiplier: 3,
        unlockBuilding: 'drill',
        unlockCount: 25,
    },

    // Robot ×2
    {
        id: 'ai_robots',
        name: 'Robots IA Autonomes',
        emoji: '🧠',
        desc: 'L\'IA apprend et maximise l\'extraction en continu.',
        cost: 5000,
        costResource: 'stone',
        type: 'auto',
        target: 'robot',
        multiplier: 2,
        unlockBuilding: 'robot',
        unlockCount: 5,
    },

    // Robot ×3
    {
        id: 'robot_swarm',
        name: 'Essaim Nano-Robots',
        emoji: '🦾',
        desc: 'Des milliers de micro-robots infestent toutes les galeries.',
        cost: 50000,
        costResource: 'stone',
        type: 'auto',
        target: 'robot',
        multiplier: 3,
        unlockBuilding: 'robot',
        unlockCount: 25,
    },

    // Dynamite ×2
    {
        id: 'better_dynamite',
        name: 'Explosifs Améliorés',
        emoji: '💣',
        desc: 'Formule plus puissante = extraction plus massive.',
        cost: 25000,
        costResource: 'stone',
        type: 'auto',
        target: 'dynamite',
        multiplier: 2,
        unlockBuilding: 'dynamite',
        unlockCount: 5,
    },

    // Dynamite ×3
    {
        id: 'plasma_charge',
        name: 'Charge Plasma',
        emoji: '☢️',
        desc: 'Explosions plasma pour une fragmentation totale.',
        cost: 200000,
        costResource: 'stone',
        type: 'auto',
        target: 'dynamite',
        multiplier: 3,
        unlockBuilding: 'dynamite',
        unlockCount: 25,
    },

    // Scanner ×2
    {
        id: 'ore_detection',
        name: 'Détection Avancée',
        emoji: '🛰️',
        desc: 'Satellites miniers pour veines profondes inexplorées.',
        cost: 500000,
        costResource: 'stone',
        type: 'auto',
        target: 'scanner',
        multiplier: 2,
        unlockBuilding: 'scanner',
        unlockCount: 5,
    },

    // Usine ×2
    {
        id: 'refinery_nano',
        name: 'Nano-Raffinage',
        emoji: '⚗️',
        desc: 'Procédé nanométrique pour une pureté et efficacité maximales.',
        cost: 5000000,
        costResource: 'stone',
        type: 'auto',
        target: 'refinery',
        multiplier: 2,
        unlockBuilding: 'refinery',
        unlockCount: 5,
    },

    // ────────────────────────────────────────────────────────
    // AMÉLIORATIONS GLOBALES — Multiplient TOUTE la production auto
    // ────────────────────────────────────────────────────────

    // ×1.25 global (tôt)
    {
        id: 'deep_seismic',
        name: 'Sismique Profonde',
        emoji: '🌊',
        desc: 'Cartographie des failles pour optimiser chaque galerie.',
        cost: 10000,
        costResource: 'stone',
        type: 'global',
        multiplier: 1.25,
        unlockResource: 'coal',
        unlockAmount: 100,
    },

    // ×1.5 global
    {
        id: 'formation_i',
        name: 'Formation Minière I',
        emoji: '📈',
        desc: 'Programme de formation pour améliorer toute la main-d\'œuvre.',
        cost: 40000,
        costResource: 'stone',
        type: 'global',
        multiplier: 1.5,
        unlockResource: 'iron',
        unlockAmount: 50,
    },

    // ×1.5 global (énergie)
    {
        id: 'geothermal',
        name: 'Énergie Géothermique',
        emoji: '♨️',
        desc: 'Alimentation gratuite grâce à la chaleur du sous-sol.',
        cost: 300000,
        costResource: 'stone',
        type: 'global',
        multiplier: 1.5,
        unlockResource: 'iron',
        unlockAmount: 200,
    },

    // ×2 global
    {
        id: 'formation_ii',
        name: 'Formation Minière II',
        emoji: '📊',
        desc: 'Optimisation complète de toute la chaîne de production.',
        cost: 1500000,
        costResource: 'stone',
        type: 'global',
        multiplier: 2,
        unlockResource: 'gold',
        unlockAmount: 50,
    },

    // ×3 global (fin de partie)
    {
        id: 'formation_iii',
        name: 'Formation Minière III',
        emoji: '🚀',
        desc: 'L\'excellence industrielle portée à son paroxysme absolu.',
        cost: 80000000,
        costResource: 'stone',
        type: 'global',
        multiplier: 3,
        unlockResource: 'diamond',
        unlockAmount: 25,
    },
];


// ============================================================
// ZONES — Les 7 niveaux de profondeur de la mine
// ============================================================
// Chaque zone donne accès à de meilleurs multiplicateurs
// et change complètement l'atmosphère visuelle du jeu.
//
// Champs :
//   id             → identifiant unique
//   name           → nom affiché
//   depth          → profondeur en mètres (purement cosmétique)
//   colorPrimary   → couleur principale du thème
//   colorAccent    → couleur néon/accentuation
//   colorBg        → fond sombre de la zone
//   unlockCost     → coût en pierres pour débloquer (0 = gratuit)
//   unlockResource → ressource utilisée pour payer (null si gratuit)
//   ambience       → id du thème CSS (data-zone="...")
// ============================================================

const ZONES_DATA = [

    // Zone 0 — Surface (débloquée dès le départ)
    {
        id: 'surface',
        name: 'Surface',
        emoji: '🌿',
        depth: 0,
        desc: 'Le sol de la surface. Pierre et charbon en abondance.',
        colorPrimary: '#8B6F47',
        colorAccent:  '#E8A020',
        colorBg:      '#12100a',
        unlockCost: 0,
        unlockResource: null,
        ambience: 'surface',
    },

    // Zone 1 — Grotte
    {
        id: 'cave',
        name: 'Grotte',
        emoji: '🕳️',
        depth: 50,
        desc: 'Tunnels naturels humides. Le fer commence à apparaître.',
        colorPrimary: '#3a7a5a',
        colorAccent:  '#5ED890',
        colorBg:      '#080f0a',
        unlockCost: 500,
        unlockResource: 'stone',
        ambience: 'cave',
    },

    // Zone 2 — Mine abandonnée
    {
        id: 'abandoned_mine',
        name: 'Mine Abandonnée',
        emoji: '⚠️',
        depth: 200,
        desc: 'Vieille exploitation désertée. L\'or y scintille encore.',
        colorPrimary: '#A0522D',
        colorAccent:  '#FF9050',
        colorBg:      '#120800',
        unlockCost: 5000,
        unlockResource: 'stone',
        ambience: 'rusted',
    },

    // Zone 3 — Zone Magma
    {
        id: 'magma_zone',
        name: 'Zone Magma',
        emoji: '🌋',
        depth: 800,
        desc: 'Coulées de lave proche. Les diamants se forment sous pression.',
        colorPrimary: '#CC2200',
        colorAccent:  '#FF5500',
        colorBg:      '#120200',
        unlockCost: 50000,
        unlockResource: 'stone',
        ambience: 'magma',
    },

    // Zone 4 — Temple Ancien
    {
        id: 'ancient_temple',
        name: 'Temple Ancien',
        emoji: '🏛️',
        depth: 2000,
        desc: 'Structure préhistorique mystérieuse. Les cristaux y prolifèrent.',
        colorPrimary: '#8B008B',
        colorAccent:  '#CC70FF',
        colorBg:      '#0e0010',
        unlockCost: 500000,
        unlockResource: 'stone',
        ambience: 'mystic',
    },

    // Zone 5 — Laboratoire Perdu
    {
        id: 'lost_lab',
        name: 'Laboratoire Perdu',
        emoji: '🔬',
        depth: 5000,
        desc: 'Installation scientifique abandonnée. Minerais légendaires recensés.',
        colorPrimary: '#006b6b',
        colorAccent:  '#00DDDD',
        colorBg:      '#000f0f',
        unlockCost: 5000000,
        unlockResource: 'stone',
        ambience: 'cyber',
    },

    // Zone 6 — Noyau Terrestre (zone finale)
    {
        id: 'earth_core',
        name: 'Noyau Terrestre',
        emoji: '🌍',
        depth: 12742,
        desc: 'Le cœur de la planète. Minerais légendaires en abondance brûlante.',
        colorPrimary: '#CC9900',
        colorAccent:  '#FFE040',
        colorBg:      '#141000',
        unlockCost: 50000000,
        unlockResource: 'stone',
        ambience: 'core',
    },
];


// ============================================================
// SUCCÈS — Achievements débloqués automatiquement
// ============================================================
// Chaque succès a une condition : une fonction qui reçoit
// le GameState complet et retourne true/false.
// Le moteur les vérifie toutes les 3 secondes.
// ============================================================

const ACHIEVEMENTS_DATA = [
    // ── Clics ──────────────────────────────────────────────
    { id: 'first_click',   name: 'Premier Coup',       emoji: '⛏️', desc: 'Effectuer votre tout premier clic.',             condition: s => s.stats.totalClicks >= 1 },
    { id: 'clicks_100',    name: 'Poignée de Pierre',  emoji: '🪨', desc: '100 clics effectués.',                           condition: s => s.stats.totalClicks >= 100 },
    { id: 'clicks_1000',   name: 'Bras de Fer',        emoji: '💪', desc: '1 000 clics effectués.',                         condition: s => s.stats.totalClicks >= 1000 },
    { id: 'clicks_10000',  name: 'Mains Callées',      emoji: '🙌', desc: '10 000 clics effectués.',                        condition: s => s.stats.totalClicks >= 10000 },
    { id: 'clicks_100000', name: 'Légende du Clic',    emoji: '⚡', desc: '100 000 clics effectués.',                       condition: s => s.stats.totalClicks >= 100000 },

    // ── Ressources ──────────────────────────────────────────
    { id: 'stone_1k',      name: 'Bon Début',          emoji: '⛏️', desc: '1 000 pierres gagnées au total.',                condition: s => s.stats.totalStoneEarned >= 1000 },
    { id: 'stone_100k',    name: 'Mineur Sérieux',     emoji: '🏅', desc: '100 000 pierres gagnées au total.',              condition: s => s.stats.totalStoneEarned >= 100000 },
    { id: 'stone_1m',      name: 'Magnat des Mines',   emoji: '👑', desc: '1 million de pierres gagnées au total.',         condition: s => s.stats.totalStoneEarned >= 1e6 },
    { id: 'stone_1b',      name: 'Roi de l\'Industrie',emoji: '🏆', desc: '1 milliard de pierres gagnées au total.',        condition: s => s.stats.totalStoneEarned >= 1e9 },
    { id: 'coal_found',    name: 'Première Seam',      emoji: '🖤', desc: 'Trouver vos premiers morceaux de charbon.',      condition: s => (s.stats.totalCoalEarned || 0) >= 1 },
    { id: 'diamond_found', name: 'Éclat de Diamant',   emoji: '💎', desc: 'Trouver votre premier diamant.',                 condition: s => (s.stats.totalDiamondEarned || 0) >= 0.1 },
    { id: 'legendary_found',name:'Légende Vivante',    emoji: '🌟', desc: 'Trouver un premier minerai légendaire.',         condition: s => (s.stats.totalLegendaryEarned || 0) >= 0.001 },
    { id: 'rich',          name: 'Richissime',         emoji: '💰', desc: 'Posséder 1 million de pierres en même temps.',   condition: s => s.resources.stone >= 1000000 },

    // ── Bâtiments ───────────────────────────────────────────
    { id: 'first_building',name: 'Patron',             emoji: '🏗️', desc: 'Recruter votre premier ouvrier automatique.',   condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 1 },
    { id: 'buildings_10',  name: 'Petite Équipe',      emoji: '👷', desc: '10 bâtiments au total.',                         condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 10 },
    { id: 'buildings_50',  name: 'Grande Entreprise',  emoji: '🏢', desc: '50 bâtiments au total.',                         condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 50 },
    { id: 'buildings_100', name: 'Empire Industriel',  emoji: '🏭', desc: '100 bâtiments au total.',                        condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 100 },
    { id: 'buildings_500', name: 'Titan Minier',       emoji: '🌐', desc: '500 bâtiments au total.',                        condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 500 },

    // ── Upgrades ────────────────────────────────────────────
    { id: 'first_upgrade', name: 'Technicien',         emoji: '🔧', desc: 'Acheter votre première amélioration.',           condition: s => s.upgrades.filter(u=>u.bought).length >= 1 },
    { id: 'upgrades_5',    name: 'Ingénieur',          emoji: '🛠️', desc: '5 améliorations achetées.',                      condition: s => s.upgrades.filter(u=>u.bought).length >= 5 },

    // ── Zones ───────────────────────────────────────────────
    { id: 'zone_cave',     name: 'Spéléologue',        emoji: '🕳️', desc: 'Débloquer la Grotte.',                           condition: s => !!s.zones.find(z=>z.id==='cave')?.unlocked },
    { id: 'zone_magma',    name: 'Pyromane',           emoji: '🌋', desc: 'Atteindre la Zone Magma.',                       condition: s => !!s.zones.find(z=>z.id==='magma_zone')?.unlocked },
    { id: 'zone_temple',   name: 'Archéologue',        emoji: '🏛️', desc: 'Découvrir le Temple Ancien.',                    condition: s => !!s.zones.find(z=>z.id==='ancient_temple')?.unlocked },
    { id: 'zone_core',     name: 'Cœur de Planète',    emoji: '🌍', desc: 'Atteindre le Noyau Terrestre.',                  condition: s => !!s.zones.find(z=>z.id==='earth_core')?.unlocked },

    // ── Prestige ────────────────────────────────────────────
    { id: 'first_prestige',name: 'Renaissance',        emoji: '🔄', desc: 'Effectuer votre premier Prestige.',              condition: s => s.prestige.count >= 1 },
    { id: 'prestige_5',    name: 'Cycle Éternel',      emoji: '♾️', desc: '5 Prestiges effectués.',                         condition: s => s.prestige.count >= 5 },

    // ── Événements ──────────────────────────────────────────
    { id: 'first_event',   name: 'Coup de Chance',     emoji: '🎲', desc: 'Vivre votre premier événement aléatoire.',       condition: s => s.stats.eventsTriggered >= 1 },
    { id: 'events_10',     name: 'Survivant',          emoji: '🎯', desc: 'Vivre 10 événements au total.',                  condition: s => s.stats.eventsTriggered >= 10 },

    // ── Temps de jeu ────────────────────────────────────────
    { id: 'idle_1h',       name: 'Patience',           emoji: '⏳', desc: 'Jouer pendant 1 heure cumulée.',                 condition: s => s.stats.totalPlayTime >= 3600 },
];


// ============================================================
// FONCTIONS UTILITAIRES DE CALCUL (exportées globalement)
// ============================================================

/**
 * Calcule le coût pour acheter le N-ième exemplaire d'un bâtiment.
 * Formule : baseCost × costMultiplier^count
 * @param {Object} building - L'objet bâtiment (depuis BUILDINGS_DATA)
 * @param {number} count    - Nombre déjà possédé
 * @returns {number} Coût arrondi au supérieur
 */
function getBuildingCost(building, count) {
    return Math.ceil(building.baseCost * Math.pow(building.costMultiplier, count));
}

/**
 * Calcule le coût total pour acheter `amount` bâtiments d'un coup.
 * Utilise la somme géométrique : base×r^n × (r^amount - 1) / (r - 1)
 * @param {Object} building      - L'objet bâtiment
 * @param {number} currentCount  - Nombre déjà possédé
 * @param {number} amount        - Quantité à acheter en une fois
 * @returns {number} Coût total arrondi
 */
function getBuildingBulkCost(building, currentCount, amount) {
    if (amount <= 0) return 0;
    if (amount === 1) return getBuildingCost(building, currentCount);
    const r = building.costMultiplier;
    return Math.ceil(
        building.baseCost *
        Math.pow(r, currentCount) *
        (Math.pow(r, amount) - 1) / (r - 1)
    );
}

/**
 * Calcule combien de bâtiments le joueur peut acheter avec ses ressources.
 * Utilise une recherche binaire pour l'efficacité.
 * @param {Object} building      - L'objet bâtiment
 * @param {number} currentCount  - Nombre déjà possédé
 * @param {number} resources     - Ressources disponibles
 * @returns {{ count: number, cost: number }} Quantité max et coût total
 */
function getBuildingMaxAffordable(building, currentCount, resources) {
    let lo = 0, hi = 1000;
    while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        if (getBuildingBulkCost(building, currentCount, mid) <= resources) lo = mid;
        else hi = mid - 1;
    }
    return {
        count: lo,
        cost: lo > 0 ? getBuildingBulkCost(building, currentCount, lo) : 0,
    };
}

/**
 * Calcule la production totale d'un bâtiment (sans upgrades).
 * @param {Object} building - L'objet bâtiment
 * @param {number} count    - Nombre possédé
 * @returns {number} Pierres/seconde brut
 */
function getBuildingProduction(building, count) {
    return building.baseProduction * count;
}