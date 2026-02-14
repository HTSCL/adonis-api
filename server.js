const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Charger les variables d'environnement
dotenv.config();

// Import des routes
const authRoutes = require('./routes/auth');
const commandRoutes = require('./routes/commands');
const logRoutes = require('./routes/logs');

// Import de la config
const config = require('./config/config');

// Import de la base de données
const db = require('./utils/database');

// Initialisation de l'app
const app = express();
const PORT = process.env.PORT || 3000;

// Rendre la DB accessible globalement
global.db = db;

//==============================================
// MIDDLEWARES
//==============================================

// Sécurité
app.use(helmet());

// CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques (Panel Web)
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limite de 100 requêtes par IP
    message: {
        success: false,
        error: 'Trop de requêtes, veuillez réessayer plus tard.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// Logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
    
    // Logger dans la DB (sauf pour health et favicon)
    if (req.path !== '/health' && req.path !== '/favicon.ico' && req.path !== '/') {
        db.addLog({
            type: 'api_request',
            message: `${req.method} ${req.path}`,
            data: {
                ip: req.ip,
                user_agent: req.get('user-agent'),
                method: req.method,
                path: req.path
            }
        });
    }
    
    next();
});

//==============================================
// ROUTES PRINCIPALES
//==============================================

// Route de santé / page d'accueil
app.get('/', (req, res) => {
    const stats = db.getGlobalStats();
    
    res.json({
        success: true,
        message: 'API Adonis opérationnelle',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: {
                connect: 'POST /auth/connect',
                disconnect: 'POST /auth/disconnect',
                servers: 'GET /auth/servers'
            },
            commands: {
                get: 'GET /adonis/commands',
                create: 'POST /adonis/commands',
                batch: 'POST /adonis/commands/batch',
                stats: 'GET /adonis/commands/stats'
            },
            results: 'POST /adonis/results',
            logs: {
                get: 'GET /adonis/logs',
                create: 'POST /adonis/logs',
                cleanup: 'DELETE /adonis/logs/cleanup'
            },
            heartbeat: 'POST /adonis/heartbeat',
            stats: 'GET /stats',
            panel: 'GET /panel (Interface Web)'
        },
        stats: {
            servers: stats.servers,
            commands: {
                total: stats.commands.totalCommands,
                pending: stats.commands.totalPending,
                successful: stats.commands.successfulCommands,
                failed: stats.commands.failedCommands
            },
            logs: stats.logs.total,
            uptime: Math.floor(stats.uptime)
        }
    });
});

// Health check pour Render
app.get('/health', (req, res) => {
    const stats = db.getGlobalStats();
    
    res.status(200).json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: Date.now(),
        servers: {
            total: stats.servers.total,
            active: stats.servers.active
        },
        memory: {
            used: Math.round(stats.memory.heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(stats.memory.heapTotal / 1024 / 1024) + ' MB'
        }
    });
});

// Route pour le panel web
app.get('/panel', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Route de statistiques détaillées
app.get('/stats', (req, res) => {
    try {
        const stats = db.getGlobalStats();
        
        res.json({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques'
        });
    }
});

// Route de nettoyage manuel (protégée par API Key)
app.post('/cleanup', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    
    if (config.REQUIRE_API_KEY && apiKey !== config.API_KEY) {
        return res.status(401).json({
            success: false,
            error: 'API Key invalide'
        });
    }
    
    try {
        const result = db.cleanup();
        
        res.json({
            success: true,
            message: 'Nettoyage effectué',
            deleted: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Erreur lors du nettoyage'
        });
    }
});

// Routes API
app.use('/auth', authRoutes);
app.use('/adonis', commandRoutes);
app.use('/adonis', logRoutes);

//==============================================
// GESTION DES ERREURS
//==============================================

// Route 404
app.use((req, res) => {
    db.addLog({
        type: 'error',
        message: `Route non trouvée: ${req.method} ${req.path}`,
        data: {
            method: req.method,
            path: req.path,
            ip: req.ip
        }
    });
    
    res.status(404).json({
        success: false,
        error: 'Route non trouvée',
        path: req.path,
        available_endpoints: 'Voir GET /'
    });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    
    // Logger l'erreur
    db.addLog({
        type: 'error',
        message: err.message || 'Erreur serveur interne',
        data: {
            stack: err.stack,
            path: req.path,
            method: req.method
        }
    });
    
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Erreur serveur interne',
        ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack,
            details: err
        })
    });
});

