## Environment Variables (`.env`)

This project uses a `.env` file for configuration.  
**You must create a `.env` file at the root of your project before running the application.**  
All sensitive values (passwords, secrets, API keys) are managed here.

Below is an overview of all the sections and variables used:

---

### ─── Application ─────────────────────────────

- **NODE_ENV** — Set to `development`, `production`, or `test`
- **PORT** — Port for the Node.js application
- **HOST_APP_PORT** — Host port mapping for Docker/local environments

---

### ─── MySQL Database Configuration ────────────

- **MYSQL_HOST** — MySQL service hostname (`mysql` if using Docker)
- **MYSQL_PORT** — Internal MySQL port (default: 3306)
- **HOST_MYSQL_PORT** — Host port to map MySQL
- **MYSQL_DATABASE** — Database name
- **MYSQL_ROOT_PASSWORD** — MySQL root password
- **MYSQL_USER** — Application database user
- **MYSQL_PASSWORD** — Application database password

---

### ─── MongoDB Configuration ───────────────────

- **MONGO_INITDB_DATABASE** — Default MongoDB database
- **MONGO_PORT** — Internal MongoDB port (default: 27017)
- **HOST_MONGO_PORT** — Host port for MongoDB
- **MONGO_INITDB_ROOT_USERNAME** — MongoDB root username
- **MONGO_INITDB_ROOT_PASSWORD** — MongoDB root password
- **MONGODB_URI** — MongoDB connection string (edit as needed)

---

### ─── Mongo Express Configuration ─────────────

- **MONGO_EXPRESS_PORT** — Port for Mongo Express web UI
- **HOST_MONGO_EXPRESS_PORT** — Host port to access Mongo Express

---

### ─── Resend Email Configuration ──────────────

- **RESEND_API_KEY** — Resend service API key
- **RESEND_FROM** — Default sender email address
- **SEND_WELCOME_EMAIL** — Enable (`true`) or disable (`false`) welcome email sending

---

### ─── JWT Auth Configuration ──────────────────

- **JWT_SECRET** — Secret key for signing JWT tokens
- **JWT_REFRESH_SECRET** — Secret key for refresh tokens
- **JWT_EXPIRES_IN** — Access token lifetime (e.g., `15m`)
- **JWT_REFRESH_EXPIRES_IN** — Refresh token lifetime (e.g., `7d`)

---

### ─── Test Environment Variables ──────────────

All variables prefixed with `TEST_` are used for running tests (using separate databases and credentials):

- **TEST_MYSQL_HOST**
- **TEST_MYSQL_PORT**
- **TEST_HOST_MYSQL_PORT**
- **TEST_MYSQL_DATABASE**
- **TEST_MYSQL_ROOT_PASSWORD**
- **TEST_MYSQL_USER**
- **TEST_MYSQL_PASSWORD**
- **TEST_MONGO_INITDB_DATABASE**
- **TEST_MONGO_PORT**
- **TEST_HOST_MONGO_PORT**
- **TEST_MONGO_INITDB_ROOT_USERNAME**
- **TEST_MONGO_INITDB_ROOT_PASSWORD**
- **TEST_MONGODB_URI**
- **TEST_MONGO_EXPRESS_PORT**
- **TEST_RESEND_API_KEY**
- **TEST_RESEND_FROM**
- **TEST_SEND_WELCOME_EMAIL**
- **TEST_EMAIL**
- **TEST_JWT_SECRET**
- **TEST_JWT_REFRESH_SECRET**
- **TEST_JWT_EXPIRES_IN**
- **TEST_JWT_REFRESH_EXPIRES_IN**

---

> **Important:**  
> - **Never commit your actual `.env` file to version control!**  
> - For team sharing, use a `.env.example` file (without secrets) as a template.
> - Update this section and `.env.example` if you add/remove environment variables.

---

<details>
<summary>Example: `.env` file structure</summary>

```env
# ─── Application ────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
HOST_APP_PORT=3000

# ─── MySQL Database Configuration ───────────────────────────────────────
MYSQL_HOST=mysql
MYSQL_PORT=3306
HOST_MYSQL_PORT=3312
MYSQL_DATABASE=cinepholia_db
MYSQL_ROOT_PASSWORD=cinepholia_root_password
MYSQL_USER=cinepholia_admin
MYSQL_PASSWORD=cinepholia_password

# ─── MongoDB Configuration ──────────────────────────────────────────────
MONGO_INITDB_DATABASE=cinepholia_db
MONGO_PORT=27017
HOST_MONGO_PORT=27017
MONGO_INITDB_ROOT_USERNAME=cinepholia_root
MONGO_INITDB_ROOT_PASSWORD=cinepholia_root_password
MONGODB_URI=mongodb://cinepholia_root:cinepholia_root_password@mongodb:27017/cinepholia_db?authSource=admin


