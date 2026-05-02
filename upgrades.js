/**
 * DeepMine - Données des Upgrades & Bâtiments
 * Fichier de configuration data-driven.
 * Coût bâtiment(n) = baseCost × costMultiplier^n  (formule Cookie Clicker)
 */

// ─────────────────────────────────────────────────────────────
// BÂTIMENTS
// ─────────────────────────────────────────────────────────────
const BUILDINGS_DATA = [
    {
        id: 'miner',
        name: 'Mineur Manuel',
        emoji: '⛏️',
        desc: 'Un brave mineur qui creuse sans relâche.',
        baseCost: 15,
        baseProduction: 0.1,
        costMultiplier: 1.15,
        unlockResource: 'stone',
        unlockAmount: 8,
    },
    {
        id: 'drill',
        name: 'Foreuse',
        emoji: '🔩',
        desc: 'Une foreuse mécanique perforant la roche dure.',
        baseCost: 100,
        baseProduction: 0.5,
        costMultiplier: 1.15,
        unlockResource: 'stone',
        unlockAmount: 60,
    },
    {
        id: 'robot',
        name: 'Robot Mineur',
        emoji: '🤖',
        desc: 'Automate infatigable, mine 24h/24.',
        baseCost: 1100,
        baseProduction: 4,
        costMultiplier: 1.15,
        unlockResource: 'coal',
        unlockAmount: 30,
    },
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
    {
        id: 'refinery',
        name: 'Usine de Raffinage',
        emoji: '🏭',
        desc: 'Raffine les minerais bruts en ressources pures.',
        baseCost: 1400000,
        baseProduction: 500,
        costMultiplier: 1.15,
        unlockResource: 'diamond',
        unlockAmount: 5,
    },
    {
        id: 'antimatter_drill',
        name: 'Foreuse Antimatière',
        emoji: '⚡',
        desc: 'Technologie de pointe dissolvant la roche moléculairement.',
        baseCost: 20000000,
        baseProduction: 2500,
        costMultiplier: 1.15,
        unlockResource: 'crystal',
        unlockAmount: 3,
    },
    {
        id: 'core_extractor',
        name: 'Extracteur de Noyau',
        emoji: '🌋',
        desc: 'Puise directement dans l\'énergie du noyau terrestre.',
        baseCost: 500000000,
        baseProduction: 15000,
        costMultiplier: 1.15,
        unlockResource: 'legendary',
        unlockAmount: 1,
    },
];

