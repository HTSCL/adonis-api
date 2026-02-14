/**
 * 💾 Base de données en mémoire
 * Contient les models Command et Log intégrés
 */

const { v4: uuidv4 } = require('uuid');

//==============================================
// 📦 MODEL: Command
//==============================================

class Command {
    constructor(data) {
        this.id = data.id || uuidv4();
        this.command = data.command;
        this.executor = data.executor || 'Server';
        this.target = data.target || null;
        this.args = data.args || [];
        this.server_id = data.server_id || null;
        this.priority = data.priority || 1;
        this.executed = data.executed || false;
        this.success = data.success || null;
        this.result = data.result || null;
        this.metadata = data.metadata || {};
        this.created_at = data.created_at || Date.now();
        this.executed_at = data.executed_at || null;
    }

    // Marquer comme exécutée
    markAsExecuted(success, result, metadata = {}) {
        this.executed = true;
        this.executed_at = Date.now();
        this.success = success;
        this.result = result;
        this.metadata = { ...this.metadata, ...metadata };
        return this;
    }

    // Vérifier si expirée
    isExpired(expirationTime = 3600000) {
        return Date.now() - this.created_at > expirationTime;
    }

    // Convertir en JSON
    toJSON() {
        return {
            id: this.id,
            command: this.command,
            executor: this.executor,
            target: this.target,
            args: this.args,
            server_id: this.server_id,
            priority: this.priority,
            executed: this.executed,
            success: this.success,
            result: this.result,
            created_at: this.created_at,
            executed_at: this.executed_at
        };
    }

    // Valider les données
    static validate(data) {
        const errors = [];
        if (!data.command) errors.push('La commande est requise');
        if (data.command && data.command.length > 100) errors.push('Commande trop longue');
        return { isValid: errors.length === 0, errors };
    }
}

//==============================================
// 📄 MODEL: Log
//==============================================

class Log {
    constructor(data) {
        this.id = data.id || null;
        this.type = data.type || 'info';
        this.message = data.message || '';
        this.data = data.data || {};
        this.server_id = data.server_id || null;
        this.timestamp = data.timestamp || Date.now();
        this.created_at = data.created_at || new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            message: this.message,
            data: this.data,
            server_id: this.server_id,
            timestamp: this.timestamp,
            created_at: this.created_at
        };
    }

    static validate(data) {
        const errors = [];
        if (!data.message) errors.push('Le message est requis');
        return { isValid: errors.length === 0, errors };
    }
}

//==============================================
// 💾 DATABASE
//==============================================

class Database {
    constructor() {
        this.servers = new Map();
        this.commands = new Map();
        this.logs = [];
        this.executedCommands = new Set();
        this.stats = {
            totalCommands: 0,
            successfulCommands: 0,
            failedCommands: 0,
            totalLogs: 0,
            connectedServers: 0
        };
    }

    //==========================================
    // 🖥️ GESTION DES SERVEURS
    //==========================================

    addServer(serverData) {
        const server = {
            ...serverData,
            connected_at: Date.now(),
            last_heartbeat: Date.now(),
            status: 'active'
        };
        this.servers.set(serverData.job_id, server);
        this.stats.connectedServers = this.servers.size;
        return server;
    }

    getServer(job_id) {
        return this.servers.get(job_id);
    }

    updateServerHeartbeat(job_id, data = {}) {
        const server = this.servers.get(job_id);
        if (server) {
            server.last_heartbeat = Date.now();
            server.players_online = data.players_online || 0;
            server.status = data.status || 'running';
        }
        return server;
    }

    removeServer(job_id) {
        const removed = this.servers.delete(job_id);
        this.stats.connectedServers = this.servers.size;
        return removed;
    }

    getActiveServers() {
        const now = Date.now();
        const timeout = 5 * 60 * 1000; // 5 minutes
        return Array.from(this.servers.values()).filter(s => now - s.last_heartbeat < timeout);
    }

    //==========================================
    // ⚡ GESTION DES COMMANDES
    //==========================================

