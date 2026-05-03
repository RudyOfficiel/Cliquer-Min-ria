/**
 * ============================================================
 * MINÉRIA — upgrades.js
 * ============================================================
 * Toutes les données statiques du jeu :
 *   - BUILDINGS_DATA  : 8 bâtiments producteurs
 *   - UPGRADES_DATA   : 22 améliorations
 *   - ZONES_DATA      : 16 zones (de la surface au divin)
 *   - ACHIEVEMENTS_DATA : 34 succès
 *
 * Pour modifier l'équilibre du jeu → modifier ce fichier.
 * ============================================================
 */

// ============================================================
// BÂTIMENTS
// Formule coût : baseCost × costMultiplier^count
// ============================================================

const BUILDINGS_DATA = [
    {
        id: 'miner', name: 'Mineur Manuel', emoji: '⛏️',
        desc: 'Un brave mineur qui creuse sans relâche.',
        baseCost: 15, baseProduction: 0.1, costMultiplier: 1.15,
        unlockResource: 'stone', unlockAmount: 8,
    },
    {
        id: 'drill', name: 'Foreuse', emoji: '🔩',
        desc: 'Machine mécanique perforant la roche dure.',
        baseCost: 100, baseProduction: 0.5, costMultiplier: 1.15,
        unlockResource: 'stone', unlockAmount: 60,
    },
    {
        id: 'robot', name: 'Robot Mineur', emoji: '🤖',
        desc: 'Automate infatigable programmé pour miner 24h/24.',
        baseCost: 1100, baseProduction: 4, costMultiplier: 1.15,
        unlockResource: 'coal', unlockAmount: 30,
    },
    {
        id: 'dynamite', name: 'Dynamite Industrielle', emoji: '💥',
        desc: 'Explosions contrôlées pour extraire massivement.',
        baseCost: 12000, baseProduction: 20, costMultiplier: 1.15,
        unlockResource: 'iron', unlockAmount: 20,
    },
    {
        id: 'scanner', name: 'Scanner de Minerais', emoji: '📡',
        desc: 'Localise les veines riches avant de creuser.',
        baseCost: 130000, baseProduction: 100, costMultiplier: 1.15,
        unlockResource: 'gold', unlockAmount: 10,
    },
    {
        id: 'refinery', name: 'Usine de Raffinage', emoji: '🏭',
        desc: 'Raffine les minerais bruts en ressources concentrées.',
        baseCost: 1400000, baseProduction: 500, costMultiplier: 1.15,
        unlockResource: 'diamond', unlockAmount: 5,
    },
    {
        id: 'antimatter_drill', name: 'Foreuse Antimatière', emoji: '⚡',
        desc: 'Technologie expérimentale dissolvant la roche moléculairement.',
        baseCost: 20000000, baseProduction: 2500, costMultiplier: 1.15,
        unlockResource: 'crystal', unlockAmount: 3,
    },
    {
        id: 'core_extractor', name: 'Extracteur de Noyau', emoji: '🌋',
        desc: 'Puise directement dans l\'énergie du noyau terrestre.',
        baseCost: 500000000, baseProduction: 15000, costMultiplier: 1.15,
        unlockResource: 'legendary', unlockAmount: 1,
    },
];

// ============================================================
// UPGRADES
// types : 'click' (mult clic), 'auto' (mult bâtiment), 'global' (tout)
// ============================================================

