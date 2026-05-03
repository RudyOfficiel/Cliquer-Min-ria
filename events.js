/**
 * ============================================================
 * MINÉRIA — events.js
 * ============================================================
 * Système d'événements aléatoires + événements Admin.
 *
 * ÉVÉNEMENTS NORMAUX :
 *   Déclenchés automatiquement toutes les 45s–2min.
 *   Bonus, malus ou instantanés.
 *
 * ÉVÉNEMENTS ADMIN :
 *   Déclenchés manuellement depuis le panel Admin.
 *   Effets extrêmes (×100, pluie de diamants, coupure élec…).
 *
 * BUG FIX v1.2 :
 *   - `clickBlocked` flag : certains events bloquent le clic
 *   - `productionBlocked` flag : bloque toute production auto
 *   - Les flags sont correctement remis à false en fin d'event
 *   - Coupure d'électricité : effet visuel + son + blocage total
 * ============================================================
 */

const EventSystem = (() => {

    const EVENT_MIN_MS = 50000;  // 50s entre événements
    const EVENT_MAX_MS = 120000; // 2min maximum

    let eventTimer  = null;
    let activeEvent = null;

    // Flags de blocage (vérifiés dans script.js)
    let _clickBlocked      = false; // Si true → performClick() ne fait rien
    let _productionBlocked = false; // Si true → getProductionPerSec() retourne 0


    // ==========================================================
    // ÉVÉNEMENTS NORMAUX
    // ==========================================================

    const EVENTS = [

        // ── BONUS ──────────────────────────────────────────────

        {
            id: 'diamond_vein', name: 'Veine de Diamant !', emoji: '💎',
            desc: 'Production ×2 pendant 30 secondes.',
            type: 'bonus', weight: 15, duration: 30000, color: '#00BFFF',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 2;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 2) / 2);
            },
        },
        {
            id: 'energy_wave', name: 'Vague d\'Énergie !', emoji: '⚡',
            desc: 'Vos machines tournent à plein régime ! Production ×2 pendant 45s.',
            type: 'bonus', weight: 12, duration: 45000, color: '#7FFF00',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 2;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 2) / 2);
            },
        },
        {
            id: 'lucky_strike', name: 'Coup de Veine !', emoji: '🍀',
            desc: 'Clic ×5 pendant 20 secondes !',
            type: 'bonus', weight: 14, duration: 20000, color: '#32CD32',
            effect(state) {
                state.clickMultiplierBonus = (state.clickMultiplierBonus || 1) * 5;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.clickMultiplierBonus = Math.max(1, (state.clickMultiplierBonus || 5) / 5);
            },
        },
        {
            id: 'crystal_bloom', name: 'Floraison de Cristaux !', emoji: '🔮',
            desc: 'Cristaux énergétiques ! Production ×6 pendant 15s.',
            type: 'bonus', weight: 4, duration: 15000, color: '#EE82EE',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 6;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 6) / 6);
            },
        },

        // ── MALUS ──────────────────────────────────────────────

        {
            id: 'earthquake', name: 'Tremblement de Terre !', emoji: '🌍',
            desc: 'La mine tremble ! Production −50% pendant 20 secondes.',
            type: 'malus', weight: 8, duration: 20000, color: '#FF4500',
            effect(state) {
                state.earthquakeActive = true;
                state.stats.eventsTriggered++;
                document.getElementById('mine-area')?.classList.add('earthquake');
                playEventSound('earthquake');
            },
            end(state) {
                state.earthquakeActive = false;
                document.getElementById('mine-area')?.classList.remove('earthquake');
            },
        },
        {
            id: 'giant_mole', name: 'Taupe Géante !', emoji: '🐀',
            desc: 'Une taupe obstrue vos tunnels. Production auto stoppée 15s.',
            type: 'malus', weight: 7, duration: 15000, color: '#8B4513',
            effect(state) {
                // FIX : utilise le flag _productionBlocked au lieu de moleActive
                state.moleActive = true;
                _productionBlocked = true;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.moleActive = false;
                _productionBlocked = false;
            },
        },

        // ── INSTANTANÉS ────────────────────────────────────────

        {
            id: 'hidden_chest', name: 'Coffre Caché !', emoji: '📦',
            desc: 'Coffre oublié découvert ! Bonus de ressources immédiat.',
            type: 'instant', weight: 20, duration: 0, color: '#FFD700',
            effect(state) {
                const bonus = Math.max(500, state.resources.stone * 0.15);
                state.resources.stone += bonus;
                state.stats.totalStoneEarned += bonus;
                state.stats.eventsTriggered++;
                if (typeof showFloatingNumber === 'function') {
                    showFloatingNumber(`📦 +${formatNumber(bonus)} 🪨`, null);
                }
            },
            end() {},
        },
        {
            id: 'rare_meteorite', name: 'Météorite Rare !', emoji: '☄️',
            desc: 'Fragment extraterrestre ! Minerais rares offerts.',
            type: 'instant', weight: 5, duration: 0, color: '#9400D3',
            effect(state) {
                const zoneIdx = state.zones.findIndex(z => z.active);
                const bonus   = 1000 * Math.pow(3, Math.min(zoneIdx, 8));
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
                    showFloatingNumber(`☄️ +${formatNumber(bonus)} 🪨`, null);
                }
            },
            end() {},
        },

        // ── MIXTE ──────────────────────────────────────────────

        {
            id: 'geyser', name: 'Geyser de Vapeur !', emoji: '💨',
            desc: 'Perd 5% de pierres mais production ×3 pendant 30s.',
            type: 'mixed', weight: 7, duration: 30000, color: '#87CEEB',
            effect(state) {
                state.resources.stone = Math.max(0, state.resources.stone * 0.95);
                state.activeMultiplier = (state.activeMultiplier || 1) * 3;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 3) / 3);
            },
        },

        // ── NOUVEL EVENT : COUPURE D'ÉLECTRICITÉ ───────────────
        // Bloque TOUT : production + clic + interface pendant 30s.
        // Effet visuel : écran qui s'assombrit + clignotement.
        {
            id: 'power_outage', name: '⚡ Coupure d\'Électricité !', emoji: '🔌',
            desc: 'Panne générale ! Toutes les machines arrêtées. Aucun clic possible. 30 secondes.',
            type: 'malus', weight: 5, duration: 30000, color: '#FF0000',
            effect(state) {
                // Bloque production ET clics
                _clickBlocked      = true;
                _productionBlocked = true;
                state.stats.eventsTriggered++;

                // Ajoute les classes CSS pour l'effet visuel
                document.body.classList.add('power-outage-active');
                document.getElementById('mine-area')?.classList.add('no-power');

                // Son d'alarme
                playEventSound('power_outage');

                // Affiche overlay spécial
                showPowerOutageOverlay(30000);
            },
            end(state) {
                // Rétablit tout
                _clickBlocked      = false;
                _productionBlocked = false;
                document.body.classList.remove('power-outage-active');
                document.getElementById('mine-area')?.classList.remove('no-power');
                hidePowerOutageOverlay();

                // Son de rétablissement
                playEventSound('power_restore');
                if (typeof UI !== 'undefined') {
                    UI.showNotification('⚡ Électricité rétablie ! Reprise normale.', 'success', 3000);
                }
            },
        },
    ];

    // ==========================================================
    // ÉVÉNEMENTS ADMIN (super-pouvoirs)
    // Déclenchés depuis le panel admin.
    // Pas soumis au cooldown des événements normaux.
    // ==========================================================

    const ADMIN_EVENTS = {

        // ── POSITIFS ───────────────────────────────────────────

        admin_x100: {
            name: '⚡ Production ×100', emoji: '⚡', type: 'bonus',
            desc: 'Production multipliée par 100 pendant 30 secondes !',
            duration: 30000, color: '#00FF00',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 100;
                showAdminEventBanner('⚡ BOOST ADMIN ×100 !', '#00FF00');
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 100) / 100);
            },
        },

        admin_diamond_rain: {
            name: '💎 Pluie de Diamants', emoji: '💎', type: 'bonus',
            desc: 'Pluie de diamants sur tous les joueurs !',
            duration: 0, color: '#00BFFF',
            effect(state) {
                state.resources.diamond = (state.resources.diamond || 0) + 50000;
                state.stats.totalDiamondEarned = (state.stats.totalDiamondEarned || 0) + 50000;
                showAdminEventBanner('💎 PLUIE DE DIAMANTS ! +50 000 💎', '#00BFFF');
                spawnAdminRain('💎', '#00BFFF');
            },
            end() {},
        },

        admin_legendary_storm: {
            name: '🌟 Tempête Légendaire', emoji: '🌟', type: 'bonus',
            desc: 'Tempête de minerais légendaires !',
            duration: 0, color: '#FFD700',
            effect(state) {
                state.resources.legendary = (state.resources.legendary || 0) + 100;
                state.stats.totalLegendaryEarned = (state.stats.totalLegendaryEarned || 0) + 100;
                showAdminEventBanner('🌟 TEMPÊTE LÉGENDAIRE ! +100 🌟', '#FFD700');
                spawnAdminRain('🌟', '#FFD700');
            },
            end() {},
        },

        admin_mega_boost: {
            name: '🚀 MEGA BOOST ×500', emoji: '🚀', type: 'bonus',
            desc: 'Tout ×500 pendant 30 secondes. SURPUISSANT !',
            duration: 30000, color: '#FF00FF',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 500;
                state.clickMultiplierBonus = (state.clickMultiplierBonus || 1) * 500;
                showAdminEventBanner('🚀 MEGA BOOST ×500 ACTIVÉ !', '#FF00FF');
                spawnAdminRain('⚡', '#FF00FF');
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 500) / 500);
                state.clickMultiplierBonus = Math.max(1, (state.clickMultiplierBonus || 500) / 500);
            },
        },

        admin_super_luck: {
            name: '🍀 Super Chance ×20', emoji: '🍀', type: 'bonus',
            desc: 'Chance de ressources rares ×20 pendant 60 secondes.',
            duration: 60000, color: '#32CD32',
            effect(state) {
                state.adminLuckBonus = 20;
                showAdminEventBanner('🍀 SUPER CHANCE ×20 ACTIVÉE !', '#32CD32');
            },
            end(state) {
                state.adminLuckBonus = 1;
            },
        },

        admin_infinite_resources: {
            name: '♾️ Ressources Infinies', emoji: '♾️', type: 'bonus',
            desc: 'Production ×1000 pendant 60 secondes !',
            duration: 60000, color: '#FFFFFF',
            effect(state) {
                state.activeMultiplier = (state.activeMultiplier || 1) * 1000;
                showAdminEventBanner('♾️ RESSOURCES INFINIES ! ×1000 PENDANT 60s', '#FFFFFF');
                spawnAdminRain('🪨', '#FFFFFF');
            },
            end(state) {
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 1000) / 1000);
            },
        },

        // ── NÉGATIFS ───────────────────────────────────────────

        admin_explosion: {
            name: '💣 Explosion de Mine !', emoji: '💣', type: 'malus',
            desc: 'Explosion catastrophique ! Perd 80% de toutes les ressources.',
            duration: 0, color: '#FF4400',
            effect(state) {
                Object.keys(state.resources).forEach(k => {
                    state.resources[k] = Math.floor((state.resources[k] || 0) * 0.2);
                });
                showAdminEventBanner('💣 EXPLOSION ! −80% de toutes vos ressources !', '#FF4400');
                document.body.classList.add('explosion-flash');
                setTimeout(() => document.body.classList.remove('explosion-flash'), 1000);
                playEventSound('explosion');
            },
            end() {},
        },

        admin_resource_theft: {
            name: '🦹 Vol de Minerais', emoji: '🦹', type: 'malus',
            desc: 'Voleurs dans la mine ! Perd 90% de vos pierres.',
            duration: 0, color: '#AA0000',
            effect(state) {
                state.resources.stone = Math.floor((state.resources.stone || 0) * 0.1);
                showAdminEventBanner('🦹 VOL ! Vous perdez 90% de vos pierres !', '#AA0000');
            },
            end() {},
        },

        admin_general_failure: {
            name: '⚠️ Panne Générale', emoji: '⚠️', type: 'malus',
            desc: 'Panne totale des machines pendant 60 secondes.',
            duration: 60000, color: '#FF6600',
            effect(state) {
                _productionBlocked = true;
                showAdminEventBanner('⚠️ PANNE GÉNÉRALE ! Production stoppée 60s.', '#FF6600');
            },
            end() {
                _productionBlocked = false;
            },
        },

        admin_sabotage: {
            name: '🔧 Sabotage', emoji: '🔧', type: 'malus',
            desc: 'Vos bâtiments sont sabotés pendant 30 secondes.',
            duration: 30000, color: '#884400',
            effect(state) {
                _productionBlocked = true;
                _clickBlocked = true;
                showAdminEventBanner('🔧 SABOTAGE ! Bâtiments et clics bloqués 30s.', '#884400');
            },
            end() {
                _productionBlocked = false;
                _clickBlocked = false;
            },
        },

        admin_power_outage: {
            name: '🔌 Coupure Admin', emoji: '🔌', type: 'malus',
            desc: 'Coupure d\'électricité forcée par l\'admin.',
            duration: 30000, color: '#FF0000',
            effect(state) {
                _clickBlocked      = true;
                _productionBlocked = true;
                document.body.classList.add('power-outage-active');
                showPowerOutageOverlay(30000);
                playEventSound('power_outage');
                showAdminEventBanner('🔌 COUPURE D\'ÉLECTRICITÉ ADMIN !', '#FF0000');
            },
            end() {
                _clickBlocked      = false;
                _productionBlocked = false;
                document.body.classList.remove('power-outage-active');
                hidePowerOutageOverlay();
                playEventSound('power_restore');
            },
        },
    };

    // ==========================================================
    // UTILITAIRES D'AFFICHAGE (appelle UI et effets globaux)
    // ==========================================================

    /** Affiche l'overlay de coupure d'électricité */
    function showPowerOutageOverlay(duration) {
        let overlay = document.getElementById('power-outage-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'power-outage-overlay';
            document.body.appendChild(overlay);
        }

        let remaining = Math.floor(duration / 1000);
        overlay.innerHTML = `
            <div class="power-icon">🔌</div>
            <div class="power-title">COUPURE D'ÉLECTRICITÉ</div>
            <div class="power-desc">Toutes les machines sont arrêtées…</div>
            <div class="power-timer" id="power-timer">${remaining}s</div>
        `;
        overlay.classList.add('visible');

        const interval = setInterval(() => {
            remaining--;
            const el = document.getElementById('power-timer');
            if (el) el.textContent = `${remaining}s`;
            if (remaining <= 0) clearInterval(interval);
        }, 1000);
    }

    function hidePowerOutageOverlay() {
        const overlay = document.getElementById('power-outage-overlay');
        if (overlay) {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 500);
        }
    }

    /** Affiche un banner plein-écran pour les events admin */
    function showAdminEventBanner(text, color) {
        let banner = document.getElementById('admin-event-flash');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'admin-event-flash';
            document.body.appendChild(banner);
        }
        banner.textContent = text;
        banner.style.borderColor = color;
        banner.style.color = color;
        banner.classList.add('visible');
        setTimeout(() => banner.classList.remove('visible'), 4000);

        if (typeof addLog === 'function') addLog(`🎮 Événement Admin : ${text}`);
    }

    /** Fait tomber des emojis depuis le haut de l'écran */
    function spawnAdminRain(emoji, color) {
        const container = document.body;
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'admin-rain-item';
                el.textContent = emoji;
                el.style.left = `${Math.random() * 100}vw`;
                el.style.animationDuration = `${1 + Math.random() * 2}s`;
                el.style.animationDelay = `${Math.random() * 0.5}s`;
                el.style.color = color;
                container.appendChild(el);
                setTimeout(() => el.remove(), 3000);
            }, i * 50);
        }
    }

    /** Son d'événement via Web Audio (si disponible dans script.js) */
    function playEventSound(type) {
        if (typeof playSpecialSound !== 'function') return;
        playSpecialSound(type);
    }

    // ==========================================================
    // SÉLECTION ALÉATOIRE PONDÉRÉE
    // ==========================================================

    function pickRandomEvent() {
        const total = EVENTS.reduce((s, e) => s + e.weight, 0);
        let rng = Math.random() * total;
        for (const evt of EVENTS) {
            rng -= evt.weight;
            if (rng <= 0) return evt;
        }
        return EVENTS[0];
    }

    // ==========================================================
    // PLANIFICATION DES ÉVÉNEMENTS NORMAUX
    // ==========================================================

    function scheduleNext(state) {
        const delay = EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS);
        eventTimer = setTimeout(() => triggerEvent(state), delay);
    }

    function triggerEvent(state) {
        if (activeEvent) { scheduleNext(state); return; }

        const evt = pickRandomEvent();
        activeEvent = evt;

        if (typeof UI !== 'undefined') UI.showEventBanner(evt);
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

    // ==========================================================
    // DÉCLENCHEMENT D'UN ÉVÉNEMENT ADMIN
    // ==========================================================

    /**
     * Déclenche un événement admin par son ID.
     * Appelé depuis admin.js ou depuis le listener broadcast (autres onglets).
     * @param {string} eventId - Clé dans ADMIN_EVENTS
     * @param {Object} state   - GameState
     */
    function triggerAdminEvent(eventId, state) {
        const evt = ADMIN_EVENTS[eventId];
        if (!evt) { console.warn(`EventSystem: événement admin inconnu "${eventId}"`); return; }

        evt.effect(state);

        if (evt.duration > 0) {
            setTimeout(() => evt.end(state), evt.duration);
        }

        if (typeof addLog === 'function') addLog(`🎮 Admin Event : ${evt.name}`);
    }

    // ==========================================================
    // API PUBLIQUE
    // ==========================================================

    return {
        /** Lance les événements aléatoires */
        start(state) { scheduleNext(state); },

        /** Arrête le système */
        stop() { if (eventTimer) clearTimeout(eventTimer); },

        /** Événement actif actuel (null si aucun) */
        getActive() { return activeEvent; },

        /** Force un événement normal */
        triggerEvent,

        /** Déclenche un événement admin par son ID */
        triggerAdminEvent,

        /** @returns {boolean} true si le clic est bloqué */
        isClickBlocked() { return _clickBlocked; },

        /** @returns {boolean} true si la production auto est bloquée */
        isProductionBlocked() { return _productionBlocked; },

        /** Catalogue des événements admin (pour l'affichage dans le panel) */
        ADMIN_EVENTS,
    };

})();