const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const { verifyApiKey } = require('../middleware/auth');

//==============================================
// 🔐 AUTHENTIFICATION DES SERVEURS ROBLOX
//==============================================

// Connexion d'un serveur Roblox
router.post('/connect', verifyApiKey, (req, res) => {
    try {
        const { game_id, job_id, server_name } = req.body;
        
        // Validation
        if (!game_id || !job_id) {
            return res.status(400).json({
                success: false,
                error: 'game_id et job_id sont requis'
            });
        }
        
        // Créer un serveur dans la base
        const serverId = uuidv4();
        const serverData = {
            id: serverId,
            game_id,
            job_id,
            server_name: server_name || 'Unknown',
            connected_at: Date.now(),
            last_heartbeat: Date.now(),
            status: 'active'
        };
        
        global.db.servers.set(job_id, serverData);
        
        // Générer un JWT token
        const token = jwt.sign(
            {
                server_id: serverId,
                game_id,
                job_id
            },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRATION }
        );
        
        console.log(`✅ Nouveau serveur connecté: ${job_id} (${server_name})`);
        
        res.json({
            success: true,
            token,
            server: serverData,
            message: 'Serveur authentifié avec succès'
        });
        
    } catch (error) {
        console.error('Erreur d\'authentification:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'authentification'
        });
    }
});

// Déconnexion d'un serveur
router.post('/disconnect', verifyApiKey, (req, res) => {
    const { job_id } = req.body;
    
    if (global.db.servers.has(job_id)) {
        global.db.servers.delete(job_id);
        
        res.json({
            success: true,
            message: 'Serveur déconnecté'
        });
    } else {
        res.status(404).json({
            success: false,
            error: 'Serveur non trouvé'
        });
    }
});

// Liste des serveurs connectés
router.get('/servers', verifyApiKey, (req, res) => {
    const servers = Array.from(global.db.servers.values());
    
    res.json({
        success: true,
        count: servers.length,
        servers: servers.map(s => ({
            ...s,
            uptime: Date.now() - s.connected_at,
            last_seen: Date.now() - s.last_heartbeat
        }))
    });
});

module.exports = router;