//==============================================
// TÂCHES DE MAINTENANCE AUTOMATIQUES
//==============================================

// Nettoyage automatique toutes les heures
setInterval(() => {
    console.log('[Maintenance] Démarrage du nettoyage automatique...');
    
    try {
        const result = db.cleanup();
        
        console.log('[Maintenance] Nettoyage terminé:', {
            commands_deleted: result.commands_deleted,
            logs_deleted: result.logs_deleted
        });
        
        db.addLog({
            type: 'info',
            message: 'Nettoyage automatique effectué',
            data: result
        });
        
    } catch (error) {
        console.error('[Maintenance] Erreur lors du nettoyage:', error);
    }
}, 60 * 60 * 1000); // Toutes les heures

// Vérification des serveurs inactifs toutes les 5 minutes
setInterval(() => {
    const activeServers = db.getActiveServers();
    const allServers = Array.from(db.servers.values());
    
    console.log(`[Health] Serveurs actifs: ${activeServers.length}/${allServers.length}`);
    
    // Nettoyer les serveurs inactifs depuis plus de 30 minutes
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    
    for (const server of allServers) {
        if (server.last_heartbeat < thirtyMinutesAgo) {
            db.removeServer(server.job_id);
            
            db.addLog({
                type: 'warning',
                message: `Serveur inactif supprimé: ${server.server_name}`,
                data: {
                    job_id: server.job_id,
                    last_heartbeat: new Date(server.last_heartbeat).toISOString()
                }
            });
            
            console.log(`[Health] Serveur inactif supprimé: ${server.job_id}`);
        }
    }
}, 5 * 60 * 1000); // Toutes les 5 minutes

//==============================================
// DÉMARRAGE DU SERVEUR
//==============================================

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🚀 SERVEUR API ADONIS DÉMARRÉ');
    console.log('='.repeat(60));
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔑 API Key requise: ${config.REQUIRE_API_KEY ? 'Oui ✅' : 'Non ❌'}`);
    console.log(`🔒 JWT Secret configuré: ${config.JWT_SECRET ? 'Oui ✅' : 'Non ❌'}`);
    console.log(`⏱️  Intervalle de nettoyage: 1 heure`);
    console.log(`📦 Base de données: En mémoire (RAM)`);
    console.log('='.repeat(60));
    console.log('Endpoints disponibles:');
    console.log(`  • Accueil: http://localhost:${PORT}/`);
    console.log(`  • Health: http://localhost:${PORT}/health`);
    console.log(`  • Panel Web: http://localhost:${PORT}/panel`);
    console.log(`  • Stats: http://localhost:${PORT}/stats`);
    console.log('='.repeat(60));
    
    // Logger le démarrage
    db.addLog({
        type: 'server_started',
        message: 'Serveur API Adonis démarré avec succès',
        data: {
            port: PORT,
            environment: process.env.NODE_ENV || 'development',
            node_version: process.version
        }
    });
});

//==============================================
// GESTION DE L'ARRÊT PROPRE
//==============================================

const gracefulShutdown = (signal) => {
    console.log(`\n${signal} reçu. Arrêt gracieux en cours...`);
    
    // Logger l'arrêt
    db.addLog({
        type: 'server_stopped',
        message: `Serveur arrêté (${signal})`,
        data: {
            uptime: process.uptime(),
            stats: db.getGlobalStats()
        }
    });
    
    // Fermer le serveur
    server.close(() => {
        console.log('✅ Serveur HTTP fermé');
        console.log('👋 Au revoir!');
        process.exit(0);
    });
    
    // Force l'arrêt après 10 secondes
    setTimeout(() => {
        console.error('⚠️ Arrêt forcé après timeout');
        process.exit(1);
    }, 10000);
};

// Gérer les signaux d'arrêt
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Gérer les erreurs non capturées
process.on('uncaughtException', (error) => {
    console.error('❌ Erreur non capturée:', error);
    
    db.addLog({
        type: 'error',
        message: 'Erreur non capturée: ' + error.message,
        data: {
            stack: error.stack,
            name: error.name
        }
    });
    
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesse rejetée non gérée:', reason);
    
    db.addLog({
        type: 'error',
        message: 'Promesse rejetée non gérée',
        data: {
            reason: String(reason),
            promise: String(promise)
        }
    });
});

module.exports = app;
