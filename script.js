/**
 * DeepMine — Script Principal v1.1
 * Bug fixes + nouvelles fonctionnalités :
 *  - Correction rates distribution secondaire (charbon toujours 0 → fixé)
 *  - Correction zone unlock (comparaison ressources courantes, pas totalEarned)
 *  - Achat ×10 / Max pour bâtiments
 *  - Touche Espace pour miner
 *  - Temps avant affordabilité dans boutique
 *  - Atmosphère animée dans la mine
 *  - Mini-boss intégré via events.js
 *  - Meilleur prestige avec calcul live
 *  - Ticker de log en bas de page
 *  - Tooltips de production par bâtiment
 */

'use strict';

// ═══════════════════════════════════════════════════════════
// UTILITAIRES GLOBAUX
// ═══════════════════════════════════════════════════════════

function formatNumber(n) {
    if (n === undefined || n === null || isNaN(n) || n < 0) return '0';
    const abs = Math.abs(n);
    if (abs < 1000) return (n < 1 && n > 0) ? n.toFixed(3) : Math.floor(n).toString();
    const tiers = [
        [1e18, 'Qi'], [1e15, 'Qd'], [1e12, 'T'],
        [1e9, 'Md'],  [1e6, 'M'],   [1e3, 'K'],
    ];
    for (const [val, sfx] of tiers) {
        if (abs >= val) return (n / val).toFixed(2).replace(/\.?0+$/, '') + sfx;
    }
    return Math.floor(n).toString();
}