// ─────────────────────────────────────────────────────────────
// UPGRADES
// ─────────────────────────────────────────────────────────────
const UPGRADES_DATA = [
    // Pioches
    { id: 'pickaxe_wood',      name: 'Pioche en Bois',         emoji: '🪓', desc: 'Bien mieux que les mains nues.',                     cost: 8,        costResource: 'stone', type: 'click',  multiplier: 2,  unlockResource: 'stone',    unlockAmount: 4 },
    { id: 'pickaxe_stone',     name: 'Pioche en Pierre',       emoji: '⛏️', desc: 'Plus solide, frappe plus fort.',                     cost: 75,       costResource: 'stone', type: 'click',  multiplier: 2,  unlockResource: 'stone',    unlockAmount: 40 },
    { id: 'pickaxe_iron',      name: 'Pioche en Fer',          emoji: '🔨', desc: 'Métal robuste pour une extraction efficace.',        cost: 400,      costResource: 'stone', type: 'click',  multiplier: 3,  unlockResource: 'coal',     unlockAmount: 5 },
    { id: 'pickaxe_gold',      name: 'Pioche Dorée',           emoji: '✨', desc: 'Symbole de prestige et d\'efficacité rare.',         cost: 4000,     costResource: 'stone', type: 'click',  multiplier: 4,  unlockResource: 'gold',     unlockAmount: 3 },
    { id: 'pickaxe_diamond',   name: 'Pioche en Diamant',      emoji: '💎', desc: 'Taille toute roche sans effort.',                    cost: 40000,    costResource: 'stone', type: 'click',  multiplier: 5,  unlockResource: 'diamond',  unlockAmount: 1 },
    { id: 'pickaxe_crystal',   name: 'Pioche Cristalline',     emoji: '🔮', desc: 'Amplifiée par l\'énergie des cristaux rares.',       cost: 400000,   costResource: 'stone', type: 'click',  multiplier: 8,  unlockResource: 'crystal',  unlockAmount: 1 },
    { id: 'pickaxe_legendary', name: 'Pioche Légendaire',      emoji: '🌟', desc: 'Forgée dans le noyau terrestre.',                   cost: 8000000,  costResource: 'stone', type: 'click',  multiplier: 15, unlockResource: 'legendary',unlockAmount: 0.5 },

    // Améliorations bâtiments
    { id: 'hard_hats',         name: 'Casques Renforcés',      emoji: '⛑️', desc: 'Mineurs plus en sécurité = plus productifs.',        cost: 200,      costResource: 'stone', type: 'auto',   multiplier: 2,  target: 'miner',   unlockBuilding: 'miner',   unlockCount: 5 },
    { id: 'minecart',          name: 'Wagonnets à Charbon',    emoji: '🚃', desc: 'Transport accéléré des minerais.',                   cost: 1000,     costResource: 'stone', type: 'auto',   multiplier: 3,  target: 'miner',   unlockBuilding: 'miner',   unlockCount: 25 },
    { id: 'drill_upgrade',     name: 'Foreuse Supersonique',   emoji: '🌀', desc: 'Vitesse de rotation doublée.',                       cost: 500,      costResource: 'stone', type: 'auto',   multiplier: 2,  target: 'drill',   unlockBuilding: 'drill',   unlockCount: 5 },
    { id: 'drill_diamond_bit', name: 'Fraise en Diamant',      emoji: '🔬', desc: 'Embout ultra-résistant pour profondeurs extrêmes.',  cost: 5000,     costResource: 'stone', type: 'auto',   multiplier: 3,  target: 'drill',   unlockBuilding: 'drill',   unlockCount: 25 },
    { id: 'ai_robots',         name: 'Robots IA Autonomes',    emoji: '🧠', desc: 'IA pour maximiser l\'extraction.',                   cost: 5000,     costResource: 'stone', type: 'auto',   multiplier: 2,  target: 'robot',   unlockBuilding: 'robot',   unlockCount: 5 },
    { id: 'robot_swarm',       name: 'Essaim Nano-Robots',     emoji: '🦾', desc: 'Des milliers de micro-robots dans les galeries.',     cost: 50000,    costResource: 'stone', type: 'auto',   multiplier: 3,  target: 'robot',   unlockBuilding: 'robot',   unlockCount: 25 },
    { id: 'better_dynamite',   name: 'Explosifs Améliorés',    emoji: '💣', desc: 'Formule plus puissante et propre.',                  cost: 25000,    costResource: 'stone', type: 'auto',   multiplier: 2,  target: 'dynamite',unlockBuilding: 'dynamite',unlockCount: 5 },
    { id: 'plasma_charge',     name: 'Charge Plasma',          emoji: '☢️', desc: 'Explosions plasma pour fragmentation maximale.',     cost: 200000,   costResource: 'stone', type: 'auto',   multiplier: 3,  target: 'dynamite',unlockBuilding: 'dynamite',unlockCount: 25 },
    { id: 'ore_detection',     name: 'Détection Avancée',      emoji: '🛰️', desc: 'Satellites pour veines profondes.',                  cost: 500000,   costResource: 'stone', type: 'auto',   multiplier: 2,  target: 'scanner', unlockBuilding: 'scanner', unlockCount: 5 },
    { id: 'quantum_scanner',   name: 'Scanner Quantique',      emoji: '🌌', desc: 'Détecte à travers plusieurs couches de roche.',      cost: 5000000,  costResource: 'stone', type: 'auto',   multiplier: 3,  target: 'scanner', unlockBuilding: 'scanner', unlockCount: 25 },
    { id: 'refinery_nano',     name: 'Nano-Raffinage',         emoji: '⚗️', desc: 'Procédé nanométrique pour efficacité maximale.',     cost: 5000000,  costResource: 'stone', type: 'auto',   multiplier: 2,  target: 'refinery',unlockBuilding: 'refinery',unlockCount: 5 },

    // Globaux
    { id: 'deep_seismic',  name: 'Sismique Profonde',    emoji: '🌊', desc: 'Cartographie des failles souterraines.',          cost: 10000,    costResource: 'stone', type: 'global', multiplier: 1.25, unlockResource: 'coal',    unlockAmount: 100 },
    { id: 'formation_i',   name: 'Formation Minière I',  emoji: '📈', desc: 'Formation améliorée pour toute la main-d\'œuvre.', cost: 40000,    costResource: 'stone', type: 'global', multiplier: 1.5,  unlockResource: 'iron',    unlockAmount: 50 },
    { id: 'geothermal',    name: 'Énergie Géothermique', emoji: '♨️', desc: 'Alimentation depuis la chaleur terrestre.',        cost: 300000,   costResource: 'stone', type: 'global', multiplier: 1.5,  unlockResource: 'iron',    unlockAmount: 200 },
    { id: 'formation_ii',  name: 'Formation Minière II', emoji: '📊', desc: 'Optimisation de toute la chaîne de production.',   cost: 1500000,  costResource: 'stone', type: 'global', multiplier: 2,    unlockResource: 'gold',    unlockAmount: 50 },
    { id: 'formation_iii', name: 'Formation Minière III',emoji: '🚀', desc: 'Excellence industrielle portée au maximum.',       cost: 80000000, costResource: 'stone', type: 'global', multiplier: 3,    unlockResource: 'diamond', unlockAmount: 25 },
];

