const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { verifyApiKey, verifyToken } = require('../middleware/auth');

//==============================================
// ⚡ GESTION DES COMMANDES
//==============================================

// Récupérer les commandes en attente (appelé par Roblox)
router.get('/commands', verifyToken, (req, res) => {
    try {
        const { job_id } = req.server;
        
        // Filtrer les commandes pour ce serveur uniquement
        const commands = global.db.getPendingCommands(job_id);
        
        res.json({
            success: true,
            count: commands.length,
            commands: commands.map(cmd => ({
                id: cmd.id,
                command: cmd.command,
                executor: cmd.executor || 'Server',
                target: cmd.target,
                args: cmd.args || [],
                executed: cmd.executed,
                priority: cmd.priority || 1,
                created_at: cmd.created_at
            }))
        });
        
    } catch (error) {
        console.error('Erreur récupération commandes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des commandes'
        });
    }
});

// Créer une nouvelle commande (API externe ou Panel Web)
router.post('/commands', verifyApiKey, (req, res) => {
    try {
        const { 
            command,      // Nom de la commande (ex: "ff", "kill", "ban")
            executor,     // Qui exécute (ex: "Server", "lucasssss_2")
            target,       // Cible (ex: "PlayerName")
            args,         // Arguments (ex: ["raison du ban"])
            server_id,    // ID du serveur (optionnel)
            priority      // Priorité (1-10)
        } = req.body;
        
        // Validation
        if (!command) {
            return res.status(400).json({
                success: false,
                error: 'La commande est requise'
            });
        }
        
        // Créer la commande
        const commandData = {
            command: command.replace(/^[:;]/, ''), // Enlever le préfixe si présent
            executor: executor || 'Server',
            target: target || null,
            args: args || [],
            server_id: server_id || null,
            priority: priority || 1,
        };
        
        const newCommand = global.db.addCommand(commandData);
        
        console.log(`📝 Nouvelle commande créée: ${command} (${newCommand.id})`);
        
        res.status(201).json({
            success: true,
            command: newCommand.toJSON(),
            message: 'Commande créée avec succès'
        });
        
    } catch (error) {
        console.error('Erreur création commande:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de la création de la commande'
        });
    }
});

// Créer plusieurs commandes en batch
router.post('/commands/batch', verifyApiKey, (req, res) => {
    try {
        const { commands } = req.body;
        
        if (!Array.isArray(commands)) {
            return res.status(400).json({
                success: false,
                error: 'Un tableau de commandes est requis'
            });
        }
        
        const created = [];
        
        for (const cmd of commands) {
            const commandData = {
                command: cmd.command.replace(/^[:;]/, ''),
                executor: cmd.executor || 'Server',
                target: cmd.target || null,
                args: cmd.args || [],
                server_id: cmd.server_id || null,
                priority: cmd.priority || 1,
            };
            
            const newCommand = global.db.addCommand(commandData);
            created.push(newCommand.toJSON());
        }
        
        res.status(201).json({
            success: true,
            count: created.length,
            commands: created
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message || 'Erreur lors de la création des commandes'
        });
    }
});

// Recevoir le résultat d'une commande (appelé par Roblox)
router.post('/results', verifyToken, (req, res) => {
    try {
        const { command_id, success, message, metadata } = req.body;
        
        if (!command_id) {
            return res.status(400).json({
                success: false,
                error: 'command_id est requis'
            });
        }
        
        const command = global.db.executeCommand(command_id, success, message, metadata);
        
        if (command) {
            console.log(`✅ Résultat reçu pour ${command_id}: ${success ? 'SUCCESS' : 'FAILED'}`);
        }
        
        res.json({
            success: true,
            message: 'Résultat enregistré'
        });
        
    } catch (error) {
        console.error('Erreur résultat:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'enregistrement du résultat'
        });
    }
});

// Heartbeat du serveur Roblox (garde la connexion active)
router.post('/heartbeat', verifyToken, (req, res) => {
    try {
        const { job_id } = req.server;
        const { players_online, status } = req.body;
        
        const server = global.db.updateServerHeartbeat(job_id, {
            players_online,
            status
        });
        
        res.json({
            success: true,
            message: 'Heartbeat enregistré',
            server_time: Date.now()
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur heartbeat'
        });
    }
});

// Statistiques des commandes
router.get('/commands/stats', verifyApiKey, (req, res) => {
    const stats = global.db.getCommandStats();
    
    res.json({
        success: true,
        stats
    });
});

module.exports = router;