const UPGRADES_DATA = [
    // ── Pioche de départ (OBLIGATOIRE — débloque le minage) ──
    {
        id: 'pickaxe_starter', name: 'Pioche de Base', emoji: '🪓',
        desc: 'Indispensable pour commencer à miner. Outil de base.',
        cost: 15, costResource: 'stone', type: 'click', multiplier: 1,
        isStarter: true, // Flag spécial : toujours visible, débloque le bouton Miner
    },

    // ── Pioches (multiplicateurs de clic) ────────────────────
    { id: 'pickaxe_stone',     name: 'Pioche en Pierre',   emoji: '⛏️', desc: 'Plus solide, frappe plus fort.',                    cost: 75,       costResource: 'stone', type: 'click', multiplier: 2,  unlockResource: 'stone',    unlockAmount: 40 },
    { id: 'pickaxe_iron',      name: 'Pioche en Fer',      emoji: '🔨', desc: 'Métal robuste pour extraction efficace.',           cost: 400,      costResource: 'stone', type: 'click', multiplier: 3,  unlockResource: 'coal',     unlockAmount: 5 },
    { id: 'pickaxe_gold',      name: 'Pioche Dorée',       emoji: '✨', desc: 'Symbole de prestige. Étonnamment efficace.',        cost: 4000,     costResource: 'stone', type: 'click', multiplier: 4,  unlockResource: 'gold',     unlockAmount: 3 },
    { id: 'pickaxe_diamond',   name: 'Pioche Diamant',     emoji: '💎', desc: 'Taille toute roche sans effort.',                   cost: 40000,    costResource: 'stone', type: 'click', multiplier: 5,  unlockResource: 'diamond',  unlockAmount: 1 },
    { id: 'pickaxe_crystal',   name: 'Pioche Cristalline', emoji: '🔮', desc: 'Canalisée par l\'énergie des cristaux.',            cost: 400000,   costResource: 'stone', type: 'click', multiplier: 8,  unlockResource: 'crystal',  unlockAmount: 1 },
    { id: 'pickaxe_legendary', name: 'Pioche Légendaire',  emoji: '🌟', desc: 'Forgée dans le noyau terrestre.',                   cost: 8000000,  costResource: 'stone', type: 'click', multiplier: 15, unlockResource: 'legendary',unlockAmount: 0.5 },

    // ── Améliorations bâtiments ───────────────────────────────
    { id: 'hard_hats',         name: 'Casques Renforcés',  emoji: '⛑️', desc: 'Sécurité améliorée = mineurs plus productifs.',     cost: 200,     costResource: 'stone', type: 'auto', target: 'miner',    multiplier: 2, unlockBuilding: 'miner',   unlockCount: 5 },
    { id: 'minecart',          name: 'Wagonnets Charbon',  emoji: '🚃', desc: 'Transport accéléré des minerais.',                  cost: 1000,    costResource: 'stone', type: 'auto', target: 'miner',    multiplier: 3, unlockBuilding: 'miner',   unlockCount: 25 },
    { id: 'drill_upgrade',     name: 'Foreuse Supersonique',emoji: '🌀', desc: 'Vitesse doublée = extraction doublée.',             cost: 500,     costResource: 'stone', type: 'auto', target: 'drill',    multiplier: 2, unlockBuilding: 'drill',   unlockCount: 5 },
    { id: 'drill_diamond_bit', name: 'Fraise Diamant',     emoji: '🔬', desc: 'Embout ultra-résistant pour les profondeurs.',      cost: 5000,    costResource: 'stone', type: 'auto', target: 'drill',    multiplier: 3, unlockBuilding: 'drill',   unlockCount: 25 },
    { id: 'ai_robots',         name: 'Robots IA',          emoji: '🧠', desc: 'IA pour maximiser l\'extraction.',                  cost: 5000,    costResource: 'stone', type: 'auto', target: 'robot',    multiplier: 2, unlockBuilding: 'robot',   unlockCount: 5 },
    { id: 'robot_swarm',       name: 'Essaim Nano-Robots', emoji: '🦾', desc: 'Milliers de micro-robots dans les galeries.',       cost: 50000,   costResource: 'stone', type: 'auto', target: 'robot',    multiplier: 3, unlockBuilding: 'robot',   unlockCount: 25 },
    { id: 'better_dynamite',   name: 'Explosifs Améliorés',emoji: '💣', desc: 'Formule plus puissante et propre.',                 cost: 25000,   costResource: 'stone', type: 'auto', target: 'dynamite', multiplier: 2, unlockBuilding: 'dynamite',unlockCount: 5 },
    { id: 'plasma_charge',     name: 'Charge Plasma',      emoji: '☢️', desc: 'Explosions plasma : fragmentation maximale.',      cost: 200000,  costResource: 'stone', type: 'auto', target: 'dynamite', multiplier: 3, unlockBuilding: 'dynamite',unlockCount: 25 },
    { id: 'ore_detection',     name: 'Détection Avancée',  emoji: '🛰️', desc: 'Satellites pour veines profondes.',                cost: 500000,  costResource: 'stone', type: 'auto', target: 'scanner',  multiplier: 2, unlockBuilding: 'scanner', unlockCount: 5 },
    { id: 'refinery_nano',     name: 'Nano-Raffinage',     emoji: '⚗️', desc: 'Procédé nanométrique : efficacité maximale.',      cost: 5000000, costResource: 'stone', type: 'auto', target: 'refinery', multiplier: 2, unlockBuilding: 'refinery',unlockCount: 5 },

    // ── Globaux ───────────────────────────────────────────────
    { id: 'deep_seismic', name: 'Sismique Profonde', emoji: '🌊', desc: 'Cartographie des failles souterraines.',    cost: 10000,    costResource: 'stone', type: 'global', multiplier: 1.25, unlockResource: 'coal',    unlockAmount: 100 },
    { id: 'formation_i',  name: 'Formation I',       emoji: '📈', desc: 'Formation améliorée pour tout le personnel.',cost: 40000,    costResource: 'stone', type: 'global', multiplier: 1.5,  unlockResource: 'iron',    unlockAmount: 50 },
    { id: 'geothermal',   name: 'Géothermie',        emoji: '♨️', desc: 'Énergie gratuite du sous-sol.',             cost: 300000,   costResource: 'stone', type: 'global', multiplier: 1.5,  unlockResource: 'iron',    unlockAmount: 200 },
    { id: 'formation_ii', name: 'Formation II',      emoji: '📊', desc: 'Optimisation de toute la production.',      cost: 1500000,  costResource: 'stone', type: 'global', multiplier: 2,    unlockResource: 'gold',    unlockAmount: 50 },
    { id: 'formation_iii',name: 'Formation III',     emoji: '🚀', desc: 'Excellence industrielle au maximum.',       cost: 80000000, costResource: 'stone', type: 'global', multiplier: 3,    unlockResource: 'diamond', unlockAmount: 25 },
];