// ─────────────────────────────────────────────────────────────
// ZONES
// ─────────────────────────────────────────────────────────────
const ZONES_DATA = [
    { id: 'surface',       name: 'Surface',            emoji: '🌿', depth: 0,     desc: 'Le sol de la surface. Riche en pierre et charbon.',              colorPrimary: '#8B6F47', colorAccent: '#E8A020', colorBg: '#12100a', unlockCost: 0,        unlockResource: null,    ambience: 'surface' },
    { id: 'cave',          name: 'Grotte',              emoji: '🕳️', depth: 50,    desc: 'Tunnels naturels humides. Le fer commence à apparaître.',         colorPrimary: '#3a7a5a', colorAccent: '#5ED890', colorBg: '#080f0a', unlockCost: 500,      unlockResource: 'stone', ambience: 'cave' },
    { id: 'abandoned_mine',name: 'Mine Abandonnée',     emoji: '⚠️', depth: 200,   desc: 'Ancienne exploitation désertée. L\'or y scintille encore.',       colorPrimary: '#A0522D', colorAccent: '#FF9050', colorBg: '#120800', unlockCost: 5000,     unlockResource: 'stone', ambience: 'rusted' },
    { id: 'magma_zone',    name: 'Zone Magma',          emoji: '🌋', depth: 800,   desc: 'Proximité des coulées de lave. Les diamants se forment ici.',     colorPrimary: '#CC2200', colorAccent: '#FF5500', colorBg: '#120200', unlockCost: 50000,    unlockResource: 'stone', ambience: 'magma' },
    { id: 'ancient_temple',name: 'Temple Ancien',       emoji: '🏛️', depth: 2000,  desc: 'Structure mystérieuse préhistorique. Les cristaux y prolifèrent.',colorPrimary: '#8B008B', colorAccent: '#CC70FF', colorBg: '#0e0010', unlockCost: 500000,   unlockResource: 'stone', ambience: 'mystic' },
    { id: 'lost_lab',      name: 'Laboratoire Perdu',   emoji: '🔬', depth: 5000,  desc: 'Installation abandonnée. Minerais légendaires répertoriés.',      colorPrimary: '#006b6b', colorAccent: '#00DDDD', colorBg: '#000f0f', unlockCost: 5000000,  unlockResource: 'stone', ambience: 'cyber' },
    { id: 'earth_core',    name: 'Noyau Terrestre',     emoji: '🌍', depth: 12742, desc: 'Le cœur de la planète. Minerais légendaires en abondance.',       colorPrimary: '#CC9900', colorAccent: '#FFE040', colorBg: '#141000', unlockCost: 50000000, unlockResource: 'stone', ambience: 'core' },
];

