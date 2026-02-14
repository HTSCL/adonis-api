/* ============================================ */
/* CONFIGURATION */
/* ============================================ */

const API_URL = window.location.origin;
let API_KEY = '';
let updateInterval;

console.log('🔧 Panel chargé - API URL:', API_URL);

/* ============================================ */
/* AUTHENTIFICATION */
/* ============================================ */

function login() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    
    if (!apiKey) {
        showError('Veuillez entrer une clé API');
        return;
    }
    
    console.log('🔑 Tentative de connexion avec clé:', apiKey.substring(0, 10) + '...');
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connexion...';
    
    API_KEY = apiKey;
    
    // Test avec /stats plutôt que /
    fetch(`${API_URL}/stats`, {
        method: 'GET',
        headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        console.log('📡 Réponse reçue:', response.status);
        if (response.ok) {
            return response.json();
        } else {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
    })
    .then(data => {
        console.log('✅ Connexion réussie:', data);
        localStorage.setItem('adonis_api_key', apiKey);
        showMainPanel();
    })
    .catch(error => {
        console.error('❌ Erreur de connexion:', error);
        showError('Erreur: ' + error.message);
        API_KEY = '';
    })
    .finally(() => {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
    });
}

function logout() {
    localStorage.removeItem('adonis_api_key');
    API_KEY = '';
    clearInterval(updateInterval);
    showLoginScreen();
}

function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainPanel').classList.remove('active');
}

function showMainPanel() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainPanel').classList.add('active');
    
    loadStats();
    loadLogs();
    loadHistory();
    
    updateInterval = setInterval(() => {
        loadStats();
        loadLogs();
    }, 5000);
}

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

async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`, {
            headers: { 'X-API-Key': API_KEY }
        });
        
        const data = await response.json();
        
        if (data.success) {
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

async function loadLogs() {
    try {
        const response = await fetch(`${API_URL}/adonis/logs?limit=50`, {
            headers: { 'X-API-Key': API_KEY }
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

async function executePlayerCommand() {
    const target = document.getElementById('targetPlayer').value.trim();
    const command = document.getElementById('commandSelect').value;
    const args = document.getElementById('commandArgs').value.trim();
    
    if (!target) {
        showNotification('Veuillez entrer un nom de joueur', 'error');
        return;
    }
    
    if (!command) {
        showNotification('Veuillez sélectionner une commande', 'error');
        return;
    }
    
    const commandData = {
        command: command,
        target: target,
        args: args ? [args] : [],
        priority: 5
    };
    
    await sendCommand(commandData);
}

async function executeCustomCommand() {
    const customCmd = document.getElementById('customCommand').value.trim();
    
    if (!customCmd) {
        showNotification('Veuillez entrer une commande', 'error');
        return;
    }
    
    const parts = customCmd.split(' ');
    const command = parts[0].replace(/^[:;]/, '');
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

async function sendCommand(commandData) {
    try {
        console.log('📤 Envoi commande:', commandData);
        
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
            
            document.getElementById('targetPlayer').value = '';
            document.getElementById('commandArgs').value = '';
            document.getElementById('commandSelect').value = '';
            document.getElementById('customCommand').value = '';
            
            loadStats();
        } else {
            showNotification('Erreur: ' + data.error, 'error');
        }
    } catch (error) {
        showNotification('Erreur: ' + error.message, 'error');
    }
}

/* ============================================ */
/* MODAL */
/* ============================================ */

let currentModalCommand = '';

function showCommandModal(command) {
    currentModalCommand = command;
    const modal = document.getElementById('commandModal');
    const title = document.getElementById('modalTitle');
    
    document.getElementById('messageGroup').style.display = 'none';
    document.getElementById('musicGroup').style.display = 'none';
    document.getElementById('shutdownGroup').style.display = 'none';
    
    document.getElementById('modalMessage').value = '';
    document.getElementById('modalMusicId').value = '';
    
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

function closeModal() {
    document.getElementById('commandModal').classList.remove('active');
}

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
            break;
    }
    
    closeModal();
    await sendCommand(commandData);
}

/* ============================================ */
/* HISTORIQUE */
/* ============================================ */

let commandHistory = [];

function addToHistory(commandData) {
    const historyEntry = {
        time: new Date().toLocaleTimeString(),
        command: commandData.command,
        target: commandData.target || '-',
        status: 'Envoyée'
    };
    
    commandHistory.unshift(historyEntry);
    
    if (commandHistory.length > 20) {
        commandHistory = commandHistory.slice(0, 20);
    }
    
    updateHistoryTable();
}

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

function loadHistory() {
    updateHistoryTable();
}

/* ============================================ */
/* NOTIFICATIONS */
/* ============================================ */

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
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

/* ============================================ */
/* INITIALISATION */
/* ============================================ */

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Panel initialisé');
    
    const savedKey = localStorage.getItem('adonis_api_key');
    
    if (savedKey) {
        console.log('🔑 Clé sauvegardée trouvée');
        document.getElementById('apiKey').value = savedKey;
        login();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('apiKey')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
    
    document.getElementById('customCommand')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            executeCustomCommand();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});