// ============================================================
// ZONES — 16 niveaux de profondeur
// ============================================================
// Chaque zone a un multiplicateur de production (géré dans script.js).
// Plus la zone est profonde, plus le multiplicateur est élevé.
//
// Ordre des zones (par profondeur croissante) :
//  1. Surface          0m      ×1
//  2. Grotte           50m     ×1.5
//  3. Mine Abandonnée  200m    ×2
//  4. Mine de Charbon  400m    ×2.5
//  5. Mine d'Or        600m    ×3
//  6. Zone Magma       800m    ×4
//  7. Mine de Rubis    1 200m  ×5
//  8. Temple Ancien    2 000m  ×7
//  9. Mine Radioactive 2 800m  ×10
// 10. Mine Volcanique  4 000m  ×15
// 11. Laboratoire      5 000m  ×20
// 12. Mine du Futur    8 000m  ×30
// 13. Noyau Terrestre  12 742m ×50
// 14. Mine Galactique  30 000m ×100
// 15. Mine du Néant    100 000m ×500
// 16. Mine Divine      999 999m ×5000
// ============================================================

const ZONES_DATA = [

    // ── Zone 1 — Surface ──────────────────────────────────────
    {
        id: 'surface', name: 'Surface', emoji: '🌿', depth: 0,
        desc: 'Le sol de la surface. Pierre et charbon en abondance.',
        colorPrimary: '#8B6F47', colorAccent: '#E8A020', colorBg: '#12100a',
        unlockCost: 0, unlockResource: null, ambience: 'surface',
    },

    // ── Zone 2 — Grotte ───────────────────────────────────────
    {
        id: 'cave', name: 'Grotte', emoji: '🕳️', depth: 50,
        desc: 'Tunnels naturels humides. Le fer commence à apparaître.',
        colorPrimary: '#3a7a5a', colorAccent: '#5ED890', colorBg: '#080f0a',
        unlockCost: 500, unlockResource: 'stone', ambience: 'cave',
    },

    // ── Zone 3 — Mine Abandonnée ──────────────────────────────
    {
        id: 'abandoned_mine', name: 'Mine Abandonnée', emoji: '⚠️', depth: 200,
        desc: 'Vieille exploitation désertée. L\'or y scintille encore.',
        colorPrimary: '#A0522D', colorAccent: '#FF9050', colorBg: '#120800',
        unlockCost: 5000, unlockResource: 'stone', ambience: 'rusted',
    },

    // ── Zone 4 — Mine de Charbon ──────────────────────────────
    {
        id: 'coal_mine', name: 'Mine de Charbon', emoji: '🖤', depth: 400,
        desc: 'Galeries noires de suie. Le charbon coule à flots.',
        colorPrimary: '#2a2a2a', colorAccent: '#888888', colorBg: '#0a0a0a',
        unlockCost: 15000, unlockResource: 'stone', ambience: 'coal',
    },

    // ── Zone 5 — Mine d'Or ────────────────────────────────────
    {
        id: 'gold_mine', name: 'Mine d\'Or', emoji: '🥇', depth: 600,
        desc: 'Veines dorées dans la roche. La richesse vous appelle.',
        colorPrimary: '#B8860B', colorAccent: '#FFD700', colorBg: '#110e00',
        unlockCost: 50000, unlockResource: 'stone', ambience: 'gold',
    },

    // ── Zone 6 — Zone Magma ───────────────────────────────────
    {
        id: 'magma_zone', name: 'Zone Magma', emoji: '🌋', depth: 800,
        desc: 'Coulées de lave proche. Les diamants se forment ici.',
        colorPrimary: '#CC2200', colorAccent: '#FF5500', colorBg: '#120200',
        unlockCost: 100000, unlockResource: 'stone', ambience: 'magma',
    },

    // ── Zone 7 — Mine de Rubis ────────────────────────────────
    {
        id: 'ruby_mine', name: 'Mine de Rubis', emoji: '♦️', depth: 1200,
        desc: 'Cristaux rouges sang parsèment les parois. Éclatant.',
        colorPrimary: '#990000', colorAccent: '#FF2244', colorBg: '#0f0000',
        unlockCost: 250000, unlockResource: 'stone', ambience: 'ruby',
    },

    // ── Zone 8 — Temple Ancien ────────────────────────────────
    {
        id: 'ancient_temple', name: 'Temple Ancien', emoji: '🏛️', depth: 2000,
        desc: 'Structure préhistorique mystérieuse. Les cristaux y prolifèrent.',
        colorPrimary: '#8B008B', colorAccent: '#CC70FF', colorBg: '#0e0010',
        unlockCost: 750000, unlockResource: 'stone', ambience: 'mystic',
    },

    // ── Zone 9 — Mine Radioactive ─────────────────────────────
    {
        id: 'radioactive_mine', name: 'Mine Radioactive', emoji: '☢️', depth: 2800,
        desc: 'Rayonnements détectés. Les minerais brillent dans le noir.',
        colorPrimary: '#336600', colorAccent: '#88FF00', colorBg: '#061000',
        unlockCost: 2000000, unlockResource: 'stone', ambience: 'radioactive',
    },

    // ── Zone 10 — Mine Volcanique ─────────────────────────────
    {
        id: 'volcanic_mine', name: 'Mine Volcanique', emoji: '🔥', depth: 4000,
        desc: 'Geysers de magma et roches en fusion. Chaleur intense.',
        colorPrimary: '#FF6600', colorAccent: '#FFAA00', colorBg: '#150400',
        unlockCost: 8000000, unlockResource: 'stone', ambience: 'volcanic',
    },

    // ── Zone 11 — Laboratoire Perdu ───────────────────────────
    {
        id: 'lost_lab', name: 'Laboratoire Perdu', emoji: '🔬', depth: 5000,
        desc: 'Installation abandonnée. Minerais légendaires recensés.',
        colorPrimary: '#006b6b', colorAccent: '#00DDDD', colorBg: '#000f0f',
        unlockCost: 15000000, unlockResource: 'stone', ambience: 'cyber',
    },

    // ── Zone 12 — Mine du Futur ───────────────────────────────
    {
        id: 'future_mine', name: 'Mine du Futur', emoji: '🚀', depth: 8000,
        desc: 'Technologie ultra-avancée. Les robots dominent.',
        colorPrimary: '#003399', colorAccent: '#4488FF', colorBg: '#000510',
        unlockCost: 50000000, unlockResource: 'stone', ambience: 'future',
    },

    // ── Zone 13 — Noyau Terrestre ─────────────────────────────
    {
        id: 'earth_core', name: 'Noyau Terrestre', emoji: '🌍', depth: 12742,
        desc: 'Le cœur de la planète. Minerais légendaires en abondance.',
        colorPrimary: '#CC9900', colorAccent: '#FFE040', colorBg: '#141000',
        unlockCost: 150000000, unlockResource: 'stone', ambience: 'core',
    },

    // ── Zone 14 — Mine Galactique ─────────────────────────────
    {
        id: 'galactic_mine', name: 'Mine Galactique', emoji: '🌌', depth: 30000,
        desc: 'Au-delà de la Terre. Minerais extraterrestres inédits.',
        colorPrimary: '#220044', colorAccent: '#AA44FF', colorBg: '#050010',
        unlockCost: 1000000000, unlockResource: 'stone', ambience: 'galactic',
    },

    // ── Zone 15 — Mine du Néant ───────────────────────────────
    {
        id: 'void_mine', name: 'Mine du Néant', emoji: '🕳️', depth: 100000,
        desc: 'Le vide absolu. La matière elle-même se désintègre.',
        colorPrimary: '#000033', colorAccent: '#3300FF', colorBg: '#000005',
        unlockCost: 50000000000, unlockResource: 'stone', ambience: 'void',
    },

    // ── Zone 16 — Mine Divine (ZONE FINALE) ───────────────────
    {
        id: 'divine_mine', name: 'Mine Divine', emoji: '✨', depth: 999999,
        desc: '⚡ ZONE FINALE. Là où commencent les légendes.',
        colorPrimary: '#FFFFFF', colorAccent: '#FFFFFF', colorBg: '#0a0a0a',
        unlockCost: 1000000000000, unlockResource: 'stone', ambience: 'divine',
    },
];