// ─────────────────────────────────────────────────────────────
// ACHIEVEMENTS
// ─────────────────────────────────────────────────────────────
const ACHIEVEMENTS_DATA = [
    { id: 'first_click',    name: 'Premier Coup',        emoji: '⛏️', desc: 'Effectuer votre premier clic.',                condition: s => s.stats.totalClicks >= 1 },
    { id: 'clicks_100',     name: 'Poignée de Pierre',   emoji: '🪨', desc: '100 clics effectués.',                         condition: s => s.stats.totalClicks >= 100 },
    { id: 'clicks_1000',    name: 'Bras de Fer',         emoji: '💪', desc: '1 000 clics effectués.',                       condition: s => s.stats.totalClicks >= 1000 },
    { id: 'clicks_10000',   name: 'Mains Callées',       emoji: '🙌', desc: '10 000 clics effectués.',                      condition: s => s.stats.totalClicks >= 10000 },
    { id: 'clicks_100000',  name: 'Légende du Clic',     emoji: '⚡', desc: '100 000 clics effectués.',                     condition: s => s.stats.totalClicks >= 100000 },
    { id: 'stone_1k',       name: 'Bon Début',           emoji: '⛏️', desc: '1 000 pierres au total.',                      condition: s => s.stats.totalStoneEarned >= 1000 },
    { id: 'stone_100k',     name: 'Mineur Sérieux',      emoji: '🏅', desc: '100 000 pierres au total.',                    condition: s => s.stats.totalStoneEarned >= 100000 },
    { id: 'stone_1m',       name: 'Magnat des Mines',    emoji: '👑', desc: '1 million de pierres au total.',               condition: s => s.stats.totalStoneEarned >= 1e6 },
    { id: 'stone_1b',       name: 'Roi de l\'Industrie', emoji: '🏆', desc: '1 milliard de pierres au total.',              condition: s => s.stats.totalStoneEarned >= 1e9 },
    { id: 'first_building', name: 'Patron',              emoji: '🏗️', desc: 'Recruter votre premier ouvrier.',              condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 1 },
    { id: 'buildings_10',   name: 'Petite Équipe',       emoji: '👷', desc: '10 bâtiments total.',                          condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 10 },
    { id: 'buildings_50',   name: 'Grande Entreprise',   emoji: '🏢', desc: '50 bâtiments total.',                          condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 50 },
    { id: 'buildings_100',  name: 'Empire Industriel',   emoji: '🏭', desc: '100 bâtiments total.',                         condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 100 },
    { id: 'buildings_500',  name: 'Titan Minier',        emoji: '🌐', desc: '500 bâtiments total.',                         condition: s => s.buildings.reduce((t,b)=>t+b.count,0) >= 500 },
    { id: 'first_upgrade',  name: 'Technicien',          emoji: '🔧', desc: 'Acheter votre première amélioration.',         condition: s => s.upgrades.filter(u=>u.bought).length >= 1 },
    { id: 'upgrades_5',     name: 'Ingénieur',           emoji: '🛠️', desc: '5 améliorations achetées.',                    condition: s => s.upgrades.filter(u=>u.bought).length >= 5 },
    { id: 'zone_cave',      name: 'Spéléologue',         emoji: '🕳️', desc: 'Débloquer la Grotte.',                         condition: s => !!s.zones.find(z=>z.id==='cave')?.unlocked },
    { id: 'zone_magma',     name: 'Pyromane',            emoji: '🌋', desc: 'Atteindre la Zone Magma.',                     condition: s => !!s.zones.find(z=>z.id==='magma_zone')?.unlocked },
    { id: 'zone_temple',    name: 'Archéologue',         emoji: '🏛️', desc: 'Découvrir le Temple Ancien.',                  condition: s => !!s.zones.find(z=>z.id==='ancient_temple')?.unlocked },
    { id: 'zone_core',      name: 'Cœur de Planète',     emoji: '🌍', desc: 'Atteindre le Noyau Terrestre.',                condition: s => !!s.zones.find(z=>z.id==='earth_core')?.unlocked },
    { id: 'first_prestige', name: 'Renaissance',         emoji: '🔄', desc: 'Effectuer votre premier Prestige.',            condition: s => s.prestige.count >= 1 },
    { id: 'prestige_5',     name: 'Cycle Éternel',       emoji: '♾️', desc: '5 Prestiges effectués.',                       condition: s => s.prestige.count >= 5 },
    { id: 'first_event',    name: 'Coup de Chance',      emoji: '🎲', desc: 'Vivre votre premier événement rare.',          condition: s => s.stats.eventsTriggered >= 1 },
    { id: 'events_10',      name: 'Survivant',           emoji: '🎯', desc: 'Vivre 10 événements.',                         condition: s => s.stats.eventsTriggered >= 10 },
    { id: 'coal_found',     name: 'Première Seam',       emoji: '🖤', desc: 'Trouver du charbon.',                          condition: s => (s.stats.totalCoalEarned||0) >= 1 },
    { id: 'diamond_found',  name: 'Éclat de Diamant',    emoji: '💎', desc: 'Trouver votre premier diamant.',               condition: s => (s.stats.totalDiamondEarned||0) >= 0.1 },
    { id: 'legendary_found',name: 'Légende Vivante',     emoji: '🌟', desc: 'Trouver un minerai légendaire.',               condition: s => (s.stats.totalLegendaryEarned||0) >= 0.001 },
    { id: 'boss_killed',    name: 'Chasseur de Boss',    emoji: '💀', desc: 'Vaincu un mini-boss souterrain.',              condition: s => (s.stats.bossesDefeated||0) >= 1 },
    { id: 'boss_5',         name: 'Exterminateur',       emoji: '⚔️', desc: 'Vaincu 5 mini-boss.',                          condition: s => (s.stats.bossesDefeated||0) >= 5 },
    { id: 'rich',           name: 'Richissime',          emoji: '💰', desc: 'Posséder 1 million de pierres simultanément.', condition: s => s.resources.stone >= 1000000 },
    { id: 'idle_1h',        name: 'Patience',            emoji: '⏳', desc: 'Jouer pendant 1 heure au total.',              condition: s => s.stats.totalPlayTime >= 3600 },
];

