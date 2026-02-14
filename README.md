# 🎮 Adonis API - Contrôle à distance

API REST pour contrôler Adonis (admin Roblox) depuis l'extérieur avec un panel web.

---

## 🚀 Déploiement sur Render

### 1. Push sur GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/adonis-api.git
git push -u origin main
```

### 2. Créer un Web Service sur Render

1. Allez sur [render.com](https://render.com)
2. Cliquez sur **"New +" → "Web Service"**
3. Connectez votre repo GitHub
4. Configuration :
   - **Name** : `adonis-api`
   - **Branch** : `main`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`

### 3. Variables d'environnement

Ajoutez ces variables dans Render :

| Key | Value | Description |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Environnement |
| `API_KEY` | `VOTRE_CLE_SECRETE` | ⚠️ Changez ceci ! |
| `JWT_SECRET` | `VOTRE_SECRET_JWT` | ⚠️ Changez ceci ! |
| `REQUIRE_API_KEY` | `true` | Active la sécurité |
| `ALLOWED_ORIGINS` | `*` | CORS |

---

## 📡 Endpoints disponibles

### Authentification
- `POST /auth/connect` - Connecter un serveur Roblox
- `GET /auth/servers` - Liste des serveurs

### Commandes
- `GET /adonis/commands` - Récupérer les commandes (Roblox)
- `POST /adonis/commands` - Créer une commande
- `POST /adonis/results` - Résultat d'exécution (Roblox)
- `POST /adonis/heartbeat` - Heartbeat (Roblox)

### Logs
- `POST /adonis/logs` - Envoyer un log (Roblox)
- `GET /adonis/logs` - Récupérer les logs

### Panel Web
- `GET /panel` - Interface de contrôle

### Stats
- `GET /stats` - Statistiques détaillées

---

## 🎮 Configuration Roblox

### Plugin Adonis

Créez `Server-APIBridge.lua` dans :
`ServerScriptService > Adonis > Config > Plugins`
```lua
local CONFIG = {
    API_URL = "https://votre-app.onrender.com",
    API_KEY = "VOTRE_CLE_API",
    CHECK_INTERVAL = 3,
    HEARTBEAT_INTERVAL = 30,
    ENABLED = true,
    DEBUG = true,
}
```

---

## 🌐 Utilisation du Panel Web

1. Allez sur : `https://votre-app.onrender.com/panel`
2. Entrez votre API Key
3. Contrôlez Adonis depuis votre navigateur !

### Commandes disponibles :
- Force Field, Kill, Kick, Ban
- Téléportation, Effets visuels
- Messages système, Annonces
- Shutdown serveur
- Et bien plus !

---

## 📝 Exemples d'utilisation

### Créer une commande via cURL
```bash
curl -X POST https://votre-app.onrender.com/adonis/commands \
  -H "X-API-Key: VOTRE_CLE" \
  -H "Content-Type: application/json" \
  -d '{
    "command": "ff",
    "target": "lucasssss_2",
    "priority": 5
  }'
```

### Créer une commande via JavaScript
```javascript
fetch('https://votre-app.onrender.com/adonis/commands', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'VOTRE_CLE'
    },
    body: JSON.stringify({
        command: 'sm',
        args: ['Bienvenue sur le serveur !']
    })
});
```

---

## 🔒 Sécurité

- ✅ Authentification par API Key
- ✅ JWT Tokens pour Roblox
- ✅ Rate limiting
- ✅ CORS configuré
- ✅ Headers de sécurité (Helmet)

---

## 📊 Statistiques

Le panel affiche en temps réel :
- Serveurs actifs
- Commandes exécutées
- Commandes en attente
- Logs du système

---

## 🐛 Dépannage

### Problème : "API Key invalide"
✅ Vérifiez que la clé dans Roblox = clé dans Render

### Problème : "Connexion échouée"
✅ Vérifiez que HttpService est activé dans Roblox

### Problème : API s'endort (plan Free)
✅ L'API gratuite s'endort après 15 min d'inactivité

---

## 📜 Licence

MIT License

---

## 👨‍💻 Auteur

Créé pour contrôler Adonis à distance
```

---

## ✅ RÉCAPITULATIF COMPLET

Vous avez maintenant **TOUS les fichiers** :

### Structure finale :
```
adonis-api/
├── .gitignore                  ✅
├── .env.example               ✅
├── package.json               ✅
├── README.md                  ✅
├── server.js                  ✅
├── config/
│   └── config.js             ✅
├── middleware/
│   └── auth.js               ✅
├── routes/
│   ├── auth.js               ✅
│   ├── commands.js           ✅
│   └── logs.js               ✅
├── utils/
│   └── database.js           ✅
└── public/
    ├── index.html            ✅
    ├── css/
    │   └── style.css         ✅
    └── js/
        └── app.js            ✅