function formatTime(s) {
    s = Math.floor(s);
    if (s < 60)   return `${s}s`;
    if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

// ═══════════════════════════════════════════════════════════
// ÉTAT DU JEU (Source unique de vérité)
// ═══════════════════════════════════════════════════════════

const GameState = {
    resources: { stone: 0, coal: 0, iron: 0, gold: 0, diamond: 0, crystal: 0, legendary: 0 },
    buildings: [],
    upgrades: [],
    zones: [],
    prestige: {
        count: 0,
        fragments: 0,
        totalFragments: 0,
        clickBonus: 0,
        autoBonus: 0,
        luckBonus: 0,
    },
    stats: {
        totalClicks: 0,
        totalStoneEarned: 0,
        totalCoalEarned: 0,
        totalIronEarned: 0,
        totalGoldEarned: 0,
        totalDiamondEarned: 0,
        totalCrystalEarned: 0,
        totalLegendaryEarned: 0,
        totalPlayTime: 0,
        eventsTriggered: 0,
        bossesDefeated: 0,
        sessionStart: Date.now(),
    },
    settings: { soundEnabled: false, particlesEnabled: true, notificationsEnabled: true },
    achievements: [],
    // Multiplicateurs événements (resets à 1 par défaut)
    activeMultiplier: 1,
    clickMultiplierBonus: 1,
    earthquakeActive: false,
    moleActive: false,
    // Dérivés (recalculés chaque frame)
    clickPower: 1,
    productionPerSec: 0,
    currentZone: null,
    // Achat en quantité
    buyMode: 1,  // 1, 10, 100, 'max'
};

function initGameState() {
    GameState.buildings = BUILDINGS_DATA.map(b => ({ ...b, count: 0 }));
    GameState.upgrades  = UPGRADES_DATA.map(u  => ({ ...u, bought: false }));
    GameState.zones     = ZONES_DATA.map((z, i) => ({ ...z, unlocked: i === 0, active: i === 0 }));
    GameState.currentZone = GameState.zones[0];
}

// ═══════════════════════════════════════════════════════════
// CALCULS DÉRIVÉS
// ═══════════════════════════════════════════════════════════

function getClickPower() {
    let power = 1;
    // Pioches
    GameState.upgrades.filter(u => u.type === 'click' && u.bought)
        .forEach(u => power *= u.multiplier);
    // Bonus prestige
    power *= 1 + GameState.prestige.clickBonus / 100;
    // Bonus événement
    power *= (GameState.clickMultiplierBonus || 1);
    // 1% de la prod auto s'ajoute au clic
    power += getProductionPerSec() * 0.01;
    return Math.max(1, power);
}

function getProductionPerSec() {
    if (GameState.moleActive) return 0;
    let total = 0;
    const zone = GameState.currentZone;

    GameState.buildings.forEach(b => {
        if (b.count === 0) return;
        let prod = b.baseProduction * b.count;
        // Upgrades spécifiques à ce bâtiment
        GameState.upgrades.filter(u => u.type === 'auto' && u.target === b.id && u.bought)
            .forEach(u => prod *= u.multiplier);
        total += prod;
    });

    // Upgrades globaux
    GameState.upgrades.filter(u => u.type === 'global' && u.bought)
        .forEach(u => total *= u.multiplier);

    // Multiplicateurs prestige + zone + événement
    total *= 1 + GameState.prestige.autoBonus / 100;
    total *= zone?.resourceMultipliers?.stone || 1;
    total *= GameState.activeMultiplier || 1;

    if (GameState.earthquakeActive) total *= 0.5;
    return total;
}

function getClickGain() {
    const zoneMult = GameState.currentZone?.resourceMultipliers?.stone || 1;
    return GameState.clickPower * zoneMult;
}

// Calcule le temps en secondes pour avoir assez de ressources pour un coût donné
function timeToAfford(cost, currentAmount) {
    const pps = GameState.productionPerSec;
    if (currentAmount >= cost) return 0;
    if (pps <= 0) return Infinity;
    return (cost - currentAmount) / pps;
}

function getPrestigeFragments() {
    const totalEarned = GameState.stats.totalStoneEarned;
    const threshold = 1000000; // 1M pierres minimum
    if (totalEarned < threshold) return 0;
    return Math.floor(Math.sqrt(totalEarned / threshold));
}

// ─── Visibilité upgrades & bâtiments ─────────────────────

function isUpgradeVisible(upgrade) {
    if (upgrade.bought) return false;
    if (upgrade.unlockResource) {
        const key = `total${capitalize(upgrade.unlockResource)}Earned`;
        return (GameState.stats[key] || 0) >= upgrade.unlockAmount;
    }
    if (upgrade.unlockBuilding) {
        const b = GameState.buildings.find(b => b.id === upgrade.unlockBuilding);
        return b && b.count >= upgrade.unlockCount;
    }
    return true;
}

function isBuildingVisible(building) {
    if (!building.unlockResource) return true;
    const key = `total${capitalize(building.unlockResource)}Earned`;
    return (GameState.stats[key] || 0) >= building.unlockAmount * 0.5;
}

function canAffordUpgrade(upgrade) {
    return (GameState.resources[upgrade.costResource] || 0) >= upgrade.cost;
}

// ═══════════════════════════════════════════════════════════
// ACTIONS DU JEU
// ═══════════════════════════════════════════════════════════

function performClick(event) {
    const gain = getClickGain();
    GameState.resources.stone += gain;
    GameState.stats.totalClicks++;
    GameState.stats.totalStoneEarned += gain;

    rollSpecialResource();

    if (GameState.settings.particlesEnabled) {
        spawnParticles(event);
        spawnFloatingNumber(`+${formatNumber(gain)}`, event);
    }
    if (GameState.settings.soundEnabled) playClickSound();

    const btn = document.getElementById('mine-btn');
    if (btn) {
        btn.classList.remove('clicking');
        void btn.offsetWidth;
        btn.classList.add('clicking');
    }

    checkAchievements();
}

// Chance de ressources spéciales au clic selon la zone
function rollSpecialResource() {
    const luckMult = 1 + GameState.prestige.luckBonus / 100;
    const zoneIdx  = GameState.zones.findIndex(z => z.active);
    const rng = Math.random();

    // Table de chances par ressource [chance_base, zone_min]
    const table = [
        ['coal',      0.06,   0, 2.0],
        ['iron',      0.025,  1, 1.0],
        ['gold',      0.012,  2, 0.3],
        ['diamond',   0.005,  3, 0.05],
        ['crystal',   0.002,  4, 0.01],
        ['legendary', 0.0005, 5, 0.001],
    ];

    table.forEach(([res, chance, minZone, amount]) => {
        if (zoneIdx >= minZone && rng < chance * luckMult) {
            const earned = amount * (0.5 + Math.random());
            GameState.resources[res] = (GameState.resources[res] || 0) + earned;
            const key = `total${capitalize(res)}Earned`;
            GameState.stats[key] = (GameState.stats[key] || 0) + earned;
        }
    });
}

// Achète N bâtiments (respecte le buyMode actuel)
function buyBuilding(buildingId) {
    const building = GameState.buildings.find(b => b.id === buildingId);
    if (!building) return;

    let amount = GameState.buyMode;
    let cost;

    if (amount === 'max') {
        const result = getBuildingMaxAffordable(building, building.count, GameState.resources.stone);
        if (result.count === 0) return;
        amount = result.count;
        cost   = result.cost;
    } else {
        cost = getBuildingBulkCost(building, building.count, amount);
        if (GameState.resources.stone < cost) {
            // Essaie d'acheter 1 si le mode bulk n'est pas abordable
            if (amount > 1) {
                cost = getBuildingCost(building, building.count);
                if (GameState.resources.stone < cost) return;
                amount = 1;
            } else {
                return;
            }
        }
    }

    GameState.resources.stone -= cost;
    building.count += amount;

    addLog(`⛏️ ×${amount} ${building.name} acheté(s)`);
    UI.updateShop();
    checkAchievements();
    if (GameState.settings.soundEnabled) playBuySound();
}

function buyUpgrade(upgradeId) {
    const upgrade = GameState.upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.bought || !canAffordUpgrade(upgrade)) return;

    GameState.resources[upgrade.costResource] -= upgrade.cost;
    upgrade.bought = true;

    addLog(`✅ ${upgrade.name} acheté !`);
    UI.showNotification(`✅ ${upgrade.name} acheté !`, 'success');
    UI.updateShop();
    checkAchievements();
    if (GameState.settings.soundEnabled) playBuySound();
}

