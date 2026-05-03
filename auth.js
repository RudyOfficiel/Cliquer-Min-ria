/**
 * ============================================================
 * MINÉRIA — auth.js
 * ============================================================
 * Système d'authentification multi-comptes côté client.
 * Stockage via localStorage (comptes) + sessionStorage (session).
 *
 * FONCTIONNEMENT :
 *   - Chaque joueur crée un compte (pseudo + prénom + mdp).
 *   - La session est stockée en sessionStorage (disparaît à la fermeture).
 *   - Chaque joueur a sa propre sauvegarde de jeu.
 *   - Le compte admin est créé automatiquement au premier lancement.
 *
 * !! SÉCURITÉ !!
 *   Ce système est purement client-side (local).
 *   Pour une vraie prod multi-joueur, un backend est nécessaire.
 *
 * IDENTIFIANTS ADMIN PAR DÉFAUT (à changer dans ADMIN_PASSWORD) :
 *   Pseudo   : AdminMineria
 *   Mot de passe : Mineria@Admin2025
 * ============================================================
 */

const Auth = (() => {

    // ── Clés de stockage ────────────────────────────────────
    const ACCOUNTS_KEY   = 'mineria_accounts';     // localStorage : tous les comptes
    const SESSION_KEY    = 'mineria_session';       // sessionStorage : session active
    const ONLINE_PREFIX  = 'mineria_online_';      // localStorage : statut en ligne
    const LOG_KEY        = 'mineria_admin_log';    // localStorage : journal admin
    const BROADCAST_KEY  = 'mineria_broadcast';    // localStorage : diffusion admin

    // !! CHANGER CES VALEURS POUR SÉCURISER L'ACCÈS ADMIN !!
    const ADMIN_USERNAME  = 'AdminMineria';
    const ADMIN_FIRSTNAME = 'Admin';
    const ADMIN_PASSWORD  = 'Mineria@Admin2025';   // ← CHANGER ICI

    // ═══════════════════════════════════════════════════════
    // HASH — Protection basique des mots de passe
    // Note : non cryptographique. Suffisant pour un jeu local.
    // ═══════════════════════════════════════════════════════

    function simpleHash(str) {
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h) ^ str.charCodeAt(i);
            h = h >>> 0;
        }
        return h.toString(16) + '_' + str.length.toString(16);
    }

    // ═══════════════════════════════════════════════════════
    // LECTURE / ÉCRITURE DES COMPTES
    // ═══════════════════════════════════════════════════════

    function getAccounts() {
        try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}'); }
        catch (e) { return {}; }
    }

    function saveAccounts(accounts) {
        localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    }

    // ═══════════════════════════════════════════════════════
    // INITIALISATION DU COMPTE ADMIN
    // Appelée au démarrage de l'application.
    // Crée le compte admin si il n'existe pas encore.
    // ═══════════════════════════════════════════════════════

    function initAdminAccount() {
        const accounts = getAccounts();
        if (!accounts[ADMIN_USERNAME]) {
            accounts[ADMIN_USERNAME] = {
                firstName:    ADMIN_FIRSTNAME,
                passwordHash: simpleHash(ADMIN_PASSWORD),
                role:         'admin',
                banned:       false,
                banExpiry:    null,
                registeredAt: Date.now(),
            };
            saveAccounts(accounts);
        }
    }

    // ═══════════════════════════════════════════════════════
    // INSCRIPTION
    // ═══════════════════════════════════════════════════════

    /**
     * Crée un nouveau compte joueur.
     * @returns {{ success: boolean, error?: string }}
     */
    function register(username, firstName, password) {
        // Validations
        if (!username?.trim() || !firstName?.trim() || !password) {
            return { success: false, error: 'Tous les champs sont requis.' };
        }
        const u = username.trim();
        const f = firstName.trim();

        if (u.length < 3 || u.length > 20) {
            return { success: false, error: 'Pseudo : 3 à 20 caractères.' };
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(u)) {
            return { success: false, error: 'Pseudo : lettres, chiffres, _ et - uniquement.' };
        }
        if (f.length < 2 || f.length > 30) {
            return { success: false, error: 'Prénom : 2 à 30 caractères.' };
        }
        if (password.length < 6) {
            return { success: false, error: 'Mot de passe : minimum 6 caractères.' };
        }

        const accounts = getAccounts();
        // Vérifie que le pseudo n'est pas déjà pris (insensible à la casse)
        if (Object.keys(accounts).some(k => k.toLowerCase() === u.toLowerCase())) {
            return { success: false, error: 'Ce pseudo est déjà utilisé.' };
        }

        accounts[u] = {
            firstName:    f,
            passwordHash: simpleHash(password),
            role:         'player',
            banned:       false,
            banExpiry:    null,
            registeredAt: Date.now(),
        };
        saveAccounts(accounts);
        return { success: true };
    }

    // ═══════════════════════════════════════════════════════
    // CONNEXION
    // ═══════════════════════════════════════════════════════

    /**
     * Authentifie un joueur et crée une session.
     * @returns {{ success: boolean, session?: Object, error?: string }}
     */
    function login(username, password) {
        const accounts = getAccounts();
        const account  = accounts[username];

        if (!account) {
            return { success: false, error: 'Compte introuvable. Vérifiez votre pseudo.' };
        }
        if (account.passwordHash !== simpleHash(password)) {
            return { success: false, error: 'Mot de passe incorrect.' };
        }

        // Vérification du ban
        if (account.banned) {
            if (account.banExpiry && Date.now() > account.banExpiry) {
                // Ban temporaire expiré → on le lève automatiquement
                account.banned    = false;
                account.banExpiry = null;
                saveAccounts(accounts);
            } else {
                const expiry = account.banExpiry
                    ? `jusqu'au ${new Date(account.banExpiry).toLocaleDateString('fr-FR')}`
                    : 'définitivement';
                return { success: false, error: `🚫 Compte banni ${expiry}.` };
            }
        }

        // Crée la session (sessionStorage = cleared à fermeture de l'onglet)
        const session = {
            username,
            firstName: account.firstName,
            role:      account.role,
            loginTime: Date.now(),
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return { success: true, session };
    }

    // ═══════════════════════════════════════════════════════
    // SESSION
    // ═══════════════════════════════════════════════════════

    function logout() {
        const user = getCurrentUser();
        if (user) {
            // Retire le joueur de la liste en ligne
            localStorage.removeItem(ONLINE_PREFIX + user.username);
        }
        sessionStorage.removeItem(SESSION_KEY);
    }

    /** @returns {Object|null} Utilisateur courant ou null si non connecté */
    function getCurrentUser() {
        try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
        catch (e) { return null; }
    }

    /** @returns {boolean} true si l'utilisateur courant est admin */
    function isAdmin() {
        const u = getCurrentUser();
        return !!(u && u.role === 'admin');
    }

    // ═══════════════════════════════════════════════════════
    // STATUT EN LIGNE (heartbeat toutes les 10s)
    // ═══════════════════════════════════════════════════════

    /**
     * Met à jour le statut en ligne du joueur actuel.
     * @param {Object|null} gameState - null pour retirer du statut en ligne
     */
    function updateOnlineStatus(gameState) {
        const user = getCurrentUser();
        if (!user) return;

        if (!gameState) {
            localStorage.removeItem(ONLINE_PREFIX + user.username);
            return;
        }

        const zone          = gameState.currentZone;
        const totalBuildings = (gameState.buildings || []).reduce((t, b) => t + (b.count || 0), 0);

        localStorage.setItem(ONLINE_PREFIX + user.username, JSON.stringify({
            username:   user.username,
            firstName:  user.firstName,
            role:       user.role,
            lastSeen:   Date.now(),
            zone:       zone?.name     || 'Surface',
            zoneEmoji:  zone?.emoji    || '🌿',
            buildings:  totalBuildings,
            totalStone: gameState.stats?.totalStoneEarned || 0,
            prestige:   gameState.prestige?.count         || 0,
            playTime:   gameState.stats?.totalPlayTime    || 0,
        }));
    }

    /**
     * Retourne la liste des joueurs actifs (vus dans les 30 dernières secondes).
     * @returns {Array}
     */
    function getOnlinePlayers() {
        const now        = Date.now();
        const THRESHOLD  = 30000; // 30s
        const players    = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(ONLINE_PREFIX)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (now - data.lastSeen < THRESHOLD) {
                        players.push({ ...data, online: true });
                    }
                } catch (e) { /* ignore */ }
            }
        }
        return players.sort((a, b) => b.lastSeen - a.lastSeen);
    }

    /** Retourne tous les comptes (admin uniquement) */
    function getAllAccounts() {
        return getAccounts();
    }

    // ═══════════════════════════════════════════════════════
    // SANCTIONS ADMIN
    // ═══════════════════════════════════════════════════════

    /**
     * Bannit un joueur.
     * @param {string} username - Cible
     * @param {number} durationMs - 0 = définitif, sinon durée en ms
     */
    function banPlayer(username, durationMs = 0) {
        const accounts = getAccounts();
        if (!accounts[username] || username === ADMIN_USERNAME) return false;

        accounts[username].banned    = true;
        accounts[username].banExpiry = durationMs > 0 ? Date.now() + durationMs : null;
        saveAccounts(accounts);

        addAdminLog('BAN', username, durationMs > 0 ? formatDuration(durationMs) : 'définitif');
        // Force la déconnexion via broadcast
        broadcast({ type: 'kick', target: username, reason: '🚫 Vous avez été banni.' });
        return true;
    }

    function unbanPlayer(username) {
        const accounts = getAccounts();
        if (!accounts[username]) return false;
        accounts[username].banned    = false;
        accounts[username].banExpiry = null;
        saveAccounts(accounts);
        addAdminLog('UNBAN', username, '');
        return true;
    }

    function kickPlayer(username) {
        broadcast({ type: 'kick', target: username, reason: '⚡ Vous avez été expulsé par l\'administrateur.' });
        addAdminLog('KICK', username, '');
        return true;
    }

    function resetPlayerSave(username) {
        localStorage.removeItem(`mineria_save_${username}`);
        addAdminLog('RESET', username, 'Sauvegarde effacée');
        return true;
    }

    // ═══════════════════════════════════════════════════════
    // BROADCAST (diffusion admin vers tous les onglets)
    // Fonctionne via l'événement "storage" du localStorage
    // (déclenché dans tous les AUTRES onglets ouverts).
    // Pour l'onglet actif, script.js applique l'event directement.
    // ═══════════════════════════════════════════════════════

    function broadcast(data) {
        localStorage.setItem(BROADCAST_KEY, JSON.stringify({
            ...data,
            timestamp: Date.now(),
        }));
    }

    // ═══════════════════════════════════════════════════════
    // JOURNAL ADMIN
    // ═══════════════════════════════════════════════════════

    function addAdminLog(action, target, detail = '') {
        const user = getCurrentUser();
        const logs = getAdminLogs();
        logs.unshift({
            time:   Date.now(),
            action,
            target,
            detail,
            by:     user?.username || 'system',
        });
        if (logs.length > 300) logs.splice(300); // Garde les 300 dernières entrées
        localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    }

    function getAdminLogs() {
        try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
        catch (e) { return []; }
    }

    // ═══════════════════════════════════════════════════════
    // UTILITAIRES INTERNES
    // ═══════════════════════════════════════════════════════

    function formatDuration(ms) {
        const d = Math.floor(ms / 86400000);
        const h = Math.floor((ms % 86400000) / 3600000);
        if (d > 0) return `${d} jour(s)`;
        if (h > 0) return `${h} heure(s)`;
        return `${Math.floor(ms / 60000)} min`;
    }

    // ═══════════════════════════════════════════════════════
    // API PUBLIQUE
    // ═══════════════════════════════════════════════════════

    return {
        initAdminAccount,
        register,
        login,
        logout,
        getCurrentUser,
        isAdmin,
        updateOnlineStatus,
        getOnlinePlayers,
        getAllAccounts,
        banPlayer,
        unbanPlayer,
        kickPlayer,
        resetPlayerSave,
        broadcast,
        addAdminLog,
        getAdminLogs,
        BROADCAST_KEY,
        ONLINE_PREFIX,
    };

})();