// ============================================================
// ACHIEVEMENTS — 34 succès à débloquer
// ============================================================

const ACHIEVEMENTS_DATA = [
    // Clics
    { id: 'first_click',   name: 'Premier Coup',        emoji: '⛏️', desc: 'Premier clic.',                                   condition: s => s.stats.totalClicks >= 1 },
    { id: 'clicks_100',    name: 'Poignée de Pierre',   emoji: '🪨', desc: '100 clics.',                                       condition: s => s.stats.totalClicks >= 100 },
    { id: 'clicks_1000',   name: 'Bras de Fer',         emoji: '💪', desc: '1 000 clics.',                                     condition: s => s.stats.totalClicks >= 1000 },
    { id: 'clicks_10000',  name: 'Mains Callées',       emoji: '🙌', desc: '10 000 clics.',                                    condition: s => s.stats.totalClicks >= 10000 },
    { id: 'clicks_100000', name: 'Légende du Clic',     emoji: '⚡', desc: '100 000 clics.',                                   condition: s => s.stats.totalClicks >= 100000 },
    // Pierres
    { id: 'stone_1k',      name: 'Bon Début',           emoji: '⛏️', desc: '1 000 pierres gagnées.',                           condition: s => s.stats.totalStoneEarned >= 1000 },
    { id: 'stone_100k',    name: 'Mineur Sérieux',      emoji: '🏅', desc: '100 000 pierres gagnées.',                         condition: s => s.stats.totalStoneEarned >= 100000 },
    { id: 'stone_1m',      name: 'Magnat des Mines',    emoji: '👑', desc: '1 million de pierres.',                            condition: s => s.stats.totalStoneEarned >= 1e6 },
    { id: 'stone_1b',      name: 'Roi de l\'Industrie', emoji: '🏆', desc: '1 milliard de pierres.',                           condition: s => s.stats.totalStoneEarned >= 1e9 },
    { id: 'stone_1t',      name: 'Titan de la Roche',   emoji: '💠', desc: '1 trillion de pierres.',                           condition: s => s.stats.totalStoneEarned >= 1e12 },
    // Ressources rares
    { id: 'coal_found',    name: 'Première Seam',       emoji: '🖤', desc: 'Trouver du charbon.',                              condition: s => (s.stats.totalCoalEarned    || 0) >= 1 },
    { id: 'diamond_found', name: 'Éclat de Diamant',    emoji: '💎', desc: 'Trouver un diamant.',                              condition: s => (s.stats.totalDiamondEarned || 0) >= 0.1 },
    { id: 'legendary_found',name:'Légende Vivante',     emoji: '🌟', desc: 'Trouver un minerai légendaire.',                   condition: s => (s.stats.totalLegendaryEarned || 0) >= 0.001 },
    // Bâtiments
    { id: 'first_building',name: 'Patron',              emoji: '🏗️', desc: 'Premier ouvrier recruté.',                         condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 1 },
    { id: 'buildings_10',  name: 'Petite Équipe',       emoji: '👷', desc: '10 bâtiments.',                                    condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 10 },
    { id: 'buildings_50',  name: 'Grande Entreprise',   emoji: '🏢', desc: '50 bâtiments.',                                    condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 50 },
    { id: 'buildings_100', name: 'Empire Industriel',   emoji: '🏭', desc: '100 bâtiments.',                                   condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 100 },
    { id: 'buildings_500', name: 'Titan Minier',        emoji: '🌐', desc: '500 bâtiments.',                                   condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 500 },
    // Upgrades
    { id: 'first_upgrade', name: 'Technicien',          emoji: '🔧', desc: 'Première amélioration achetée.',                   condition: s => s.upgrades.filter(u=>u.bought).length >= 1 },
    { id: 'upgrades_5',    name: 'Ingénieur',           emoji: '🛠️', desc: '5 améliorations achetées.',                        condition: s => s.upgrades.filter(u=>u.bought).length >= 5 },
    // Zones
    { id: 'zone_cave',     name: 'Spéléologue',         emoji: '🕳️', desc: 'Débloquer la Grotte.',                             condition: s => !!s.zones.find(z=>z.id==='cave')?.unlocked },
    { id: 'zone_magma',    name: 'Pyromane',            emoji: '🌋', desc: 'Atteindre la Zone Magma.',                         condition: s => !!s.zones.find(z=>z.id==='magma_zone')?.unlocked },
    { id: 'zone_temple',   name: 'Archéologue',         emoji: '🏛️', desc: 'Découvrir le Temple Ancien.',                      condition: s => !!s.zones.find(z=>z.id==='ancient_temple')?.unlocked },
    { id: 'zone_lab',      name: 'Scientifique Fou',    emoji: '🔬', desc: 'Laboratoire Perdu atteint.',                       condition: s => !!s.zones.find(z=>z.id==='lost_lab')?.unlocked },
    { id: 'zone_core',     name: 'Cœur de Planète',     emoji: '🌍', desc: 'Noyau Terrestre atteint.',                         condition: s => !!s.zones.find(z=>z.id==='earth_core')?.unlocked },
    { id: 'zone_galactic', name: 'Explorateur Stellaire',emoji: '🌌', desc: 'Mine Galactique atteinte.',                       condition: s => !!s.zones.find(z=>z.id==='galactic_mine')?.unlocked },
    { id: 'zone_divine',   name: 'Dieu Minier',         emoji: '✨', desc: 'Mine Divine atteinte. Fin du jeu !',               condition: s => !!s.zones.find(z=>z.id==='divine_mine')?.unlocked },
    // Prestige
    { id: 'first_prestige',name: 'Renaissance',         emoji: '🔄', desc: 'Premier Prestige.',                                condition: s => s.prestige.count >= 1 },
    { id: 'prestige_5',    name: 'Cycle Éternel',       emoji: '♾️', desc: '5 Prestiges.',                                     condition: s => s.prestige.count >= 5 },
    // Événements
    { id: 'first_event',   name: 'Coup de Chance',      emoji: '🎲', desc: 'Premier événement vécu.',                          condition: s => s.stats.eventsTriggered >= 1 },
    { id: 'events_10',     name: 'Survivant',           emoji: '🎯', desc: '10 événements vécus.',                             condition: s => s.stats.eventsTriggered >= 10 },
    // Temps
    { id: 'idle_1h',       name: 'Patience',            emoji: '⏳', desc: '1 heure de jeu.',                                  condition: s => s.stats.totalPlayTime >= 3600 },
    // Richesse
    { id: 'rich',          name: 'Richissime',          emoji: '💰', desc: 'Posséder 1 million de pierres.',                   condition: s => s.resources.stone >= 1000000 },
];

