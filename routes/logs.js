const express = require('express');
const router = express.Router();
const { verifyApiKey, verifyToken } = require('../middleware/auth');

//==============================================
// 📋 GESTION DES LOGS
//==============================================

// Recevoir un log depuis Roblox
router.post('/logs', verifyToken, (req, res) => {
    try {
        const { type, message, data } = req.body;
        const { job_id } = req.server;
        
        const log = {
            type: type || 'info',
            message: message || '',
            data: data || {},
            server_id: job_id,
            timestamp: Date.now(),
            created_at: new Date().toISOString()
        };
        
        global.db.addLog(log);
        
        console.log(`📋 [${type}] ${message}`);
        
        res.json({
            success: true,
            message: 'Log enregistré'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'enregistrement du log'
        });
    }
});

// Récupérer les logs (Panel Web ou API externe)
router.get('/logs', verifyApiKey, (req, res) => {
    try {
        const { 
            limit = 100,    // Nombre de logs à retourner
            type,           // Filtrer par type (info, error, warning, etc.)
            server_id       // Filtrer par serveur
        } = req.query;
        
        const logs = global.db.getLogs({
            limit: parseInt(limit),
            type,
            server_id
        });
        
        res.json({
            success: true,
            count: logs.length,
            logs: logs
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des logs'
        });
    }
});

// Supprimer les anciens logs
router.delete('/logs/cleanup', verifyApiKey, (req, res) => {
    const { days = 7 } = req.body;
    
    const deletedCount = global.db.cleanupOldLogs(parseInt(days));
    
    res.json({
        success: true,
        message: `${deletedCount} logs supprimés`,
        remaining: global.db.logs.length
    });
});

module.exports = router;