function unlockZone(zoneId) {
    const zone = GameState.zones.find(z => z.id === zoneId);
    if (!zone || zone.unlocked) return;
    // Comparaison sur les ressources COURANTES (bug fix)
    if (zone.unlockCost > 0 && (GameState.resources[zone.unlockResource] || 0) < zone.unlockCost) return;
    if (zone.unlockCost > 0) GameState.resources[zone.unlockResource] -= zone.unlockCost;
    zone.unlocked = true;
    addLog(`🎉 Zone débloquée : ${zone.name} !`);
    UI.showNotification(`🎉 Nouvelle zone : ${zone.emoji} ${zone.name} !`, 'success', 4000);
    checkAchievements();
}

function activateZone(zoneId) {
    const zone = GameState.zones.find(z => z.id === zoneId);
    if (!zone || !zone.unlocked) return;
    GameState.zones.forEach(z => z.active = false);
    zone.active = true;
    GameState.currentZone = zone;
    UI.applyZoneTheme(zone);
    UI.updateZonePanel();
}

function performPrestige() {
    const fragments = getPrestigeFragments();
    if (fragments <= 0) return;

    GameState.prestige.fragments    += fragments;
    GameState.prestige.totalFragments += fragments;
    GameState.prestige.count++;

    // Bonus permanents plafonnés à 500%
    GameState.prestige.clickBonus = clamp(GameState.prestige.totalFragments * 5,  0, 500);
    GameState.prestige.autoBonus  = clamp(GameState.prestige.totalFragments * 5,  0, 500);
    GameState.prestige.luckBonus  = clamp(GameState.prestige.totalFragments * 2,  0, 200);

    // Reset partiel (zones et achievements conservés)
    Object.keys(GameState.resources).forEach(k => GameState.resources[k] = 0);
    GameState.buildings.forEach(b => b.count = 0);
    GameState.upgrades.forEach(u => u.bought = false);
    GameState.zones.forEach((z, i) => { z.unlocked = i === 0; z.active = i === 0; });
    GameState.currentZone      = GameState.zones[0];
    GameState.activeMultiplier = 1;
    GameState.clickMultiplierBonus = 1;
    GameState.earthquakeActive = false;
    GameState.moleActive       = false;

    UI.applyZoneTheme(GameState.currentZone);
    UI.updateAll();
    UI.showNotification(`🔄 Reconstruction #${GameState.prestige.count} ! +${fragments} Fragments`, 'prestige', 5000);
    addLog(`🔄 Prestige #${GameState.prestige.count} effectué. +${fragments} Fragments de Sagesse.`);
    SaveSystem.save(GameState);
}

// ═══════════════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════════════

let lastTick = null;
let uiThrottle = 0;

function gameLoop(timestamp) {
    if (!lastTick) lastTick = timestamp;
    const rawDelta = (timestamp - lastTick) / 1000;
    lastTick = timestamp;
    // Cap à 0.5s pour éviter les explosions après onglet en arrière-plan
    const delta = Math.min(rawDelta, 0.5);

    // Production idle
    const pps  = getProductionPerSec();
    const gain = pps * delta;
    if (gain > 0) {
        GameState.resources.stone += gain;
        GameState.stats.totalStoneEarned += gain;
        distributeSecondaryResources(gain);
    }

    // Mise à jour dérivés
    GameState.clickPower       = getClickPower();
    GameState.productionPerSec = pps;
    GameState.stats.totalPlayTime += delta;

    // Vérifie zones disponibles
    checkZoneUnlocks();

    // Achievements toutes les 3s
    uiThrottle += delta;
    if (uiThrottle >= 3) {
        checkAchievements();
        uiThrottle = 0;
    }

    // UI chaque frame
    UI.updateResources();
    UI.updateMineButton();

    requestAnimationFrame(gameLoop);
}

/**
 * FIX MAJEUR : rates[0] était 0, le charbon n'était jamais produit automatiquement.
 * Nouvelle table avec taux corrigés et indexés sur les ressources secondaires.
 */
