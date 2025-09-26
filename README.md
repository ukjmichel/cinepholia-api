# 🌍 Environment Variables (`.env`)

Ce projet utilise un fichier `.env` à la racine pour gérer la configuration.  
**Vous devez créer ce fichier avant de lancer l'application.**

Toutes les valeurs sensibles (mots de passe, clés API, secrets JWT) y sont définies.  
Ce fichier est ignoré par Git (`.gitignore`) pour des raisons de sécurité.

---

## 🔧 Variables disponibles

### 🟩 Application

| Variable        | Description                                                 |
| --------------- | ----------------------------------------------------------- |
| `NODE_ENV`      | Mode de l’application (`development`, `test`, `production`) |
| `PORT`          | Port d'exécution de l'application Node.js                   |
| `HOST_APP_PORT` | Port mappé depuis l'hôte (utile avec Docker)                |
| `BASE_URL`      | URL publique de l’application                               |

---

### 🟢 Environnement de développement (`DEV_`)

> Chargé si `NODE_ENV=development`

#### MySQL

- `DEV_MYSQL_HOST`
- `DEV_MYSQL_PORT`
- `DEV_HOST_MYSQL_PORT`
- `DEV_MYSQL_DATABASE`
- `DEV_MYSQL_ROOT_PASSWORD`
- `DEV_MYSQL_USER`
- `DEV_MYSQL_PASSWORD`

#### MongoDB

- `DEV_MONGO_INITDB_DATABASE`
- `DEV_MONGO_PORT`
- `DEV_HOST_MONGO_PORT`
- `DEV_MONGO_INITDB_ROOT_USERNAME`
- `DEV_MONGO_INITDB_ROOT_PASSWORD`
- `DEV_MONGODB_URI`

#### Mongo Express

- `DEV_MONGO_EXPRESS_PORT`
- `DEV_HOST_MONGO_EXPRESS_PORT`

#### Email Resend

- `DEV_RESEND_API_KEY`
- `DEV_RESEND_FROM`
- `DEV_SEND_WELCOME_EMAIL`
- `DEV_EMAIL`

#### Authentification JWT

- `DEV_JWT_SECRET`
- `DEV_JWT_REFRESH_SECRET`
- `DEV_JWT_EXPIRES_IN`
- `DEV_JWT_REFRESH_EXPIRES_IN`

---

### 🧪 Environnement de test (`TEST_`)

> Chargé si `NODE_ENV=test`

Même structure que les variables `DEV_`, mais préfixées par `TEST_`.

---

### 🟦 Variables globales (production ou fallback)

Utilisées si aucune variable spécifique (`DEV_`, `TEST_`) n’est définie.

#### MySQL

- `MYSQL_HOST`
- `MYSQL_PORT`
- `HOST_MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_USER`
- `MYSQL_PASSWORD`

#### MongoDB

- `MONGO_INITDB_DATABASE`
- `MONGO_PORT`
- `HOST_MONGO_PORT`
- `MONGO_INITDB_ROOT_USERNAME`
- `MONGO_INITDB_ROOT_PASSWORD`
- `MONGODB_URI`

#### Mongo Express

- `MONGO_EXPRESS_PORT`
- `HOST_MONGO_EXPRESS_PORT`

#### Email Resend

- `RESEND_API_KEY`
- `RESEND_FROM`
- `SEND_WELCOME_EMAIL`

#### Authentification JWT

- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

---

### 📦 Multer (upload fichiers)

| Variable               | Description                                 |
| ---------------------- | ------------------------------------------- |
| `MULTER_STORAGE_TYPE`  | `local` ou `s3`                             |
| `MULTER_MAX_FILE_SIZE` | Taille max (en octets), ex. `2097152` = 2Mo |

---

## ✅ Exemple de fichier `.env`

```env
# ─── Application ───────────────────────────────────────────
NODE_ENV=development
PORT=3000
HOST_APP_PORT=3000
BASE_URL=http://localhost:3000

# ─── Dev MySQL ─────────────────────────────────────────────
DEV_MYSQL_HOST=mysql
DEV_MYSQL_PORT=3306
DEV_HOST_MYSQL_PORT=3312
DEV_MYSQL_DATABASE=cinepholia_db
DEV_MYSQL_ROOT_PASSWORD=dev_root
DEV_MYSQL_USER=dev_user
DEV_MYSQL_PASSWORD=dev_pass

# ─── Dev MongoDB ───────────────────────────────────────────
DEV_MONGO_INITDB_DATABASE=cinepholia_db
DEV_MONGO_PORT=27017
DEV_HOST_MONGO_PORT=27017
DEV_MONGO_INITDB_ROOT_USERNAME=dev_root
DEV_MONGO_INITDB_ROOT_PASSWORD=dev_pass
DEV_MONGODB_URI=mongodb://dev_root:dev_pass@mongodb:27017/cinepholia_db?authSource=admin

# ─── Dev Mongo Express ─────────────────────────────────────
DEV_MONGO_EXPRESS_PORT=8081
DEV_HOST_MONGO_EXPRESS_PORT=8081

# ─── Dev Email Resend ──────────────────────────────────────
DEV_RESEND_API_KEY=re_dev_key
DEV_RESEND_FROM=dev@cinepholia.com
DEV_SEND_WELCOME_EMAIL=true
DEV_EMAIL=admin@cinepholia.com

# ─── Dev JWT ───────────────────────────────────────────────
DEV_JWT_SECRET=supersecret
DEV_JWT_REFRESH_SECRET=supersecret_refresh
DEV_JWT_EXPIRES_IN=15m
DEV_JWT_REFRESH_EXPIRES_IN=7d

# ─── Multer ────────────────────────────────────────────────
MULTER_STORAGE_TYPE=local
MULTER_MAX_FILE_SIZE=2097152

# ─── Test Variables ────────────────────────────────────────
TEST_MYSQL_HOST=mysql
TEST_MYSQL_PORT=3306
TEST_MYSQL_DATABASE=cinepholia_test
TEST_MYSQL_USER=test_user
TEST_MYSQL_PASSWORD=test_pass
TEST_MONGODB_URI=mongodb://test:test@localhost:27017/cinepholia_test
TEST_RESEND_API_KEY=re_test_key
TEST_JWT_SECRET=test_jwt
TEST_JWT_REFRESH_SECRET=test_refresh
```