// ─────────────────────────────────────────────────────────────
// MINI-BOSS
// ─────────────────────────────────────────────────────────────
const BOSSES_DATA = [
    { id: 'mole_king',     name: 'Roi des Taupes',   emoji: '🐀', maxHp: 50,    reward: { stone: 500,     coal: 10 },              color: '#8B4513', desc: 'Le monarque des galeries souterraines. Frappe-le !',  minZone: 0 },
    { id: 'rock_golem',    name: 'Golem de Roche',   emoji: '🪨', maxHp: 200,   reward: { stone: 5000,    iron: 20 },              color: '#696969', desc: 'Une créature de pierre animée par la magie.',         minZone: 1 },
    { id: 'lava_beast',    name: 'Bête de Lave',     emoji: '🌋', maxHp: 1000,  reward: { stone: 50000,   gold: 10, diamond: 2 },  color: '#FF4400', desc: 'Surgit des profondeurs en fusion. Dangereux !',        minZone: 3 },
    { id: 'shadow_worm',   name: 'Ver des Abysses',  emoji: '🐛', maxHp: 5000,  reward: { stone: 500000,  crystal: 5 },            color: '#6600AA', desc: 'Un parasite géant dormant depuis des millénaires.',    minZone: 4 },
    { id: 'core_guardian', name: 'Gardien du Noyau', emoji: '👁️', maxHp: 25000, reward: { stone: 5000000, legendary: 3, crystal: 20 }, color: '#FFD700', desc: 'L\'entité ancienne gardant les secrets du noyau.', minZone: 6 },
];

// ─────────────────────────────────────────────────────────────
// Fonctions de calcul
// ─────────────────────────────────────────────────────────────
function getBuildingCost(building, count) {
    return Math.ceil(building.baseCost * Math.pow(building.costMultiplier, count));
}

function getBuildingBulkCost(building, currentCount, amount) {
    // Somme géométrique : base * r^n * (r^amount - 1) / (r - 1)
    const r = building.costMultiplier;
    return Math.ceil(building.baseCost * Math.pow(r, currentCount) * (Math.pow(r, amount) - 1) / (r - 1));
}

function getBuildingMaxAffordable(building, currentCount, resources) {
    // Cherche le max N tel que bulkCost(N) <= resources
    let lo = 0, hi = 1000;
    while (lo < hi) {
        const mid = Math.floor((lo + hi + 1) / 2);
        if (getBuildingBulkCost(building, currentCount, mid) <= resources) lo = mid;
        else hi = mid - 1;
    }
    return { count: lo, cost: lo > 0 ? getBuildingBulkCost(building, currentCount, lo) : 0 };
}

function getBuildingProduction(building, count) {
    return building.baseProduction * count;
}