function distributeSecondaryResources(stoneProd) {
    const zoneIdx = GameState.zones.findIndex(z => z.active);
    const luckMult = 1 + GameState.prestige.luckBonus / 100;

    // [ressource, taux_relatif, zone_minimum]
    const table = [
        ['coal',      0.015, 0],
        ['iron',      0.007, 1],
        ['gold',      0.003, 2],
        ['diamond',   0.001, 3],
        ['crystal',   0.0004,4],
        ['legendary', 0.0001,5],
    ];

    table.forEach(([res, rate, minZone]) => {
        if (zoneIdx >= minZone) {
            const amount = stoneProd * rate * luckMult * (GameState.activeMultiplier || 1);
            if (amount > 0) {
                GameState.resources[res] = (GameState.resources[res] || 0) + amount;
                const key = `total${capitalize(res)}Earned`;
                GameState.stats[key] = (GameState.stats[key] || 0) + amount;
            }
        }
    });
}

/**
 * FIX MAJEUR : compare les ressources COURANTES (pas totalEarned) au coût de déverrouillage.
 */
function checkZoneUnlocks() {
    GameState.zones.forEach(zone => {
        if (!zone.unlocked && zone.unlockResource) {
            const current = GameState.resources[zone.unlockResource] || 0;
            // Met à jour l'indicateur visuel seulement
            const items = document.querySelectorAll('.zone-item.locked');
            items.forEach(item => {
                const nameEl = item.querySelector('.zone-name');
                if (nameEl && nameEl.textContent === zone.name) {
                    item.classList.toggle('available', current >= zone.unlockCost);
                }
            });
        }
    });
}

function checkAchievements() {
    ACHIEVEMENTS_DATA.forEach(ach => {
        if (!GameState.achievements.includes(ach.id)) {
            try {
                if (ach.condition(GameState)) {
                    GameState.achievements.push(ach.id);
                    UI.showAchievement(ach);
                    addLog(`🏆 Succès débloqué : ${ach.name}`);
                }
            } catch(e) { /* silencieux */ }
        }
    });
}

// ═══════════════════════════════════════════════════════════
// LOG TICKER
// ═══════════════════════════════════════════════════════════

const logEntries = [];
const LOG_MAX = 20;

function addLog(msg) {
    logEntries.unshift({ msg, time: new Date().toLocaleTimeString('fr', { hour: '2-digit', minute: '2-digit' }) });
    if (logEntries.length > LOG_MAX) logEntries.pop();
    renderLog();
}

function renderLog() {
    const container = document.getElementById('log-ticker');
    if (!container) return;
    // Affiche seulement les 5 derniers
    const visible = logEntries.slice(0, 5);
    container.innerHTML = visible.map((e, i) =>
        `<span class="log-entry${i === 0 ? ' log-new' : ''}" style="opacity:${1 - i * 0.18}">[${e.time}] ${e.msg}</span>`
    ).join('');
}

// ═══════════════════════════════════════════════════════════
// SONS (Web Audio API)
// ═══════════════════════════════════════════════════════════

let audioCtx = null;
function getAudio() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        catch(e) { return null; }
    }
    return audioCtx;
}

function playNote(freq, duration, type = 'square', vol = 0.15) {
    const ctx = getAudio(); if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.type = type;
    osc.start(); osc.stop(ctx.currentTime + duration + 0.01);
}

function playClickSound() {
    playNote(280 + Math.random() * 120, 0.08, 'square', 0.12);
}

function playBuySound() {
    [400, 600, 800].forEach((f, i) => setTimeout(() => playNote(f, 0.12, 'sine', 0.1), i * 60));
}

// ═══════════════════════════════════════════════════════════
// EFFETS VISUELS
// ═══════════════════════════════════════════════════════════

function spawnParticles(event) {
    const container = document.getElementById('particles-container');
    if (!container) return;

    const btn  = document.getElementById('mine-btn');
    if (!btn) return;
    const r    = btn.getBoundingClientRect();
    const cx   = r.left + r.width / 2;
    const cy   = r.top  + r.height / 2;
    const zone = GameState.currentZone;
    const color = zone?.colorAccent || '#E8A020';

    for (let i = 0; i < 10; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.6;
        const speed = 50 + Math.random() * 70;
        const size  = 3 + Math.random() * 7;
        p.style.cssText = `left:${cx}px;top:${cy}px;width:${size}px;height:${size}px;
            --vx:${Math.cos(angle)*speed}px;--vy:${Math.sin(angle)*speed}px;
            background:${color};box-shadow:0 0 6px ${color};`;
        container.appendChild(p);
        setTimeout(() => p.remove(), 900);
    }
}

// Appelé aussi depuis events.js (global)
function showFloatingNumber(text, event) {
    const container = document.getElementById('floating-numbers');
    if (!container) return;
    const btn = document.getElementById('mine-btn');
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    if (btn) {
        const r = btn.getBoundingClientRect();
        x = r.left + r.width / 2 + (Math.random() - 0.5) * 80;
        y = r.top  + r.height / 2 - 10;
    }
    const el = document.createElement('div');
    el.className = 'floating-number';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
}

// Alias pour rétrocompatibilité
function spawnFloatingNumber(text, event) { showFloatingNumber(text, event); }

