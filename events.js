/**
 * ============================================================
 * MINÉRIA — events.js
 * ============================================================
 * Système d'événements aléatoires qui surviennent pendant la
 * partie pour maintenir l'intérêt du joueur.
 *
 * FONCTIONNEMENT :
 *   1. Un événement se déclenche toutes les 45s à 2min (aléatoire).
 *   2. Il affiche une bannière en bas de l'écran.
 *   3. S'il a une durée, il se termine automatiquement.
 *   4. S'il est "instant", son effet est appliqué immédiatement.
 *
 * ÉVÉNEMENTS AVEC DURÉE (type bonus/malus) :
 *   → Modifient activeMultiplier ou un flag de GameState.
 *   → Sont annulés (end()) quand la durée expire.
 *
 * ÉVÉNEMENTS INSTANTANÉS (type instant) :
 *   → Appliquent un effet une seule fois, pas de fin.
 *
 * AJOUTER UN ÉVÉNEMENT :
 *   Copier un objet de EVENTS[], modifier ses propriétés,
 *   ajuster le `weight` (probabilité relative).
 *   Plus le weight est élevé, plus l'événement est fréquent.
 * ============================================================
 */


const EventSystem = (() => {

    // ── Intervalles (en millisecondes) ───────────────────────
    // Délai minimum et maximum entre deux événements aléatoires
    const EVENT_MIN_MS = 50000;   // 50 secondes minimum
    const EVENT_MAX_MS = 120000;  // 2 minutes maximum

    // Variables internes du module
    let eventTimer  = null;  // setTimeout en cours pour le prochain événement
    let activeEvent = null;  // Événement actuellement actif (null si aucun)


    // ==========================================================
    // CATALOGUE DES ÉVÉNEMENTS
    // ==========================================================
    // Chaque événement possède :
    //   id       → identifiant unique
    //   name     → titre affiché dans la bannière
    //   emoji    → icône
    //   desc     → description de l'effet
    //   type     → 'bonus' | 'malus' | 'instant' | 'mixed'
    //   weight   → poids de tirage (plus élevé = plus fréquent)
    //   duration → durée en ms (0 = instantané)
    //   color    → couleur de la bordure de la bannière
    //   effect() → fonction appelée au déclenchement
    //   end()    → fonction appelée à la fin (si duration > 0)
    // ==========================================================

    const EVENTS = [

        // ── BONUS ──────────────────────────────────────────────

        // Veine de diamant : production ×2 pendant 30 secondes
        {
            id: 'diamond_vein',
            name: 'Veine de Diamant !',
            emoji: '💎',
            desc: 'Une veine exceptionnelle vient d\'être découverte ! Production ×2 pendant 30s.',
            type: 'bonus',
            weight: 15,           // Assez fréquent
            duration: 30000,      // 30 secondes
            color: '#00BFFF',
            effect(state) {
                // On multiplie le multiplicateur global de production
                state.activeMultiplier = (state.activeMultiplier || 1) * 2;
                state.stats.eventsTriggered++;
            },
            end(state) {
                // On annule l'effet en divisant par 2
                state.activeMultiplier = Math.max(1, (state.activeMultiplier || 2) / 2);
            },
        },

        // Vague d'énergie : production ×2 pendant 45 secondes
        {
            id: 'energy_wave',
            name: 'Vague d\'Énergie ×2 !',
            emoji: '⚡',
            desc: 'Perturbation géomagnétique ! Toutes vos machines tournent à plein régime.',
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

        // Coup de veine : clic ×5 pendant 20 secondes
        {
            id: 'lucky_strike',
            name: 'Coup de Veine !',
            emoji: '🍀',
            desc: 'Vos mineurs tombent sur une poche géante ! Clic ×5 pendant 20 secondes.',
            type: 'bonus',
            weight: 14,
            duration: 20000,
            color: '#32CD32',
            effect(state) {
                // Multiplie la puissance de clic temporairement
                state.clickMultiplierBonus = (state.clickMultiplierBonus || 1) * 5;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.clickMultiplierBonus = Math.max(1, (state.clickMultiplierBonus || 5) / 5);
            },
        },

        // Floraison de cristaux : production ×6 pendant 15 secondes
        {
            id: 'crystal_bloom',
            name: 'Floraison de Cristaux !',
            emoji: '🔮',
            desc: 'Des cristaux énergétiques jaillissent partout ! Production ×6 pendant 15s.',
            type: 'bonus',
            weight: 4,            // Rare
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

        // ── MALUS ──────────────────────────────────────────────

        // Tremblement de terre : production ÷2 pendant 20 secondes
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
                // Flag spécial : réduit la production dans getProductionPerSec()
                state.earthquakeActive = true;
                state.stats.eventsTriggered++;
                // Animation visuelle sur la zone de minage
                document.getElementById('mine-area')?.classList.add('earthquake');
            },
            end(state) {
                state.earthquakeActive = false;
                document.getElementById('mine-area')?.classList.remove('earthquake');
            },
        },

        // Taupe géante : production auto bloquée 15 secondes
        {
            id: 'giant_mole',
            name: 'Taupe Géante !',
            emoji: '🐀',
            desc: 'Une taupe géante obstrue vos tunnels ! Production auto stoppée 15 secondes.',
            type: 'malus',
            weight: 7,
            duration: 15000,
            color: '#8B4513',
            effect(state) {
                // Flag vérifié dans getProductionPerSec() → retourne 0
                state.moleActive = true;
                state.stats.eventsTriggered++;
            },
            end(state) {
                state.moleActive = false;
            },
        },

        // ── INSTANTANÉS ────────────────────────────────────────

        // Coffre caché : +15% des pierres actuelles en bonus
        {
            id: 'hidden_chest',
            name: 'Coffre Caché Découvert !',
            emoji: '📦',
            desc: 'Vos mineurs ont trouvé un coffre oublié ! Bonus de ressources immédiat.',
            type: 'instant',
            weight: 20,           // Le plus fréquent
            duration: 0,          // Instantané : pas de durée
            color: '#FFD700',
            effect(state) {
                // Bonus = 15% du stock actuel, minimum 500 pierres
                const bonus = Math.max(500, state.resources.stone * 0.15);
                state.resources.stone += bonus;
                state.stats.totalStoneEarned += bonus;
                state.stats.eventsTriggered++;
                // Affiche un nombre flottant si la fonction est disponible
                if (typeof showFloatingNumber === 'function') {
                    showFloatingNumber(`📦 +${formatNumber(bonus)} 🪨`, null);
                }
            },
            end() {}, // Rien à annuler pour un événement instantané
        },

        // Météorite rare : ressources selon la zone
        {
            id: 'rare_meteorite',
            name: 'Météorite Rare !',
            emoji: '☄️',
            desc: 'Fragment extraterrestre dans votre mine ! Minerais rares offerts.',
            type: 'instant',
            weight: 5,            // Rare
            duration: 0,
            color: '#9400D3',
            effect(state) {
                const zoneIdx = state.zones.findIndex(z => z.active);
                // Bonus de pierres qui scale avec la profondeur
                const stoneBonus = 1000 * Math.pow(3, zoneIdx);
                state.resources.stone += stoneBonus;
                state.stats.totalStoneEarned += stoneBonus;

                // Donne aussi des ressources rares selon la zone
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
                    showFloatingNumber(`☄️ +${formatNumber(stoneBonus)} 🪨`, null);
                }
            },
            end() {},
        },

        // ── MIXTE ──────────────────────────────────────────────

        // Geyser : perd 5% de pierres mais production ×3 pendant 30s
        {
            id: 'geyser',
            name: 'Geyser de Vapeur !',
            emoji: '💨',
            desc: 'Un geyser jaillit ! Perd 5% de pierres mais production ×3 pendant 30s.',
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
    ];


    // ==========================================================
    // SÉLECTION ALÉATOIRE PONDÉRÉE
    // ==========================================================
    // Tire un événement au hasard en tenant compte des poids.
    // Un événement de weight 20 a 2× plus de chance qu'un de weight 10.

    function pickRandomEvent() {
        const totalWeight = EVENTS.reduce((sum, e) => sum + e.weight, 0);
        let rng = Math.random() * totalWeight;
        for (const evt of EVENTS) {
            rng -= evt.weight;
            if (rng <= 0) return evt;
        }
        return EVENTS[0]; // Sécurité : toujours retourner quelque chose
    }


    // ==========================================================
    // PLANIFICATION
    // ==========================================================

    // Programme le prochain événement dans un délai aléatoire
    function scheduleNext(state) {
        const delay = EVENT_MIN_MS + Math.random() * (EVENT_MAX_MS - EVENT_MIN_MS);
        eventTimer = setTimeout(() => triggerEvent(state), delay);
    }

    // Déclenche un événement aléatoire
    function triggerEvent(state) {
        // Si un événement est déjà actif, on attend le prochain cycle
        if (activeEvent) {
            scheduleNext(state);
            return;
        }

        const evt = pickRandomEvent();
        activeEvent = evt;

        // Affiche la bannière dans l'UI (UI est défini dans script.js)
        if (typeof UI !== 'undefined') {
            UI.showEventBanner(evt);
        }

        // Applique l'effet immédiat
        evt.effect(state);

        // Si l'événement a une durée, programme sa fin
        if (evt.duration > 0) {
            setTimeout(() => endEvent(state, evt), evt.duration);
        } else {
            // Événement instantané : libère le slot immédiatement
            activeEvent = null;
        }

        // Programme le prochain événement
        scheduleNext(state);
    }

    // Termine un événement avec durée (annule ses effets)
    function endEvent(state, evt) {
        evt.end(state);
        activeEvent = null;
        if (typeof UI !== 'undefined') {
            UI.hideEventBanner();
        }
    }


    // ==========================================================
    // API PUBLIQUE DU MODULE
    // ==========================================================

    return {
        /** Lance le système d'événements (appelé dans init()) */
        start(state) {
            scheduleNext(state);
        },

        /** Arrête le système (utile pour les tests) */
        stop() {
            if (eventTimer) clearTimeout(eventTimer);
        },

        /** Retourne l'événement actuellement actif (ou null) */
        getActive() {
            return activeEvent;
        },

        /**
         * Force le déclenchement d'un événement (pour les tests).
         * Exemple : EventSystem.triggerEvent(GameState)
         */
        triggerEvent,
    };

})(); // Fin du module EventSystem (IIFE)