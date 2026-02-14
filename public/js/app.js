/* ============================================ */
/* CONFIGURATION */
/* ============================================ */

// URL de l'API (automatiquement l'URL actuelle)
const API_URL = window.location.origin;

// Clé API (sauvegardée localement)
let API_KEY = '';

// Intervalle de mise à jour
let updateInterval;

/* ============================================ */
/* AUTHENTIFICATION */
/* ============================================ */

// Fonction de connexion
function login() {
    const apiKey = document.getElementById('apiKey').value;
    
    // Validation
    if (!apiKey) {
        showError('Veuillez entrer une clé API');
        return;
    }
    
    API_KEY = apiKey;
    localStorage.setItem('adonis_api_key', apiKey);
    
    // Test de la connexion à l'API
    fetch(`${API_URL}/`, {
        headers: {
            'X-API-Key': API_KEY
        }
    })
    .then(response => {
        if (response.ok) {
            showMainPanel();
        } else {
            showError('Clé API invalide');
        }
    })
    .catch(error => {
        showError('Erreur de connexion: ' + error.message);
    });
}

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('adonis_api_key');
    API_KEY = '';
    clearInterval(updateInterval);
    showLoginScreen();
}

// Afficher l'écran de connexion
function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainPanel').classList.remove('active');
}

// Afficher le panel principal
function showMainPanel() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainPanel').classList.add('active');
    
    // Charger les données
    loadStats();
    loadLogs();
    loadHistory();
    
    // Mise à jour automatique toutes les 5 secondes
    updateInterval = setInterval(() => {
        loadStats();
        loadLogs();
    }, 5000);
}

// Afficher un message d'erreur sur la page de login
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

/* ============================================ */
/* CHARGEMENT DES DONNÉES */
/* ============================================ */

// Charger les statistiques
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Mise à jour des statistiques
            document.getElementById('statsServers').textContent = data.stats.servers.active;
            document.getElementById('statsCommands').textContent = data.stats.commands.successfulCommands;
            document.getElementById('statsPending').textContent = data.stats.commands.totalPending;
            document.getElementById('statsLogs').textContent = data.stats.logs.total;
            document.getElementById('serverCount').textContent = `${data.stats.servers.active} serveur${data.stats.servers.active > 1 ? 's' : ''}`;
        }
    } catch (error) {
        console.error('Erreur chargement stats:', error);
    }
}