// Crée des étincelles d'ambiance dans la mine
function spawnAmbientSpark() {
    const area = document.getElementById('mine-area');
    if (!area) return;
    const zone  = GameState.currentZone;
    const color = zone?.colorAccent || '#E8A020';
    const p     = document.createElement('div');
    p.className = 'ambient-spark';
    p.style.cssText = `
        left:${10 + Math.random() * 80}%;
        top:${10 + Math.random() * 80}%;
        background:${color};
        box-shadow:0 0 8px ${color};
        animation-duration:${1.5 + Math.random() * 2}s;
    `;
    area.appendChild(p);
    setTimeout(() => p.remove(), 3000);
}

// Lance les étincelles d'ambiance en continu
function startAmbience() {
    setInterval(spawnAmbientSpark, 800);
}

// ═══════════════════════════════════════════════════════════
// MODULE UI
// ═══════════════════════════════════════════════════════════

const UI = {
    els: {},

    init() {
        this.els = {
            stoneVal:       document.getElementById('res-stone'),
            coalVal:        document.getElementById('res-coal'),
            ironVal:        document.getElementById('res-iron'),
            goldVal:        document.getElementById('res-gold'),
            diamondVal:     document.getElementById('res-diamond'),
            crystalVal:     document.getElementById('res-crystal'),
            legendaryVal:   document.getElementById('res-legendary'),
            stonePerSec:    document.getElementById('stone-per-sec'),
            clickPowerEl:   document.getElementById('click-power'),
            shopBuildings:  document.getElementById('shop-buildings'),
            shopUpgrades:   document.getElementById('shop-upgrades'),
            zonesPanel:     document.getElementById('zones-panel'),
            depthBar:       document.getElementById('depth-bar-fill'),
            depthValue:     document.getElementById('depth-value'),
            zoneNameEl:     document.getElementById('current-zone-name'),
            zoneDescEl:     document.getElementById('current-zone-desc'),
            statsPanel:     document.getElementById('stats-content'),
            achievPanel:    document.getElementById('achievements-content'),
            prestigeBtn:    document.getElementById('prestige-btn'),
            prestigeFrags:  document.getElementById('prestige-fragments'),
            prestigePreview:document.getElementById('prestige-preview'),
            eventBanner:    document.getElementById('event-banner'),
            notifContainer: document.getElementById('notifications'),
            achievPopup:    document.getElementById('achievement-popup'),
            totalBuildings: document.getElementById('total-buildings'),
            mineBtn:        document.getElementById('mine-btn'),
            buyModeLabel:   document.getElementById('buy-mode-label'),
        };
    },

    // ── Ressources ──────────────────────────────────────────
    updateResources() {
        const r = GameState.resources;
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

    updateMineButton() {
        if (this.els.clickPowerEl) {
            this.els.clickPowerEl.textContent = `+${formatNumber(getClickGain())} / clic`;
        }
    },

    // ── Boutique ────────────────────────────────────────────
    updateShop() {
        this.renderBuildings();
        this.renderUpgrades();
        if (this.els.totalBuildings) {
            this.els.totalBuildings.textContent =
                GameState.buildings.reduce((t, b) => t + b.count, 0);
        }
    },

    renderBuildings() {
        const container = this.els.shopBuildings;
        if (!container) return;
        container.innerHTML = '';

        GameState.buildings.forEach(building => {
            if (!isBuildingVisible(building)) return;

            const mode   = GameState.buyMode;
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

            // Temps avant affordabilité
            const nextCost   = getBuildingCost(building, building.count);
            const tta        = timeToAfford(nextCost, GameState.resources.stone);
            const ttaStr     = !canAfford && tta < Infinity ? ` (${formatTime(tta)})` : '';

            const prodIfBought = building.baseProduction * (mode === 'max' ? 1 : (typeof mode === 'number' ? mode : 1));

            const item = document.createElement('div');
            item.className = `shop-item building-item${canAfford ? ' affordable' : ''}`;
            item.dataset.id = building.id;
            item.innerHTML = `
                <div class="shop-item-icon">${building.emoji}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${building.name}</div>
                    <div class="shop-item-desc">${building.desc}</div>
                    <div class="shop-item-prod">+${formatNumber(building.baseProduction * building.count)}/s</div>
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
            const tta = timeToAfford(upgrade.cost, GameState.resources[upgrade.costResource] || 0);
            const ttaStr = !canAfford && tta < Infinity ? `<span class="tta"> (${formatTime(tta)})</span>` : '';

            const item = document.createElement('div');
            item.className = `shop-item upgrade-item${canAfford ? ' affordable' : ''}`;
            item.innerHTML = `
                <div class="shop-item-icon">${upgrade.emoji}</div>
                <div class="shop-item-info">
                    <div class="shop-item-name">${upgrade.name}</div>
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

    // ── Zones ───────────────────────────────────────────────
    updateZonePanel() {
        const zone = GameState.currentZone;
        if (!zone) return;
        if (this.els.zoneNameEl)  this.els.zoneNameEl.textContent  = `${zone.emoji} ${zone.name}`;
        if (this.els.zoneDescEl)  this.els.zoneDescEl.textContent  = zone.desc;

        const maxDepth = ZONES_DATA[ZONES_DATA.length - 1].depth;
        const pct = (zone.depth / maxDepth) * 100;
        if (this.els.depthBar)   this.els.depthBar.style.width = `${pct}%`;
        if (this.els.depthValue) this.els.depthValue.textContent = `${zone.depth}m`;

        this.renderZones();

        // Mise à jour indicateur centre
        const nameEl  = document.getElementById('mine-zone-name');
        const emojiEl = document.getElementById('mine-zone-emoji');
        if (nameEl)  nameEl.textContent  = zone.name;
        if (emojiEl) emojiEl.textContent = zone.emoji;
    },

    renderZones() {
        const container = this.els.zonesPanel;
        if (!container) return;
        container.innerHTML = '';

        GameState.zones.forEach(zone => {
            const item = document.createElement('div');
            const currentStone = GameState.resources.stone || 0;
            const canUnlock = !zone.unlocked && zone.unlockResource
                && currentStone >= zone.unlockCost;

            item.className = `zone-item${zone.unlocked ? ' unlocked' : ' locked'}${zone.active ? ' active' : ''}${canUnlock ? ' available' : ''}`;

            if (zone.unlocked) {
                item.innerHTML = `
                    <span class="zone-emoji">${zone.emoji}</span>
                    <span class="zone-name">${zone.name}</span>
                    <span class="zone-depth">${zone.depth}m</span>`;
                item.addEventListener('click', () => activateZone(zone.id));
            } else {
                item.innerHTML = `
                    <span class="zone-emoji">${canUnlock ? zone.emoji : '🔒'}</span>
                    <span class="zone-name">${zone.name}</span>
                    <span class="zone-cost ${canUnlock ? 'can-afford' : ''}">
                        ${canUnlock ? '▶ ' : ''}${formatNumber(zone.unlockCost)} 🪨
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

    // ── Stats ───────────────────────────────────────────────
    updateStats() {
        const container = this.els.statsPanel;
        if (!container) return;
        const s = GameState.stats;
        const totalB = GameState.buildings.reduce((t, b) => t + b.count, 0);

        container.innerHTML = `
            <div class="stat-row"><span>🖱️ Total clics</span><span>${formatNumber(s.totalClicks)}</span></div>
            <div class="stat-row"><span>🪨 Pierre gagnée</span><span>${formatNumber(s.totalStoneEarned)}</span></div>
            <div class="stat-row"><span>🖤 Charbon total</span><span>${formatNumber(s.totalCoalEarned||0)}</span></div>
            <div class="stat-row"><span>💎 Diamants total</span><span>${formatNumber(s.totalDiamondEarned||0)}</span></div>
            <div class="stat-row"><span>🏗️ Bâtiments</span><span>${totalB}</span></div>
            <div class="stat-row"><span>🗺️ Zones débloquées</span><span>${GameState.zones.filter(z=>z.unlocked).length} / ${GameState.zones.length}</span></div>
            <div class="stat-row"><span>⚡ Production/s</span><span>${formatNumber(GameState.productionPerSec)}</span></div>
            <div class="stat-row"><span>⛏️ Puissance clic</span><span>${formatNumber(GameState.clickPower)}</span></div>
            <div class="stat-row"><span>🎲 Événements</span><span>${s.eventsTriggered}</span></div>
            <div class="stat-row"><span>💀 Boss vaincus</span><span>${s.bossesDefeated||0}</span></div>
            <div class="stat-row"><span>⏱️ Temps de jeu</span><span>${formatTime(s.totalPlayTime)}</span></div>
            <div class="stat-row"><span>🔄 Prestiges</span><span>${GameState.prestige.count}</span></div>`;
    },

    // ── Prestige ────────────────────────────────────────────
    updatePrestigePanel() {
        const frags    = getPrestigeFragments();
        const canPrest = frags > 0 && GameState.zones.filter(z => z.unlocked).length >= 5;

        if (this.els.prestigeFrags) {
            this.els.prestigeFrags.textContent = `${GameState.prestige.totalFragments} Fragments`;
        }
        if (this.els.prestigePreview) {
            if (canPrest) {
                this.els.prestigePreview.innerHTML = `<span style="color:#FFD700">+${frags} Fragments disponibles</span>`;
            } else {
                const zonesLeft = Math.max(0, 5 - GameState.zones.filter(z => z.unlocked).length);
                this.els.prestigePreview.textContent = zonesLeft > 0
                    ? `Débloquez encore ${zonesLeft} zone(s)`
                    : `Accumule plus de pierre (1M minimum)`;
            }
        }
        if (this.els.prestigeBtn) {
            this.els.prestigeBtn.disabled = !canPrest;
            this.els.prestigeBtn.classList.toggle('ready', canPrest);
        }

        // Affiche les bonus courants
        const p = GameState.prestige;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('pb-click', `+${p.clickBonus}%`);
        set('pb-auto',  `+${p.autoBonus}%`);
        set('pb-luck',  `+${p.luckBonus}%`);
        set('pb-count', p.count);
    },

    // ── Achievements ────────────────────────────────────────
    renderAchievements() {
        const container = this.els.achievPanel;
        if (!container) return;
        container.innerHTML = '';
        const unlocked = GameState.achievements.length;
        const total    = ACHIEVEMENTS_DATA.length;

        document.getElementById('ach-count').textContent = `${unlocked}/${total}`;

        ACHIEVEMENTS_DATA.forEach(ach => {
            const done = GameState.achievements.includes(ach.id);
            const item = document.createElement('div');
            item.className = `achievement-item${done ? ' unlocked' : ' locked'}`;
            item.innerHTML = `
                <span class="ach-emoji">${done ? ach.emoji : '🔒'}</span>
                <div class="ach-info">
                    <div class="ach-name">${done ? ach.name : '???'}</div>
                    <div class="ach-desc">${done ? ach.desc : 'Continuez à jouer...'}</div>
                </div>`;
            container.appendChild(item);
        });
    },

    // ── Thème de zone ────────────────────────────────────────
    applyZoneTheme(zone) {
        const root = document.documentElement;
        root.style.setProperty('--zone-primary', zone.colorPrimary);
        root.style.setProperty('--zone-accent',  zone.colorAccent);
        root.style.setProperty('--zone-bg',       zone.colorBg);
        document.getElementById('mine-area')?.setAttribute('data-zone', zone.ambience);
        document.getElementById('mine-btn')?.style.setProperty('border-color', zone.colorPrimary);
    },

    // ── Notification ─────────────────────────────────────────
    showNotification(msg, type = 'info', duration = 3000) {
        if (!GameState.settings.notificationsEnabled) return;
        const container = this.els.notifContainer;
        if (!container) return;
        const notif = document.createElement('div');
        notif.className = `notification notif-${type}`;
        notif.textContent = msg;
        container.appendChild(notif);
        requestAnimationFrame(() => notif.classList.add('visible'));
        setTimeout(() => {
            notif.classList.remove('visible');
            setTimeout(() => notif.remove(), 400);
        }, duration);
    },

    // ── Event Banner ─────────────────────────────────────────
    showEventBanner(evt) {
        const banner = this.els.eventBanner;
        if (!banner) return;
        const timerHTML = evt.duration > 0
            ? `<div class="event-timer"><div class="event-timer-fill" style="animation-duration:${evt.duration}ms"></div></div>` : '';
        banner.innerHTML = `
            <div class="event-icon">${evt.emoji}</div>
            <div class="event-info">
                <div class="event-name" style="color:${evt.color}">${evt.name}</div>
                <div class="event-desc">${evt.desc}</div>
            </div>${timerHTML}`;
        banner.className = `event-banner active event-${evt.type}`;
        banner.style.borderColor = evt.color;
        if (evt.duration === 0) setTimeout(() => this.hideEventBanner(), 4000);
        addLog(`${evt.emoji} ${evt.name}`);
    },

    hideEventBanner() {
        if (this.els.eventBanner) this.els.eventBanner.className = 'event-banner';
    },

    // ── Achievement Popup ────────────────────────────────────
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
        this.renderAchievements();
    },

    // ── Tout mettre à jour ────────────────────────────────────
    updateAll() {
        this.updateResources();
        this.updateMineButton();
        this.updateShop();
        this.updateZonePanel();
        this.updateStats();
        this.updatePrestigePanel();
        this.renderAchievements();
    },
};

// ═══════════════════════════════════════════════════════════
// HELPERS AFFICHAGE
// ═══════════════════════════════════════════════════════════

function getResEmoji(id) {
    return { stone:'🪨', coal:'🖤', iron:'⚙️', gold:'🥇', diamond:'💎', crystal:'🔮', legendary:'🌟' }[id] || '💰';
}

function getUpgradeEffectText(u) {
    if (u.type === 'click')  return `Clic ×${u.multiplier}`;
    if (u.type === 'auto')   return `${u.target} ×${u.multiplier}`;
    if (u.type === 'global') return `Production globale ×${u.multiplier}`;
    return '';
}

// ═══════════════════════════════════════════════════════════
// GESTION DES ONGLETS
// ═══════════════════════════════════════════════════════════

function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${target}`)?.classList.add('active');
        });
    });

    document.querySelectorAll('.left-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.panel;
            document.querySelectorAll('.left-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.left-panel-content').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`panel-${target}`)?.classList.add('active');
            if (target === 'achievements') UI.renderAchievements();
            if (target === 'stats')        UI.updateStats();
            if (target === 'prestige')     UI.updatePrestigePanel();
        });
    });
}

