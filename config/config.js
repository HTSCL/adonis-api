require('dotenv').config();

module.exports = {
    // 🌐 Configuration du serveur
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // 🔑 Sécurité
    API_KEY: process.env.API_KEY || 'CHANGEZ_MOI_EN_PRODUCTION',
    JWT_SECRET: process.env.JWT_SECRET || 'CHANGEZ_MOI_AUSSI',
    REQUIRE_API_KEY: process.env.REQUIRE_API_KEY === 'true',
    
    // 🔐 JWT
    JWT_EXPIRATION: '24h',
    
    // ⏱️ Rate Limiting
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 100, // 100 requêtes max
    
    // 🌍 CORS
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '*',
    
    // ⏲️ Timeouts
    SERVER_TIMEOUT: 30000, // 30 secondes
    HEARTBEAT_TIMEOUT: 60000, // 1 minute
    
    // 📝 Commandes
    MAX_PENDING_COMMANDS: 100,
    COMMAND_EXPIRATION: 3600000, // 1 heure
};
