const jwt = require('jsonwebtoken');
const config = require('../config/config');

// 🔑 Vérification de l'API Key
const verifyApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    // Si l'API Key est requise dans la config
    if (config.REQUIRE_API_KEY) {
        if (!apiKey || apiKey !== config.API_KEY) {
            return res.status(401).json({
                success: false,
                error: 'API Key invalide ou manquante'
            });
        }
    }
    
    next();
};

// 🎫 Vérification du JWT Token (pour Roblox)
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Token d\'authentification requis'
        });
    }
    
    try {
        const decoded = jwt.verify(token, config.JWT_SECRET);
        req.server = decoded; // Ajoute les infos du serveur à la requête
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            error: 'Token invalide ou expiré'
        });
    }
};

// 🔓 Vérification optionnelle du token
const optionalToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, config.JWT_SECRET);
            req.server = decoded;
        } catch (error) {
            // Token invalide mais on continue quand même
            console.log('Token invalide ignoré:', error.message);
        }
    }
    
    next();
};

module.exports = {
    verifyApiKey,
    verifyToken,
    optionalToken
};