// ═══════════════════════════════════════════════════════════
// INITIALISATION
// ═══════════════════════════════════════════════════════════

function init() {
    initGameState();

    // Charge la sauvegarde
    const loadResult = SaveSystem.load(GameState);

    // Resync la zone active après chargement
    GameState.currentZone = GameState.zones.find(z => z.active) || GameState.zones[0];

    // Init UI
    UI.init();
    UI.applyZoneTheme(GameState.currentZone);
    UI.updateAll();
    initTabs();

    // ─── Bouton principal ────────────────────────────────
    document.getElementById('mine-btn')?.addEventListener('click', performClick);

    // ─── Touche Espace pour miner ────────────────────────
    document.addEventListener('keydown', e => {
        if (e.code === 'Space' && e.target === document.body) {
            e.preventDefault();
            performClick(null);
        }
    });

    // ─── Modes d'achat ×1 / ×10 / ×100 / Max ────────────
    document.querySelectorAll('.buy-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.buy-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.dataset.mode;
            GameState.buyMode = mode === 'max' ? 'max' : parseInt(mode, 10);
            UI.updateShop();
        });
    });

    // ─── Prestige ────────────────────────────────────────
    document.getElementById('prestige-btn')?.addEventListener('click', () => {
        const frags = getPrestigeFragments();
        const el = document.getElementById('modal-fragments-preview');
        if (el) el.textContent = `+${frags} Fragment${frags > 1 ? 's' : ''} de Sagesse`;
        document.getElementById('prestige-modal')?.classList.add('visible');
        UI.updatePrestigePanel();
    });

    document.getElementById('prestige-confirm')?.addEventListener('click', () => {
        performPrestige();
        document.getElementById('prestige-modal')?.classList.remove('visible');
    });

    document.getElementById('prestige-cancel')?.addEventListener('click', () => {
        document.getElementById('prestige-modal')?.classList.remove('visible');
    });

    // ─── Paramètres ──────────────────────────────────────
    document.getElementById('sound-toggle')?.addEventListener('click', () => {
        GameState.settings.soundEnabled = !GameState.settings.soundEnabled;
        const btn = document.getElementById('sound-toggle');
        btn.textContent = GameState.settings.soundEnabled ? '🔊' : '🔇';
        btn.classList.toggle('active', GameState.settings.soundEnabled);
        if (GameState.settings.soundEnabled) {
            // Débloque le contexte audio au premier clic
            getAudio()?.resume();
        }
    });

    document.getElementById('particles-toggle')?.addEventListener('click', () => {
        GameState.settings.particlesEnabled = !GameState.settings.particlesEnabled;
        document.getElementById('particles-toggle')?.classList.toggle('active', GameState.settings.particlesEnabled);
    });

    document.getElementById('save-btn')?.addEventListener('click', () => {
        SaveSystem.save(GameState);
        UI.showNotification('💾 Partie sauvegardée !', 'success');
    });

    document.getElementById('reset-btn')?.addEventListener('click', () => {
        if (confirm('⚠️ Supprimer toute la progression ? Cette action est irréversible !')) {
            SaveSystem.deleteSave();
            location.reload();
        }
    });

    // ─── Gains hors connexion ────────────────────────────
    if (loadResult?.success && loadResult.offlineSeconds > 10) {
        const pps         = getProductionPerSec();
        const cappedSecs  = Math.min(loadResult.offlineSeconds, 8 * 3600);
        const offlineGain = pps * cappedSecs;
        if (offlineGain > 0) {
            GameState.resources.stone        += offlineGain;
            GameState.stats.totalStoneEarned += offlineGain;
            distributeSecondaryResources(offlineGain);
            setTimeout(() => {
                UI.showNotification(
                    `⏰ Absent ${formatTime(loadResult.offlineSeconds)} — +${formatNumber(offlineGain)} 🪨`,
                    'info', 5000
                );
                addLog(`⏰ Gains hors connexion : +${formatNumber(offlineGain)} pierres`);
            }, 1000);
        }
    }

    // ─── Auto-save + événements ───────────────────────────
    SaveSystem.startAutoSave(GameState);
    EventSystem.start(GameState);
    startAmbience();

    // ─── Mises à jour périodiques (1 Hz) ─────────────────
    setInterval(() => {
        UI.updateShop();
        UI.updateZonePanel();
        UI.updateStats();
        UI.updatePrestigePanel();
        renderLog();
    }, 1000);

    // ─── Game loop ────────────────────────────────────────
    requestAnimationFrame(gameLoop);
    addLog('⛏️ DeepMine chargé. Bonne mine !');
    console.log('⛏️ DeepMine v1.1 lancé.');
}

document.addEventListener('DOMContentLoaded', init);