// Charger les logs
async function loadLogs() {
    try {
        const response = await fetch(`${API_URL}/adonis/logs?limit=50`, {
            headers: {
                'X-API-Key': API_KEY
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.logs.length > 0) {
            const logsContainer = document.getElementById('logsContainer');
            logsContainer.innerHTML = '';
            
            data.logs.forEach(log => {
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                
                const time = new Date(log.timestamp).toLocaleTimeString();
                const type = log.type.toLowerCase();
                
                entry.innerHTML = `
                    <span class="log-time">${time}</span>
                    <span class="log-type ${type}">[${log.type.toUpperCase()}]</span>
                    <span>${log.message}</span>
                `;
                
                logsContainer.appendChild(entry);
            });
        }
    } catch (error) {
        console.error('Erreur chargement logs:', error);
    }
}

/* ============================================ */
/* EXÉCUTION DES COMMANDES */
/* ============================================ */

// Exécuter une commande sur un joueur
async function executePlayerCommand() {
    const target = document.getElementById('targetPlayer').value.trim();
    const command = document.getElementById('commandSelect').value;
    const args = document.getElementById('commandArgs').value.trim();
    
    // Validation
    if (!target) {
        showNotification('Veuillez entrer un nom de joueur', 'error');
        return;
    }
    
    if (!command) {
        showNotification('Veuillez sélectionner une commande', 'error');
        return;
    }
    
    // Construire les données de la commande
    const commandData = {
        command: command,
        target: target,
        args: args ? [args] : [],
        priority: 5
    };
    
    await sendCommand(commandData);
}

// Exécuter une commande personnalisée
async function executeCustomCommand() {
    const customCmd = document.getElementById('customCommand').value.trim();
    
    if (!customCmd) {
        showNotification('Veuillez entrer une commande', 'error');
        return;
    }
    
    // Parser la commande
    // Exemples: "ff lucasssss_2" ou ":kill PlayerName" ou "ban Player raison"
    const parts = customCmd.split(' ');
    const command = parts[0].replace(/^[:;]/, ''); // Enlever le préfixe si présent
    const target = parts[1] || null;
    const args = parts.slice(2);
    
    const commandData = {
        command: command,
        target: target,
        args: args,
        priority: 5
    };
    
    await sendCommand(commandData);
}

// Envoyer une commande à l'API
async function sendCommand(commandData) {
    try {
        const response = await fetch(`${API_URL}/adonis/commands`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify(commandData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Commande "${commandData.command}" envoyée avec succès`, 'success');
            addToHistory(commandData);
            
            // Réinitialiser les champs
            document.getElementById('targetPlayer').value = '';
            document.getElementById('commandArgs').value = '';
            document.getElementById('commandSelect').value = '';
            document.getElementById('customCommand').value = '';
            
            // Recharger les stats
            loadStats();
        } else {
            showNotification('Erreur: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Erreur: ' + error.message, 'error');
    }
}

/* ============================================ */
/* MODAL POUR ACTIONS RAPIDES */
/* ============================================ */

let currentModalCommand = '';

// Afficher le modal pour une commande
function showCommandModal(command) {
    currentModalCommand = command;
    const modal = document.getElementById('commandModal');
    const title = document.getElementById('modalTitle');
    
    // Réinitialiser tous les groupes
    document.getElementById('messageGroup').style.display = 'none';
    document.getElementById('musicGroup').style.display = 'none';
    document.getElementById('shutdownGroup').style.display = 'none';
    
    // Réinitialiser les valeurs
    document.getElementById('modalMessage').value = '';
    document.getElementById('modalMusicId').value = '';
    
    // Afficher le bon groupe selon la commande
    switch(command) {
        case 'sm':
            title.textContent = '📢 Message Système';
            document.getElementById('messageGroup').style.display = 'block';
            break;
        case 'hint':
            title.textContent = '💬 Message Hint';
            document.getElementById('messageGroup').style.display = 'block';
            break;
        case 'music':
            title.textContent = '🎵 Jouer Musique';
            document.getElementById('musicGroup').style.display = 'block';
            break;
        case 'shutdown':
            title.textContent = '⚠️ Shutdown Serveur';
            document.getElementById('shutdownGroup').style.display = 'block';
            break;
    }
    
    modal.classList.add('active');
}

// Fermer le modal
function closeModal() {
    document.getElementById('commandModal').classList.remove('active');
}

// Exécuter la commande depuis le modal
async function executeModalCommand() {
    let commandData = {
        command: currentModalCommand,
        priority: 10
    };
    
    switch(currentModalCommand) {
        case 'sm':
        case 'hint':
            const message = document.getElementById('modalMessage').value.trim();
            if (!message) {
                showNotification('Veuillez entrer un message', 'error');
                return;
            }
            commandData.args = [message];
            break;
            
        case 'music':
            const musicId = document.getElementById('modalMusicId').value.trim();
            if (!musicId) {
                showNotification('Veuillez entrer un ID audio', 'error');
                return;
            }
            commandData.args = [musicId];
            break;
            
        case 'shutdown':
            // Pas d'args nécessaires
            break;
    }
    
    closeModal();
    await sendCommand(commandData);
}

/* ============================================ */
/* HISTORIQUE DES COMMANDES */
/* ============================================ */

let commandHistory = [];

// Ajouter une commande à l'historique
function addToHistory(commandData) {
    const historyEntry = {
        time: new Date().toLocaleTimeString(),
        command: commandData.command,
        target: commandData.target || '-',
        status: 'Envoyée'
    };
    
    commandHistory.unshift(historyEntry);
    
    // Garder seulement les 20 dernières
    if (commandHistory.length > 20) {
        commandHistory = commandHistory.slice(0, 20);
    }
    
    updateHistoryTable();
}

// Mettre à jour le tableau d'historique
function updateHistoryTable() {
    const tbody = document.getElementById('historyBody');
    
    if (commandHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">Aucune commande exécutée</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    commandHistory.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.time}</td>
            <td><strong>${entry.command}</strong></td>
            <td>${entry.target}</td>
            <td><span style="color: var(--success);">✓ ${entry.status}</span></td>
        `;
        tbody.appendChild(row);
    });
}

// Charger l'historique
function loadHistory() {
    updateHistoryTable();
}

/* ============================================ */
/* NOTIFICATIONS */
/* ============================================ */

// Afficher une notification
function showNotification(message, type = 'success') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <div>${message}</div>
    `;
    
    container.appendChild(notification);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/* ============================================ */
/* INITIALISATION */
/* ============================================ */

// Auto-login si clé API sauvegardée
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('adonis_api_key');
    
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
        login();
    }
});

// Permettre de soumettre le formulaire avec Entrée
document.addEventListener('DOMContentLoaded', () => {
    // Login avec Entrée
    document.getElementById('apiKey')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    // Commande personnalisée avec Entrée
    document.getElementById('customCommand')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            executeCustomCommand();
        }
    });
    
    // Fermer le modal avec Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});
