/**
 * DeepMine - Système d'Événements Aléatoires & Mini-Boss
 * NB : Ce fichier est chargé AVANT script.js.
 * Les fonctions UI et formatNumber sont des globals définies dans script.js
 * et accessibles au moment où EventSystem est appelé (après init()).
 */

const EventSystem = (() => {
    const EVENT_MIN_MS = 50000;   // 50s minimum entre événements
    const EVENT_MAX_MS = 120000;  // 2min maximum
    const BOSS_MIN_MS  = 90000;   // Boss toutes les ~2-5 minutes
    const BOSS_MAX_MS  = 300000;

    let eventTimer = null;
    let bossTimer  = null;
    let activeEvent = null;
    let activeBoss  = null;

    // ─────────────────────────────────────────────────────────
    // Définition des Événements
    // ─────────────────────────────────────────────────────────
    const EVENTS = [
        {
            id: 'diamond_vein',
            name: 'Veine de Diamant !',
            emoji: '💎',
            desc: 'Une veine exceptionnelle ! Production ×2 pendant 30 secondes.',
            type: 'bonus',
            weight: 15,
            duration: 30000,
            color: '#00BFFF',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 2;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 2) / 2);
            },
        },
        {
            id: 'hidden_chest',
            name: 'Coffre Caché Découvert !',
            emoji: '📦',
            desc: 'Vos mineurs ont trouvé un coffre oublié rempli de ressources !',
            type: 'instant',
            weight: 20,
            duration: 0,
            color: '#FFD700',
            effect(state) {
                const bonus = Math.max(500, state.resources.stone * 0.15);
                state.resources.stone += bonus;
                state.stats.totalStoneEarned += bonus;
                state.stats.eventsTriggered++;
                // showFloatingNumber est défini dans script.js
                if (typeof showFloatingNumber === 'function') {
                    showFloatingNumber(`📦 +${formatNumber(bonus)} pierres !`, null);
                }
            },
            end() {},
        },
        {
            id: 'earthquake',
            name: 'Tremblement de Terre !',
            emoji: '🌍',
            desc: 'La mine tremble ! Production réduite de 50% pendant 20 secondes.',
            type: 'malus',
            weight: 8,
            duration: 20000,
            color: '#FF4500',
            effect(state) {
                state.earthquakeActive = true;
                state.stats.eventsTriggered++;
                document.getElementById('mine-area')?.classList.add('earthquake');
            },
            end(state) {
                state.earthquakeActive = false;
                document.getElementById('mine-area')?.classList.remove('earthquake');
            },
        },
        {
            id: 'giant_mole',
            name: 'Taupe Géante !',
            emoji: '🐀',
            desc: 'Une taupe géante bloque vos tunnels ! Production auto stoppée pendant 15 secondes.',
            type: 'malus',
            weight: 7,
            duration: 15000,
            color: '#8B4513',
            effect(state) {
                state.moleActive = true;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.moleActive = false;
            },
        },
        {
            id: 'double_bonus',
            name: 'Vague d\'Énergie ×2 !',
            emoji: '⚡',
            desc: 'Perturbation géomagnétique ! Production ×2 pendant 45 secondes.',
            type: 'bonus',
            weight: 12,
            duration: 45000,
            color: '#7FFF00',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 2;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 2) / 2);
            },
        },
        {
            id: 'rare_meteorite',
            name: 'Météorite Rare !',
            emoji: '☄️',
            desc: 'Un fragment météoritique percute votre mine ! Minerais rares récompensés.',
            type: 'instant',
            weight: 5,
            duration: 0,
            color: '#9400D3',
            effect(state) {
                const zoneIdx = state.zones.findIndex(z => z.active);
                const bonus = 1000 * Math.pow(3, zoneIdx);
                state.resources.stone += bonus;
                state.stats.totalStoneEarned += bonus;
                if (zoneIdx >= 5) {
                    state.resources.legendary = (state.resources.legendary || 0) + 1;
                    state.stats.totalLegendaryEarned = (state.stats.totalLegendaryEarned || 0) + 1;
                } else if (zoneIdx >= 4) {
                    state.resources.crystal = (state.resources.crystal || 0) + 2;
                    state.stats.totalCrystalEarned = (state.stats.totalCrystalEarned || 0) + 2;
                } else if (zoneIdx >= 3) {
                    state.resources.diamond = (state.resources.diamond || 0) + 3;
                    state.stats.totalDiamondEarned = (state.stats.totalDiamondEarned || 0) + 3;
                }
                state.stats.eventsTriggered++;
                if (typeof showFloatingNumber === 'function') {
                    showFloatingNumber(`☄️ +${formatNumber(bonus)} !`, null);
                }
            },
            end() {},
        },
        {
            id: 'lucky_strike',
            name: 'Coup de Veine !',
            emoji: '🍀',
            desc: 'Veine exceptionnelle ! Clic ×5 pendant 20 secondes.',
            type: 'bonus',
            weight: 14,
            duration: 20000,
            color: '#32CD32',
            effect(state) {
                state.clickMultiplierBonus = (state.clickMultiplierBonus || 1) * 5;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.clickMultiplierBonus = Math.max(1, (state.clickMultiplierBonus || 5) / 5);
            },
        },
        {
            id: 'geyser',
            name: 'Geyser de Vapeur !',
            emoji: '💨',
            desc: 'Geyser souterrain ! Perd 5% de pierre mais production ×3 pendant 30s.',
            type: 'mixed',
            weight: 7,
            duration: 30000,
            color: '#87CEEB',
            effect(state) {
                const loss = state.resources.stone * 0.05;
                state.resources.stone = Math.max(0, state.resources.stone - loss);
                state.activeMultiplier = (state.activeMultiplier || 1) * 3;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 3) / 3);
            },
        },
        {
            id: 'crystal_bloom',
            name: 'Floraison de Cristaux !',
            emoji: '🔮',
            desc: 'Des cristaux poussent partout ! +500% production pendant 15 secondes.',
            type: 'bonus',
            weight: 4,
            duration: 15000,
            color: '#EE82EE',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 6;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 6) / 6);
            },
        },
    ];

    // ─────────────────────────────────────────────────────────
    // Mini-Boss
    // ─────────────────────────────────────────────────────────

    function spawnBoss(state) {
        if (activeBoss) return;
        const zoneIdx = state.zones.findIndex(z => z.active);
        // Sélection des boss accessibles dans la zone actuelle
        const eligible = BOSSES_DATA.filter(b => b.minZone <= zoneIdx);
        if (eligible.length === 0) return;

        const bossData = eligible[Math.floor(Math.random() * eligible.length)];
        activeBoss = {
            ...bossData,
            hp: bossData.maxHp,
        };

        renderBossUI(activeBoss);
        scheduleBoss(state);
    }

    function hitBoss(state) {
        if (!activeBoss) return;
        const dmg = Math.max(1, Math.floor(state.clickPower / 10) + 1);
        activeBoss.hp = Math.max(0, activeBoss.hp - dmg);
        updateBossHP();

        if (activeBoss.hp <= 0) {
            defeatBoss(state);
        }
    }

    function defeatBoss(state) {
        if (!activeBoss) return;
        const rewards = activeBoss.reward;

        // Distribue les récompenses
        Object.entries(rewards).forEach(([res, amount]) => {
            state.resources[res] = (state.resources[res] || 0) + amount;
            const statKey = `total${res.charAt(0).toUpperCase() + res.slice(1)}Earned`;
            state.stats[statKey] = (state.stats[statKey] || 0) + amount;
        });

        state.stats.bossesDefeated = (state.stats.bossesDefeated || 0) + 1;

        if (typeof UI !== 'undefined') {
            UI.showNotification(`🏆 ${activeBoss.name} vaincu ! Récompenses récoltées.`, 'success', 4000);
        }

        hideBossUI();
        activeBoss = null;
    }

    function renderBossUI(boss) {
        const container = document.getElementById('boss-container');
        if (!container) return;

        container.innerHTML = `
            <div class="boss-header">
                <span class="boss-emoji">${boss.emoji}</span>
                <div class="boss-info">
                    <div class="boss-name">${boss.name}</div>
                    <div class="boss-desc">${boss.desc}</div>
                </div>
                <button class="boss-hit-btn" id="boss-hit-btn" onclick="EventSystem.hitBoss(GameState)">⚔️ Attaquer</button>
            </div>
            <div class="boss-hp-bar">
                <div class="boss-hp-fill" id="boss-hp-fill" style="width:100%; background:${boss.color}"></div>
            </div>
            <div class="boss-hp-text" id="boss-hp-text">${boss.maxHp} / ${boss.maxHp} HP</div>
        `;
        container.classList.add('active');
        container.style.setProperty('--boss-color', boss.color);
    }

    function updateBossHP() {
        if (!activeBoss) return;
        const fill = document.getElementById('boss-hp-fill');
        const text = document.getElementById('boss-hp-text');
        if (fill) fill.style.width = `${(activeBoss.hp / activeBoss.maxHp) * 100}%`;
        if (text) text.textContent = `${Math.ceil(activeBoss.hp)} / ${activeBoss.maxHp} HP`;
    }

    function hideBossUI() {
        const container = document.getElementById('boss-container');
        if (container) container.classList.remove('active');
    }

    // ─────────────────────────────────────────────────────────
    // Événements aléatoires
    // ─────────────────────────────────────────────────────────

    function pickRandomEvent() {
        const total = EVENTS.reduce((s, e) => s + e.weight, 0);
        let rng = Math.random() * total;
        for (const evt of EVENTS) {
            rng -= evt.weight;
            if (rng <= 0) return evt;
        }
        return EVENTS[0];
    }

    function scheduleNext(state) {
        const delay = EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS);
        eventTimer = setTimeout(() => triggerEvent(state), delay);
    }

    function scheduleBoss(state) {
        const delay = BOSS_MIN_MS + Math.random() * (BOSS_MAX_MS - BOSS_MIN_MS);
        bossTimer = setTimeout(() => spawnBoss(state), delay);
    }

    function triggerEvent(state) {
        if (activeEvent) { scheduleNext(state); return; }
        const evt = pickRandomEvent();
        activeEvent = evt;

        if (typeof UI !== 'undefined') {
            UI.showEventBanner(evt);
        }
        evt.effect(state);

        if (evt.duration > 0) {
            setTimeout(() => endEvent(state, evt), evt.duration);
        } else {
            activeEvent = null;
        }
        scheduleNext(state);
    }

    function endEvent(state, evt) {
        evt.end(state);
        activeEvent = null;
        if (typeof UI !== 'undefined') UI.hideEventBanner();
    }

    function start(state) {
        scheduleNext(state);
        scheduleBoss(state);
    }

    function stop() {
        if (eventTimer) clearTimeout(eventTimer);
        if (bossTimer)  clearTimeout(bossTimer);
    }

    function getActive() { return activeEvent; }
    function getActiveBoss() { return activeBoss; }

    return { start, stop, getActive, getActiveBoss, hitBoss, triggerEvent, spawnBoss };
})();