// ============================================================
// FONCTIONS DE CALCUL (exportées globalement)
// ============================================================

/** Coût du N-ième bâtiment : baseCost × r^count */
function getBuildingCost(building, count) {
    return Math.ceil(building.baseCost * Math.pow(building.costMultiplier, count));
}

/** Coût total pour acheter `amount` bâtiments d'un coup (somme géométrique) */
function getBuildingBulkCost(building, currentCount, amount) {
    if (amount <= 0) return 0;
    if (amount === 1) return getBuildingCost(building, currentCount);
    const r = building.costMultiplier;
    return Math.ceil(building.baseCost * Math.pow(r, currentCount) * (Math.pow(r, amount) - 1) / (r - 1));
}

/** Nombre max de bâtiments achetables avec `resources` pierres (recherche binaire) */
function getBuildingMaxAffordable(building, currentCount, resources) {
    let lo = 0, hi = 1000;
    while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        if (getBuildingBulkCost(building, currentCount, mid) <= resources) lo = mid;
        else hi = mid - 1;
    }
    return { count: lo, cost: lo > 0 ? getBuildingBulkCost(building, currentCount, lo) : 0 };
}

/** Production totale d'un bâtiment (sans upgrades) */
function getBuildingProduction(building, count) {
    return building.baseProduction * count;
}