    addCommand(commandData) {
        const command = new Command(commandData);
        const validation = Command.validate(commandData);
        
        if (!validation.isValid) {
            throw new Error('Commande invalide: ' + validation.errors.join(', '));
        }

        this.commands.set(command.id, command);
        this.stats.totalCommands++;
        return command;
    }

    getCommand(id) {
        return this.commands.get(id);
    }

    getPendingCommands(server_id = null) {
        return Array.from(this.commands.values())
            .filter(cmd => {
                if (cmd.executed) return false;
                if (server_id && cmd.server_id && cmd.server_id !== server_id) return false;
                if (cmd.isExpired()) return false;
                return true;
            })
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    executeCommand(id, success, result, metadata = {}) {
        const command = this.commands.get(id);
        if (command) {
            command.markAsExecuted(success, result, metadata);
            this.executedCommands.add(id);
            
            if (success) {
                this.stats.successfulCommands++;
            } else {
                this.stats.failedCommands++;
            }
        }
        return command;
    }

    cleanupExpiredCommands(maxAge = 3600000) {
        const now = Date.now();
        let deletedCount = 0;

        for (const [id, command] of this.commands.entries()) {
            if (command.executed && now - command.executed_at > maxAge) {
                this.commands.delete(id);
                deletedCount++;
            } else if (!command.executed && command.isExpired(maxAge)) {
                this.commands.delete(id);
                deletedCount++;
            }
        }

        return deletedCount;
    }

    getCommandStats() {
        const allCommands = Array.from(this.commands.values());
        const byType = {};

        allCommands.forEach(cmd => {
            if (!byType[cmd.command]) {
                byType[cmd.command] = { total: 0, executed: 0, successful: 0, failed: 0, pending: 0 };
            }
            byType[cmd.command].total++;
            if (cmd.executed) {
                byType[cmd.command].executed++;
                if (cmd.success) byType[cmd.command].successful++;
                else byType[cmd.command].failed++;
            } else {
                byType[cmd.command].pending++;
            }
        });

        return {
            ...this.stats,
            totalPending: allCommands.filter(c => !c.executed).length,
            byType
        };
    }

    //==========================================
    // 📋 GESTION DES LOGS
    //==========================================

    addLog(logData) {
        const log = new Log({ id: this.logs.length + 1, ...logData });
        const validation = Log.validate(logData);
        
        if (!validation.isValid) {
            console.warn('Log invalide:', validation.errors);
            return null;
        }

        this.logs.push(log);
        this.stats.totalLogs = this.logs.length;

        // Limiter à 10000 logs
        if (this.logs.length > 10000) {
            this.logs = this.logs.slice(-10000);
        }

        return log;
    }

    getLogs(filters = {}) {
        let logs = [...this.logs];

        if (filters.type) logs = logs.filter(log => log.type === filters.type);
        if (filters.server_id) logs = logs.filter(log => log.server_id === filters.server_id);
        if (filters.since) logs = logs.filter(log => log.timestamp >= filters.since);

        const limit = filters.limit || 100;
        logs = logs.slice(-limit);

        return logs.reverse(); // Plus récents en premier
    }

    cleanupOldLogs(retentionDays = 7) {
        const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        const initialCount = this.logs.length;
        
        this.logs = this.logs.filter(log => log.timestamp > cutoff);
        
        const deletedCount = initialCount - this.logs.length;
        this.stats.totalLogs = this.logs.length;
        
        return deletedCount;
    }

    //==========================================
    // 📊 STATISTIQUES GLOBALES
    //==========================================

    getGlobalStats() {
        return {
            servers: {
                total: this.servers.size,
                active: this.getActiveServers().length
            },
            commands: this.getCommandStats(),
            logs: { total: this.logs.length },
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };
    }

    //==========================================
    // 🧹 NETTOYAGE
    //==========================================

    cleanup() {
        const commandsDeleted = this.cleanupExpiredCommands();
        const logsDeleted = this.cleanupOldLogs();
        return { commands_deleted: commandsDeleted, logs_deleted: logsDeleted };
    }
}

// Export singleton
const db = new Database();
module.exports = db;
