/**
 * ============================================================
 * MINÉRIA — save.js
 * ============================================================
 * Gestion complète de la sauvegarde et du chargement.
 *
 * STOCKAGE : localStorage du navigateur
 *   → Les données survivent à la fermeture du navigateur.
 *   → Limitées à ~5 MB (largement suffisant pour ce jeu).
 *   → Clé utilisée : 'mineria_save_v1'
 *
 * SAUVEGARDE AUTOMATIQUE :
 *   → Toutes les 30 secondes via setInterval.
 *   → Aussi à la fermeture de l'onglet (beforeunload).
 *
 * FORMAT DE SAUVEGARDE :
 *   Un objet JSON contenant un snapshot minimal du GameState.
 *   On ne sauvegarde que les données VARIABLES (pas les configs).
 *
 * CALCUL DU TEMPS HORS CONNEXION :
 *   On sauvegarde un timestamp. Au rechargement, on calcule
 *   la différence et on accorde les gains idle manqués
 *   (plafonné à 8 heures pour équilibre).
 * ============================================================
 */


const SaveSystem = (() => {

    // ── Constantes ───────────────────────────────────────────
    const SAVE_KEY       = 'mineria_save_v1';  // Clé localStorage
    const SAVE_VERSION   = 1;                  // Version du format de sauvegarde
    const SAVE_INTERVAL  = 45000;              // Auto-save toutes les 45s
    const OFFLINE_MAX    = 8 * 3600;           // Max 8 heures de gains idle hors-ligne

    let autoSaveTimer = null; // Référence du setInterval d'auto-save


    // ==========================================================
    // SÉRIALISATION — Convertit le GameState en JSON sauvegardable
    // ==========================================================
    // On ne sauvegarde que ce qui est "mutable" :
    //   - Ressources courantes
    //   - Compteurs de bâtiments
    //   - État des upgrades (bought ou non)
    //   - État des zones (unlocked/active)
    //   - Données de prestige
    //   - Statistiques
    //   - Paramètres utilisateur
    //   - Achievements débloqués

    function serialize(state) {
        return JSON.stringify({
            version:   SAVE_VERSION,
            timestamp: Date.now(), // Pour calcul offline

            // Ressources : objet clé/valeur simple
            resources: state.resources,

            // Bâtiments : juste l'id et le count (pas toute la config)
            buildings: state.buildings.map(b => ({
                id:    b.id,
                count: b.count,
            })),

            // Upgrades : juste l'id et l'état acheté
            upgrades: state.upgrades.map(u => ({
                id:    u.id,
                bought: u.bought,
            })),

            // Zones : id, débloquée ou non, active ou non
            zones: state.zones.map(z => ({
                id:       z.id,
                unlocked: z.unlocked,
                active:   z.active,
            })),

            // Prestige complet (tout est important)
            prestige: state.prestige,

            // Statistiques complètes
            stats: state.stats,

            // Paramètres (son, particules, etc.)
            settings: state.settings,

            // Liste des IDs de succès débloqués
            achievements: state.achievements,
        });
    }


    // ==========================================================
    // DÉSÉRIALISATION — Recharge les données dans le GameState
    // ==========================================================
    // On applique les données sauvegardées sur les objets déjà
    // initialisés par initGameState(). Ainsi, si on a ajouté
    // de nouveaux bâtiments dans le jeu, ils seront présents
    // même sur une vieille sauvegarde (avec count = 0).

    function deserialize(data, state) {
        // Vérification de la version
        if (!data || data.version !== SAVE_VERSION) {
            console.warn('Minéria : Format de sauvegarde incompatible.');
            return false;
        }

        // ── Ressources ──────────────────────────────────────
        if (data.resources) {
            Object.keys(data.resources).forEach(key => {
                if (key in state.resources) {
                    state.resources[key] = data.resources[key] || 0;
                }
            });
        }

        // ── Bâtiments (on cherche par id pour robustesse) ───
        if (data.buildings) {
            data.buildings.forEach(saved => {
                const b = state.buildings.find(x => x.id === saved.id);
                if (b) b.count = saved.count || 0;
            });
        }

        // ── Upgrades ────────────────────────────────────────
        if (data.upgrades) {
            data.upgrades.forEach(saved => {
                const u = state.upgrades.find(x => x.id === saved.id);
                if (u) u.bought = !!saved.bought;
            });
        }

        // ── Zones ───────────────────────────────────────────
        if (data.zones) {
            data.zones.forEach(saved => {
                const z = state.zones.find(x => x.id === saved.id);
                if (z) {
                    z.unlocked = !!saved.unlocked;
                    z.active   = !!saved.active;
                }
            });
        }

        // ── Prestige ────────────────────────────────────────
        if (data.prestige) {
            Object.assign(state.prestige, data.prestige);
        }

        // ── Statistiques ────────────────────────────────────
        if (data.stats) {
            // On ne restaure pas sessionStart (commence une nouvelle session)
            const { sessionStart, ...savedStats } = data.stats;
            Object.assign(state.stats, savedStats);
        }

        // ── Paramètres ──────────────────────────────────────
        if (data.settings) {
            Object.assign(state.settings, data.settings);
        }

        // ── Achievements ────────────────────────────────────
        if (data.achievements && Array.isArray(data.achievements)) {
            data.achievements.forEach(id => {
                if (!state.achievements.includes(id)) {
                    state.achievements.push(id);
                }
            });
        }

        // Calcule le temps hors connexion (en secondes)
        // Plafonné à OFFLINE_MAX pour éviter les gains abusifs
        const offlineSeconds = Math.min(
            (Date.now() - data.timestamp) / 1000,
            OFFLINE_MAX
        );

        return { success: true, offlineSeconds };
    }


    // ==========================================================
    // API PUBLIQUE
    // ==========================================================

    /**
     * Sauvegarde le GameState dans le localStorage.
     * @param {Object} state - Le GameState complet
     * @returns {boolean} true si succès, false si erreur
     */
    function save(state) {
        try {
            localStorage.setItem(SAVE_KEY, serialize(state));
            return true;
        } catch (e) {
            // Peut arriver si le localStorage est plein ou désactivé
            console.warn('Minéria : Erreur lors de la sauvegarde :', e.message);
            return false;
        }
    }

    /**
     * Charge une sauvegarde depuis le localStorage.
     * @param {Object} state - Le GameState à remplir (déjà initialisé)
     * @returns {{ success: boolean, offlineSeconds?: number }}
     */
    function load(state) {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return { success: false }; // Aucune sauvegarde existante

            const data = JSON.parse(raw);
            return deserialize(data, state);
        } catch (e) {
            console.warn('Minéria : Erreur lors du chargement :', e.message);
            return { success: false };
        }
    }

    /**
     * Supprime entièrement la sauvegarde du localStorage.
     * Utilisé pour le reset complet du jeu.
     */
    function deleteSave() {
        localStorage.removeItem(SAVE_KEY);
        console.log('Minéria : Sauvegarde supprimée.');
    }

    /**
     * Démarre la sauvegarde automatique toutes les 30 secondes.
     * Attache aussi un listener beforeunload pour sauver à la fermeture.
     * @param {Object} state - Le GameState à sauvegarder automatiquement
     */
    function startAutoSave(state) {
        // Évite les doublons si startAutoSave est appelé plusieurs fois
        if (autoSaveTimer) clearInterval(autoSaveTimer);

        autoSaveTimer = setInterval(() => {
            const ok = save(state);
            if (ok && typeof UI !== 'undefined') {
                UI.showNotification('💾 Sauvegarde automatique', 'info', 1500);
            }
        }, SAVE_INTERVAL);

        // Sauvegarde aussi quand l'utilisateur ferme/quitte l'onglet
        window.addEventListener('beforeunload', () => save(state));
    }

    /**
     * Exporte la sauvegarde en fichier .txt téléchargeable (base64).
     * Permet de sauvegarder manuellement ou de transférer sur un autre PC.
     * @param {Object} state - Le GameState à exporter
     */
    function exportSave(state) {
        const json = serialize(state);
        const b64  = btoa(unescape(encodeURIComponent(json)));
        const blob = new Blob([b64], { type: 'text/plain' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `mineria_save_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Importe une sauvegarde depuis une chaîne base64.
     * @param {Object} state  - Le GameState à remplir
     * @param {string} b64str - Contenu base64 du fichier importé
     * @returns {boolean} true si l'import a réussi
     */
    function importSave(state, b64str) {
        try {
            const json = decodeURIComponent(escape(atob(b64str.trim())));
            const data = JSON.parse(json);
            const result = deserialize(data, state);
            if (result && result.success) {
                save(state); // Resauvegarde immédiatement
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Minéria : Import de sauvegarde invalide :', e.message);
            return false;
        }
    }

    // Retourne les fonctions publiques du module
    return { save, load, deleteSave, startAutoSave, exportSave, importSave };

})(); // Fin du module SaveSystem (IIFE)